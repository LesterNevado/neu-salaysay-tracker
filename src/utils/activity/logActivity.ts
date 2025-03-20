
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
    
    // Create a more distinctive description for login/logout events
    const enhancedDescription = isLogout
      ? `User logged out at ${new Date().toLocaleString()}`
      : `User logged in at ${new Date().toLocaleString()}`;
    
    // Create a new log entry in Supabase with an explicit action type
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: isLogout ? 'logout' : 'login', // Using distinct action types for login and logout
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
 * Specifically logs logout activity, should be called when user signs out
 */
export const logLogoutActivity = async (userId: string) => {
  if (!userId) {
    console.error("Cannot log logout: No user ID provided");
    return false;
  }
  
  console.log(`Explicitly logging logout for user ${userId}`);
  
  try {
    const timestamp = new Date().toLocaleString();
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action_type: 'logout', // Using 'logout' instead of 'login'
        description: `User logged out at ${timestamp}`,
        related_file_id: null,
        new_status: null,
      });
      
    if (error) {
      console.error("Error logging logout to Supabase:", error);
      return false;
    } else {
      console.log("Logout logged successfully to Supabase", data);
      return true;
    }
  } catch (err) {
    console.error("Error logging logout:", err);
    return false;
  }
};
