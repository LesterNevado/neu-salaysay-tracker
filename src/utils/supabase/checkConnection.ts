
import { supabase } from "@/integrations/supabase/client";

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Simple query to check if connection works
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error("Supabase connection error:", error);
      return false;
    }
    
    console.log("Supabase connection successful", data);
    return true;
  } catch (error) {
    console.error("Unexpected error when checking Supabase connection:", error);
    return false;
  }
}
