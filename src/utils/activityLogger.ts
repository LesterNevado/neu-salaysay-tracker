import { supabase } from "@/integrations/supabase/client";
import { ActivityLog } from "@/types/activity.types";

type ActionType = 'upload' | 'status_change' | 'login' | 'comment';
type StatusType = 'pending_review' | 'approved' | 'rejected';

export const logActivity = async (
  action: ActionType, 
  description: string, 
  fileId?: string, 
  newStatus?: StatusType
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("Cannot log activity: No active session");
      return false;
    }

    console.log(`Logging activity: ${action} - ${description}`);

    // Create a new log entry in Supabase
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: session.user.id,
        action_type: action,
        description,
        related_file_id: fileId || null,
        new_status: newStatus || null,
      });
      
    if (error) {
      console.error("Error logging activity to Supabase:", error);
      return false;
    } else {
      console.log("Activity logged successfully to Supabase", data);
      return true;
    }
  } catch (err) {
    console.error("Error logging activity:", err);
    return false;
  }
};

// Function to forcefully log login activity without requiring an active session
// This is specifically for login events where we need to log the activity after sign-in
export const logLoginActivity = async (userId: string, description: string) => {
  try {
    console.log(`Logging login activity for user ${userId}: ${description}`);
    
    // Create a new log entry in Supabase
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: 'login',
        description,
        related_file_id: null,
        new_status: null,
      });
      
    if (error) {
      console.error("Error logging login activity to Supabase:", error);
      return false;
    } else {
      console.log("Login activity logged successfully to Supabase", data);
      return true;
    }
  } catch (err) {
    console.error("Error logging login activity:", err);
    return false;
  }
};

// Function to get activity logs (with optional filters)
export const getActivityLogs = async (
  userFilter: string = 'all',
  actionFilter: string = 'all',
  page: number = 1,
  itemsPerPage: number = 10
) => {
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
    
    // Fetch profile information for these users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    // Create a map of user IDs to profile data for quick lookup
    const profileMap = {};
    if (profilesData) {
      profilesData.forEach(profile => {
        profileMap[profile.id] = {
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        };
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
      return {
        id: log.id,
        created_at: log.created_at,
        user_id: log.user_id,
        action_type: log.action_type as ActionType,
        description: log.description,
        related_file_id: log.related_file_id,
        new_status: log.new_status as StatusType | undefined,
        user: profileMap[log.user_id],
        file: log.related_file_id ? fileMap[log.related_file_id] : undefined
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
