
import { supabase } from "@/integrations/supabase/client";
import { ActivityLog } from "@/types/activity.types";
import { ActivityLogFilters, ActivityLogResult, ActionType, StatusType } from "./types";

/**
 * Fetches activity logs with optional filtering and pagination
 */
export const getActivityLogs = async (
  userFilter: string = 'all',
  actionFilter: string = 'all',
  page: number = 1,
  itemsPerPage: number = 10
): Promise<ActivityLogResult> => {
  try {
    // Calculate pagination parameters
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    // First, get the total count for pagination
    let countQuery = supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true });
    
    // Apply filters to count query
    if (userFilter !== 'all') {
      countQuery = countQuery.eq('user_id', userFilter);
    }
    
    if (actionFilter !== 'all') {
      countQuery = countQuery.eq('action_type', actionFilter);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error getting count:', countError);
      return { logs: [], totalCount: 0 };
    }
    
    // Now build the main query for the data
    let query = supabase
      .from('activity_logs')
      .select(`
        id,
        created_at,
        user_id,
        action_type,
        description,
        related_file_id,
        new_status
      `)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (userFilter !== 'all') {
      query = query.eq('user_id', userFilter);
    }
    
    if (actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter);
    }
    
    // Apply pagination
    query = query.range(from, to);
    
    // Execute the query
    const { data: activityData, error } = await query;
    
    if (error) {
      console.error('Error fetching activity logs:', error);
      return { logs: [], totalCount: 0 };
    }
    
    // If no data returned, return empty array
    if (!activityData) {
      return { logs: [], totalCount: 0 };
    }
    
    // We need to get profile information separately
    // Get unique user IDs from the activity logs
    const userIds = [...new Set(activityData.map(log => log.user_id))];
    
    console.log("Fetching profiles for user IDs:", userIds);
    
    // Fetch profile information for these users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    console.log("Fetched user profiles for activity logs:", profilesData);
    
    // Get user metadata from auth.users for potential avatar URLs
    // Fix the typing issues with userData
    interface UserData {
      users: Array<{
        id: string;
        user_metadata?: {
          avatar_url?: string;
          picture?: string;
        };
      }>;
    }
    
    const { data, error: userError } = await supabase.auth.admin.listUsers();
    const userData = data as UserData | null;
    
    let userMetadataMap: Record<string, any> = {};
    
    if (userError) {
      console.error('Error fetching user metadata:', userError);
    } else if (userData && userData.users) {
      userData.users.forEach(user => {
        if (user.id && user.user_metadata) {
          userMetadataMap[user.id] = user.user_metadata;
        }
      });
      console.log("User metadata map:", userMetadataMap);
    }
    
    // Create a map of user IDs to profile data for quick lookup
    const profileMap: Record<string, any> = {};
    if (profilesData) {
      profilesData.forEach(profile => {
        // Check if we have Google avatar from user metadata
        const userMetadata = userMetadataMap[profile.id];
        const googleAvatarUrl = userMetadata?.avatar_url || userMetadata?.picture;
        
        profileMap[profile.id] = {
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: googleAvatarUrl || profile.avatar_url
        };
        
        // Log profile information for debugging
        console.log(`Profile for ${profile.id}:`, {
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profileMap[profile.id].avatar_url,
          original_avatar_url: profile.avatar_url,
          google_avatar: googleAvatarUrl
        });
      });
    }
    
    // If there are related file IDs, fetch file information
    const fileIds = activityData
      .map(log => log.related_file_id)
      .filter(id => id !== null);
    
    // Create a map for file data
    const fileMap = {};
    
    if (fileIds.length > 0) {
      const { data: filesData, error: filesError } = await supabase
        .from('salaysay_submissions')
        .select('id, violation_type, file_path')
        .in('id', fileIds);
        
      if (filesError) {
        console.error('Error fetching files:', filesError);
      } else if (filesData) {
        filesData.forEach(file => {
          fileMap[file.id] = {
            violation_type: file.violation_type,
            file_path: file.file_path
          };
        });
      }
    }
    
    // Format the data to match our ActivityLog type
    const logsWithDetails: ActivityLog[] = activityData.map(log => {
      // Make sure we have user profile data
      const userProfile = profileMap[log.user_id] || {
        email: null,
        full_name: null,
        avatar_url: null
      };

      // Attempt to get Google avatar URL from auth metadata if available
      const userMetadata = userMetadataMap[log.user_id];
      const googleAvatarUrl = userMetadata?.avatar_url || userMetadata?.picture;
      
      // Use Google avatar URL if available, otherwise fall back to profile avatar URL
      const avatarUrl = googleAvatarUrl || userProfile.avatar_url;
      
      return {
        id: log.id,
        created_at: log.created_at,
        user_id: log.user_id,
        action_type: log.action_type as ActionType,
        description: log.description,
        related_file_id: log.related_file_id,
        new_status: log.new_status as StatusType | undefined,
        user: {
          ...userProfile,
          avatar_url: avatarUrl
        },
        file: log.related_file_id ? fileMap[log.related_file_id] : undefined
      };
    });
    
    console.log('Formatted activity logs with user profiles:', logsWithDetails);
    
    return {
      logs: logsWithDetails,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return { logs: [], totalCount: 0 };
  }
};
