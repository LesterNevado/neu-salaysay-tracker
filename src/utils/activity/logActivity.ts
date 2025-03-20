
import { supabase } from "@/integrations/supabase/client";
import { ActionType, StatusType } from "./types";

/**
 * Logs user activity in the system
 */
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

/**
 * Forcefully logs login/logout activity without requiring an active session
 */
export const logLoginActivity = async (userId: string, description: string) => {
  try {
    // Determine if this is a login or logout event
    const isLogout = description.toLowerCase().includes('logged out') || 
                     description.toLowerCase().includes('log out') ||
                     description.toLowerCase().includes('signing out');
    
    console.log(`Logging auth activity for user ${userId}: ${description} (isLogout: ${isLogout})`);
    
    // Create a more distinctive description for login/logout events
    const timestamp = new Date().toLocaleString();
    const enhancedDescription = isLogout
      ? `User logged out at ${timestamp}`
      : `User logged in at ${timestamp}`;
    
    // Create a new log entry in Supabase with an explicit action type
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: isLogout ? 'logout' : 'login', // Using distinct action types
        description: enhancedDescription,
        related_file_id: null,
        new_status: null,
      });
      
    if (error) {
      console.error("Error logging auth activity to Supabase:", error);
      return false;
    } else {
      console.log("Auth activity logged successfully to Supabase", data);
      return true;
    }
  } catch (err) {
    console.error("Error logging auth activity:", err);
    return false;
  }
};

/**
 * Explicitly log a logout event
 */
export const logLogoutActivity = async (userId: string) => {
  console.log(`Explicitly logging logout for user ${userId}`);
  return logLoginActivity(userId, 'User logged out');
};
