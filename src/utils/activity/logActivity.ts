
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
    const isLogout = description.toLowerCase().includes('logged out');
    
    console.log(`Logging auth activity for user ${userId}: ${description} (isLogout: ${isLogout})`);
    
    // Add more detailed information to the description
    const enhancedDescription = isLogout
      ? `User logged out at ${new Date().toLocaleString()}`
      : description;
    
    // Create a new log entry in Supabase
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: 'login', // Keep 'login' for both login and logout to maintain consistency
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
