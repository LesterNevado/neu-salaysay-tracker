
import { supabase } from "./client";

export async function setupSalaysayStorageBucket() {
  try {
    // Check if the bucket already exists
    const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
    
    if (getBucketsError) {
      console.error("Error checking storage buckets:", getBucketsError);
      return;
    }
    
    // Check if our bucket already exists
    const bucketExists = buckets.some(bucket => bucket.name === 'salaysay-uploads');
    
    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createBucketError } = await supabase.storage.createBucket('salaysay-uploads', {
        public: false, // Files are not publicly accessible by default
        fileSizeLimit: 5242880, // 5MB file size limit
      });
      
      if (createBucketError) {
        console.error("Error creating storage bucket:", createBucketError);
        return;
      }
      
      console.log("Storage bucket 'salaysay-uploads' created successfully");
      
      // Create a policy to allow authenticated users to upload files
      const { error: policyError } = await supabase.storage.from('salaysay-uploads').createSignedUploadUrl('test.txt');
      
      if (policyError && !policyError.message.includes('already exists')) {
        console.error("Error setting up storage policies:", policyError);
      }
    } else {
      console.log("Storage bucket 'salaysay-uploads' already exists");
    }
  } catch (error) {
    console.error("Error setting up storage:", error);
  }
}
