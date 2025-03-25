
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
    
    // Create a map of user IDs to profile data for quick lookup
    const profileMap: Record<string, any> = {};
    
    // First, populate the map with profiles data
    if (profilesData) {
      profilesData.forEach(profile => {
        profileMap[profile.id] = {
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        };
      });
    }
    
    // Fetch all authenticated users (without admin privileges)
    // We'll try to get avatar URLs from auth metadata for all users
    const authUsersPromises = userIds.map(async (userId) => {
      try {
        // For the current user, we can get their metadata directly
        if (userId === (await supabase.auth.getUser()).data.user?.id) {
          return await supabase.auth.getUser();
        }
        return null;
      } catch (error) {
        console.error(`Error fetching auth user ${userId}:`, error);
        return null;
      }
    });
    
    // Resolve all promises
    const authUsersResults = await Promise.all(authUsersPromises);
    
    // Process auth metadata for avatar URLs
    authUsersResults.forEach(result => {
      if (result && result.data && result.data.user) {
        const user = result.data.user;
        const userId = user.id;
        
        // Only update if we already have a profile for this user
        if (profileMap[userId]) {
          const avatarFromMetadata = 
            user.user_metadata?.avatar_url || 
            user.user_metadata?.picture;
          
          if (avatarFromMetadata) {
            profileMap[userId] = {
              ...profileMap[userId],
              avatar_url: avatarFromMetadata
            };
          }
        }
      }
    });
    
    // If there are related file IDs, fetch file information
    const fileIds = activityData
      .map(log => log.related_file_id)
      .filter(id => id !== null && id !== undefined);
    
    // Create a map for file data
    const fileMap: Record<string, any> = {};
    
    if (fileIds.length > 0) {
      const { data: filesData, error: filesError } = await supabase
        .from('salaysay_submissions')
        .select('id, violation_type, file_path, user_id')
        .in('id', fileIds);
        
      if (filesError) {
        console.error('Error fetching files:', filesError);
      } else if (filesData) {
        // For each file, we also want to get the uploader's information
        for (const file of filesData) {
          // Extract filename from the file_path
          const fileName = file.file_path.split('/').pop() || file.file_path;
          
          fileMap[file.id] = {
            violation_type: file.violation_type,
            file_path: file.file_path,
            file_name: fileName,
            user_id: file.user_id
          };
        }
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
      
      const fileInfo = log.related_file_id ? fileMap[log.related_file_id] : undefined;
      
      return {
        id: log.id,
        created_at: log.created_at,
        user_id: log.user_id,
        action_type: log.action_type as ActionType,
        description: log.description,
        related_file_id: log.related_file_id,
        new_status: log.new_status as StatusType | undefined,
        user: {
          ...userProfile
        },
        file: fileInfo
      };
    });
    
    return {
      logs: logsWithDetails,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return { logs: [], totalCount: 0 };
  }
};
