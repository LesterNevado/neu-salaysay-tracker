
import { supabase } from "@/integrations/supabase/client";

/**
 * Permanently deletes files that have been soft-deleted over 30 days ago
 * This function should be run on a schedule (e.g., daily)
 */
export async function cleanupExpiredFiles() {
  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`Running cleanup of files deleted before ${thirtyDaysAgo.toISOString()}`);
    
    // Find files to delete
    const { data: filesToDelete, error: fetchError } = await supabase
      .from('salaysay_submissions')
      .select('id, file_path')
      .eq('is_deleted', true)
      .lt('deleted_at', thirtyDaysAgo.toISOString());
    
    if (fetchError) {
      console.error("Error fetching expired files:", fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!filesToDelete || filesToDelete.length === 0) {
      console.log("No expired files to delete");
      return { success: true, deleted: 0 };
    }
    
    console.log(`Found ${filesToDelete.length} expired files to delete`);
    
    // Delete files from storage bucket
    const filePaths = filesToDelete.map(file => file.file_path);
    const { error: storageError } = await supabase.storage
      .from('salaysay-uploads')
      .remove(filePaths);
      
    if (storageError) {
      console.error("Error deleting files from storage:", storageError);
      // Continue anyway to clean up database
    }
    
    // Delete records from database
    const fileIds = filesToDelete.map(file => file.id);
    const { error: dbError } = await supabase
      .from('salaysay_submissions')
      .delete()
      .in('id', fileIds);
      
    if (dbError) {
      console.error("Error deleting file records from database:", dbError);
      return { success: false, error: dbError.message };
    }
    
    console.log(`Successfully deleted ${filesToDelete.length} expired files`);
    return { success: true, deleted: filesToDelete.length };
  } catch (error) {
    console.error("Error in cleanup process:", error);
    return { success: false, error: String(error) };
  }
}
