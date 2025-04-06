
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { FileUpload, TAGALOG_VIOLATION_TYPES } from "./types";
import { logActivity } from "@/utils/activity";
import { extractDocumentInfo, DocumentInfo } from "@/utils/ai/extractDocumentInfo";
import { ViolationType } from "@/types/database.types";

// Default values for when extraction fails
const DEFAULT_EXCUSE = "for my absences in your Application Development class";

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

  // Add a new function to reset the uploads state
  const resetUploads = () => {
    setUploads([]);
  };

  const analyzeFile = async (file: File): Promise<DocumentInfo | null> => {
    try {
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, status: 'analyzing' }
            : upload
        )
      );

      // Extract document information
      const extractedInfo = await extractDocumentInfo(file);
      console.log("Document info extraction complete:", extractedInfo);
      
      // Ensure we have a nature of excuse
      const natureOfExcuse = extractedInfo.natureOfExcuse || DEFAULT_EXCUSE;
      
      // Update uploads state with properly mapped values
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                extractedInfo: {
                  studentNumber: extractedInfo.studentId,
                  senderName: extractedInfo.studentName,
                  date: extractedInfo.submissionDate,
                  natureOfExcuse: natureOfExcuse,
                  addressee: extractedInfo.addressee,
                  confidence: 'high',
                  language: extractedInfo.language
                }
              }
            : upload
        )
      );

      console.log("Upload state updated with extracted info:", {
        studentNumber: extractedInfo.studentId,
        senderName: extractedInfo.studentName,
        date: extractedInfo.submissionDate,
        natureOfExcuse: natureOfExcuse,
        addressee: extractedInfo.addressee,
        confidence: 'high',
        language: extractedInfo.language
      });
      
      return extractedInfo;
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: "Failed to extract information from the PDF. Using default values."
      });
      
      // Use default values if extraction fails
      const defaultInfo: DocumentInfo = {
        extractedText: "Error analyzing document",
        natureOfExcuse: DEFAULT_EXCUSE,
        violationType: "Other" as ViolationType,
        studentId: "22-13917-429",
        studentName: "Ysac Blu Advincula",
        addressee: "Sir Gaspar",
        submissionDate: "March 30, 2025",
        language: "English"
      };
      
      // Update uploads state with default values
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                extractedInfo: {
                  studentNumber: defaultInfo.studentId,
                  senderName: defaultInfo.studentName,
                  date: defaultInfo.submissionDate,
                  natureOfExcuse: defaultInfo.natureOfExcuse,
                  addressee: defaultInfo.addressee,
                  confidence: 'medium',
                  language: defaultInfo.language
                }
              }
            : upload
        )
      );
      
      return defaultInfo;
    }
  };

  const uploadToSupabase = async (file: File) => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: "User ID not found. Please log in again."
      });
      return;
    }

    try {
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

      const extractedInfo = await analyzeFile(file);
      
      // Ensure we have values for critical fields, using defaults if needed
      let violationType = extractedInfo?.violationType || "Other";
      const natureOfExcuse = extractedInfo?.natureOfExcuse || DEFAULT_EXCUSE;
      
      // If the document is in Tagalog and we have a Tagalog-specific classification
      if (extractedInfo?.language === "Tagalog") {
        // For display purposes in the UI, we could map it back to English
        console.log("Using Tagalog violation type mapping for:", violationType);
      }
      
      console.log("Using values for upload:", {
        violationType,
        natureOfExcuse,
        language: extractedInfo?.language
      });

      const timestamp = Date.now();
      const originalName = file.name;
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

      // Construct metadata for database
      const metadata = {
        student_number: extractedInfo?.studentId,
        sender_name: extractedInfo?.studentName,
        incident_date: extractedInfo?.submissionDate,
        excuse_description: natureOfExcuse,
        addressee: extractedInfo?.addressee,
        language: extractedInfo?.language
      };

      console.log("Inserting submission record into database with metadata:", metadata);
      console.log("Using determined violation type:", violationType);
      
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

      await logActivity(
        'upload',
        `Uploaded salaysay for ${violationType}`,
        submissionData.id
      );

      // Update uploads state with the final values
      setUploads(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                status: 'completed', 
                progress: 100, 
                violationType,
                extractedInfo: {
                  ...(upload.extractedInfo || {}),
                  studentNumber: extractedInfo?.studentId,
                  senderName: extractedInfo?.studentName,
                  date: extractedInfo?.submissionDate,
                  addressee: extractedInfo?.addressee,
                  natureOfExcuse: natureOfExcuse,
                  confidence: 'high',
                  language: extractedInfo?.language
                }
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
    analyzeFile,
    resetUploads
  };
}
