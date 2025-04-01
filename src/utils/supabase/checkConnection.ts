
import { supabase } from "@/integrations/supabase/client";

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // First ping - check if the service is responding at all
    const initialPing = await fetch(`${supabase.supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': supabase.supabaseKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (!initialPing.ok) {
      console.error("Initial Supabase API ping failed with status:", initialPing.status);
      return false;
    }
    
    // Simple query to check if database connection works
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error("Supabase database connection error:", error);
      return false;
    }
    
    console.log("Supabase connection successful", data);
    return true;
  } catch (error) {
    console.error("Unexpected error when checking Supabase connection:", error);
    return false;
  }
}
