
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash, FileIcon, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logActivity } from "@/utils/activity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SalaysayFile = {
  id: string;
  created_at: string;
  user_id: string;
  file_path: string;
  violation_type: string;
  file_name?: string; // Derived property
  file_size?: number;  // Optional since it might not be in the database
  profiles?: {
    full_name: string;
    avatar_url?: string;
    email?: string;
  }
};

export function FileExplorer({ 
  userId, 
  refreshTrigger, 
  showAllUsers,
  violationTypeFilters = []
}: { 
  userId: string;
  refreshTrigger: number;
  showAllUsers: boolean;
  violationTypeFilters?: string[];
}) {
  const [files, setFiles] = useState<SalaysayFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<SalaysayFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileToDelete, setFileToDelete] = useState<SalaysayFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  
  // Fetch files and apply filters when component loads or refreshTrigger changes
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('salaysay_submissions')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false });
        
        // If not showing all users, filter by the current user's ID
        if (!showAllUsers) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching files:", error);
          toast.error("Failed to load files. Please try again.");
        } else {
          // Process the data to add file_name from file_path
          const processedData = data?.map(item => ({
            ...item,
            file_name: item.file_path.split('/').pop() || item.file_path,
          })) || [];
          
          // Fetch user profiles for all uploaders
          const userIds = [...new Set(processedData.map(file => file.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .in('id', userIds);
            
          // Create a map of user IDs to profiles
          const profileMap: Record<string, any> = {};
          if (profiles) {
            profiles.forEach(profile => {
              profileMap[profile.id] = profile;
            });
          }
          
          setUserProfiles(profileMap);
          setFiles(processedData);
          
          // Apply initial filtering
          applyFilters(processedData, violationTypeFilters);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("An unexpected error occurred while loading files.");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [userId, refreshTrigger, showAllUsers]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters(files, violationTypeFilters);
  }, [violationTypeFilters, files]);

  const applyFilters = (files: SalaysayFile[], violationTypeFilters: string[]) => {
    if (!files.length) return;
    
    // If no filters are active, show all files
    if (!violationTypeFilters.length) {
      setFilteredFiles(files);
      return;
    }
    
    // Apply violation type filters
    const filtered = files.filter(file => 
      violationTypeFilters.includes(file.violation_type)
    );
    
    setFilteredFiles(filtered);
  };

  const handleDeleteClick = (file: SalaysayFile) => {
    setFileToDelete(file);
    setIsDeleteDialogOpen(true);
  };

  const handleViewFile = async (file: SalaysayFile) => {
    try {
      // Get file URL from storage
      const { data: urlData, error: urlError } = await supabase.storage
        .from('salaysay-uploads')
        .createSignedUrl(file.file_path, 60); // URL valid for 60 seconds
      
      if (urlError) {
        console.error("Error generating signed URL:", urlError);
        toast.error("Failed to generate file URL. Please try again.");
        return;
      }
      
      // Log the view activity with detailed file name
      await logActivity(
        'view',
        `Viewed salaysay for ${file.violation_type}`,
        file.id
      );
      
      // Open the file in a new tab
      window.open(urlData.signedUrl, '_blank');
    } catch (error) {
      console.error("Error viewing file:", error);
      toast.error("An error occurred while trying to view the file.");
    }
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      // Store filename before deleting for logging purposes
      const fileName = fileToDelete.file_name || fileToDelete.file_path.split('/').pop() || fileToDelete.file_path;
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('salaysay-uploads')
        .remove([fileToDelete.file_path]);
      
      if (storageError) {
        toast.error("Failed to delete file from storage.");
        console.error(storageError);
        return;
      }
      
      // Log the delete activity with detailed filename
      await logActivity(
        'delete',
        `Deleted salaysay for ${fileToDelete.violation_type}`,
        fileToDelete.id,
        null,
        fileName
      );
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('salaysay_submissions')
        .delete()
        .eq('id', fileToDelete.id);
      
      if (dbError) {
        toast.error("Failed to delete file record.");
        console.error(dbError);
        return;
      }
      
      // Update the file list
      setFiles(files.filter(file => file.id !== fileToDelete.id));
      setFilteredFiles(filteredFiles.filter(file => file.id !== fileToDelete.id));
      toast.success("File deleted successfully.");
    } catch (error) {
      console.error("Error during deletion:", error);
      toast.error("An error occurred during deletion.");
    } finally {
      setIsDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const getUploaderInitials = (file: SalaysayFile) => {
    const profile = userProfiles[file.user_id];
    if (!profile || !profile.full_name) return "U";
    
    return profile.full_name
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-8 text-center">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </td>
      </tr>
    );
  }

  if (files.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
          No salaysay files found. Click "Submit Salaysay" to upload a new file.
        </td>
      </tr>
    );
  }

  if (filteredFiles.length === 0 && violationTypeFilters.length > 0) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
          No files match your selected filters.
        </td>
      </tr>
    );
  }

  return (
    <>
      {filteredFiles.map((file) => {
        const uploader = userProfiles[file.user_id];
        
        return (
          <tr key={file.id} className="border-t border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4 text-red-500" />
                <span className="font-medium text-gray-700 truncate max-w-[200px]">
                  {file.file_name || file.file_path.split('/').pop() || file.file_path}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {format(new Date(file.created_at), "dd/MM/yyyy h:mm a")}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {file.violation_type || "Dress Code Violation"}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {uploader ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {uploader.avatar_url ? (
                      <AvatarImage 
                        src={uploader.avatar_url} 
                        alt={uploader.full_name || "User"} 
                      />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUploaderInitials(file)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>{uploader.full_name || uploader.email || "Unknown user"}</span>
                </div>
              ) : (
                <span>Unknown user</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm">
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleViewFile(file)}
                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteClick(file)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        )
      })}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {fileToDelete?.file_name || fileToDelete?.file_path.split('/').pop()}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
