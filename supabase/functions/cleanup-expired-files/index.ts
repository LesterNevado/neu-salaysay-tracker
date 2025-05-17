
// supabase/functions/cleanup-expired-files/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the project URL and anon key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      return new Response(JSON.stringify({ success: false, error: fetchError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    
    if (!filesToDelete || filesToDelete.length === 0) {
      console.log("No expired files to delete");
      return new Response(JSON.stringify({ success: true, deleted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    console.log(`Found ${filesToDelete.length} expired files to delete`);
    
    // Delete files from storage bucket
    for (const file of filesToDelete) {
      const { error: storageError } = await supabase.storage
        .from('salaysay-uploads')
        .remove([file.file_path]);
        
      if (storageError) {
        console.error(`Error deleting file ${file.file_path} from storage:`, storageError);
      }
    }
    
    // Delete records from database
    const fileIds = filesToDelete.map(file => file.id);
    const { error: dbError } = await supabase
      .from('salaysay_submissions')
      .delete()
      .in('id', fileIds);
      
    if (dbError) {
      console.error("Error deleting file records from database:", dbError);
      return new Response(JSON.stringify({ success: false, error: dbError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    
    console.log(`Successfully deleted ${filesToDelete.length} expired files`);
    return new Response(JSON.stringify({ success: true, deleted: filesToDelete.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("Error in cleanup process:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
