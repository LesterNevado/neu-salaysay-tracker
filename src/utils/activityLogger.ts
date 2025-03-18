
import { supabase } from "@/integrations/supabase/client";
import { ActivityLog } from "@/types/activity.types";

type ActionType = 'upload' | 'status_change' | 'login' | 'comment';
type StatusType = 'pending_review' | 'approved' | 'rejected';

// Helper function to get current logs from localStorage
const getLogs = (): ActivityLog[] => {
  const storedLogs = localStorage.getItem('activity_logs');
  return storedLogs ? JSON.parse(storedLogs) : [];
};

// Helper function to save logs to localStorage
const saveLogs = (logs: ActivityLog[]) => {
  localStorage.setItem('activity_logs', JSON.stringify(logs));
};

export const logActivity = async (
  action: ActionType, 
  description: string, 
  fileId?: string, 
  newStatus?: StatusType
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Create a new log entry
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      user_id: session.user.id,
      action_type: action,
      description,
      related_file_id: fileId,
      new_status: newStatus,
    };

    // Get current logs and add the new one
    const currentLogs = getLogs();
    const updatedLogs = [newLog, ...currentLogs];
    
    // Save updated logs
    saveLogs(updatedLogs);
    
    // For debugging
    console.log("Activity logged:", newLog);
    
    // Note: We're not using Supabase for now since the table doesn't exist in the schema
    // When the table is added to Supabase, uncomment the code below
    /*
    await supabase
      .from('activity_logs')
      .insert({
        user_id: session.user.id,
        action_type: action,
        description,
        related_file_id: fileId,
        new_status: newStatus,
      });
    */
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
    // Get logs from localStorage
    let logs = getLogs();
    
    // Apply filters
    if (userFilter !== 'all') {
      logs = logs.filter(log => log.user_id === userFilter);
    }
    
    if (actionFilter !== 'all') {
      logs = logs.filter(log => log.action_type === actionFilter);
    }
    
    // Get total count before pagination
    const totalCount = logs.length;
    
    // Apply pagination
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedLogs = logs.slice(start, end);
    
    // Fetch user details for each log
    const logsWithUserDetails = await Promise.all(
      paginatedLogs.map(async (log) => {
        // Fetch user details
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', log.user_id)
          .single();
          
        // Fetch file details if needed
        let fileData = null;
        if (log.related_file_id) {
          const { data } = await supabase
            .from('salaysay_submissions')
            .select('*')
            .eq('id', log.related_file_id)
            .single();
          fileData = data;
        }
        
        return {
          ...log,
          user: userData ? {
            email: userData.email,
            full_name: userData.full_name,
            avatar_url: userData.avatar_url
          } : undefined,
          file: fileData ? {
            violation_type: fileData.violation_type,
            file_path: fileData.file_path
          } : undefined
        };
      })
    );
    
    return {
      logs: logsWithUserDetails,
      totalCount
    };
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return { logs: [], totalCount: 0 };
  }
};
