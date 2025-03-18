
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
    if (!session) return;

    // Create a new log entry in Supabase
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: session.user.id,
        action_type: action,
        description,
        related_file_id: fileId,
        new_status: newStatus,
      });
      
    if (error) {
      console.error("Error logging activity to Supabase:", error);
    } else {
      console.log("Activity logged successfully to Supabase");
    }
  } catch (err) {
    console.error("Error logging activity:", err);
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
    // Start query builder
    let query = supabase
      .from('activity_logs')
      .select(`
        id,
        created_at,
        user_id,
        action_type,
        description,
        related_file_id,
        new_status,
        profiles(email, full_name, avatar_url),
        salaysay_submissions(id, violation_type, file_path)
      `)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (userFilter !== 'all') {
      query = query.eq('user_id', userFilter);
    }
    
    if (actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter);
    }
    
    // Get the total count for pagination
    const { count, error: countError } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error getting count:', countError);
      return { logs: [], totalCount: 0 };
    }
    
    // Apply pagination
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    // Execute query with pagination
    const { data, error } = await query
      .range(from, to);
    
    if (error) {
      console.error('Error fetching activity logs:', error);
      return { logs: [], totalCount: 0 };
    }
    
    // Format the data to match our ActivityLog type
    const logsWithDetails: ActivityLog[] = data.map(log => {
      // Extract profile data safely
      const profile = log.profiles ? {
        email: log.profiles.email || '',
        full_name: log.profiles.full_name || '',
        avatar_url: log.profiles.avatar_url || ''
      } : undefined;
      
      // Extract file data safely
      const file = log.salaysay_submissions ? {
        violation_type: log.salaysay_submissions.violation_type || '',
        file_path: log.salaysay_submissions.file_path || ''
      } : undefined;
      
      return {
        id: log.id,
        created_at: log.created_at,
        user_id: log.user_id,
        action_type: log.action_type as ActionType,
        description: log.description,
        related_file_id: log.related_file_id,
        new_status: log.new_status as StatusType | undefined,
        user: profile,
        file: file
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
