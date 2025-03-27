import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { FileUpload } from "./types";
import { logActivity } from "@/utils/activity";
import { extractPdfText } from "@/utils/pdf/extractPdfText";
import { extractDocumentInfo, ExtractedDocumentInfo } from "@/utils/ai/extractDocumentInfo";

export function useFileUpload(userId: string) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const { toast } = useToast();

  const addFiles = (files: File[]) => {
    const newUploads = files.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
      extractedInfo: null
    }));
    setUploads(prev => [...prev, ...newUploads]);
  };

  const removeFile = (fileToRemove: File) => {
    setUploads(prev => prev.filter(upload => upload.file !== fileToRemove));
  };

  const analyzeFile = async (file: File): Promise<ExtractedDocumentInfo | null> => {
    try {
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'analyzing' }
            : upload
        )
      );

      // Extract text from PDF
      const text = await extractPdfText(file);
      
      // Extract information using AI
      const extractedInfo = await extractDocumentInfo(text);
      
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, extractedInfo }
            : upload
        )
      );
      
      return extractedInfo;
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: "Failed to extract information from the PDF. Continuing with upload."
      });
      return null;
    }
  };

  const uploadToSupabase = async (file: File, violationType: string) => {
    if (!violationType) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select a violation type."
      });
      return;
    }

    if (!userId) {
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: "User ID not found. Please log in again."
      });
      return;
    }

    try {
      // First, check if we're authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: "You are not logged in. Please log in and try again."
        });
        return;
      }

      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'uploading', progress: 0 }
            : upload
        )
      );

      // Analyze the file first to extract information
      const extractedInfo = await analyzeFile(file);

      const timestamp = Date.now();
      const originalName = file.name;
      // Create a path with user's ID as the folder name
      const filePath = `${userId}/${timestamp}_${originalName}`;
      
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, progress: 33 }
            : upload
        )
      );

      console.log("Attempting to upload file to storage bucket:", filePath);
      
      const { error: uploadError, data } = await supabase.storage
        .from('salaysay-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("File uploaded successfully to storage:", data);
      
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, progress: 66 }
            : upload
        )
      );

      // Prepare the metadata to save
      const metadata = {
        student_number: extractedInfo?.studentNumber,
        sender_name: extractedInfo?.senderName,
        incident_date: extractedInfo?.date,
        excuse_description: extractedInfo?.natureOfExcuse,
        addressee: extractedInfo?.addressee,
        ai_confidence: extractedInfo?.confidence
      };

      console.log("Inserting submission record into database with metadata:", metadata);
      
      const { error: insertError, data: submissionData } = await supabase
        .from('salaysay_submissions')
        .insert({
          user_id: userId,
          file_path: data.path,
          violation_type: violationType,
          metadata: metadata
        })
        .select()
        .single();

      if (insertError) {
        console.error("Database insert error:", insertError);
        throw insertError;
      }

      console.log("Database record created successfully:", submissionData);

      // Log activity
      await logActivity(
        'upload',
        `Uploaded salaysay for ${violationType}`,
        submissionData.id
      );

      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                status: 'completed', 
                progress: 100, 
                violationType,
                extractedInfo: extractedInfo
              }
            : upload
        )
      );

      toast({
        title: "Upload successful",
        description: "Your file has been uploaded and analyzed."
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'error' }
            : upload
        )
      );

      let errorMessage = "There was an error uploading your file. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("bucket")) {
          errorMessage = "Storage bucket not found. Please check if 'salaysay-uploads' bucket exists in Supabase.";
        } else if (error.message.includes("permission")) {
          errorMessage = "Permission denied. Please check Supabase storage policies.";
        } else if (error.message.includes("foreign key")) {
          errorMessage = "Database relation error. User profile may not exist.";
        } else if (error.message.includes("apikey")) {
          errorMessage = "Authentication error. No API key found in request.";
        }
      }

      toast({
        variant: "destructive",
        title: "Upload failed",
        description: errorMessage
      });
    }
  };

  return {
    uploads,
    addFiles,
    removeFile,
    uploadToSupabase,
    analyzeFile
  };
}
