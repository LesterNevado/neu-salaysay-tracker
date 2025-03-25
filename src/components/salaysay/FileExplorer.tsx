
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { logActivity } from "@/utils/activity";

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
  }
};

export function FileExplorer({ userId, refreshTrigger, showAllUsers }: { 
  userId: string;
  refreshTrigger: number;
  showAllUsers: boolean;
}) {
  const [files, setFiles] = useState<SalaysayFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<SalaysayFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileToDelete, setFileToDelete] = useState<SalaysayFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filters, setFilters] = useState<{
    violationTypes: Record<string, boolean>;
  }>({
    violationTypes: {},
  });
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('salaysay_submissions')
          .select('*, profiles(full_name)')
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
          
          setFiles(processedData);
          setFilteredFiles(processedData);
          
          // Extract unique violation types for filters
          const uniqueViolationTypes: Record<string, boolean> = {};
          processedData.forEach(file => {
            if (file.violation_type) {
              uniqueViolationTypes[file.violation_type] = true;
            }
          });
          setFilters(prev => ({
            ...prev,
            violationTypes: uniqueViolationTypes,
          }));
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
    applyFilters();
  }, [filters, files]);

  const applyFilters = () => {
    // Check if any violation type filters are active
    const hasActiveViolationFilters = Object.values(filters.violationTypes).some(value => value);
    
    // If no filters are active, show all files
    if (!hasActiveViolationFilters) {
      setFilteredFiles(files);
      return;
    }
    
    // Apply filters
    const result = files.filter(file => {
      // Check violation type
      const passesViolationType = filters.violationTypes[file.violation_type];
      return passesViolationType;
    });
    
    setFilteredFiles(result);
  };

  const handleFilterChange = (violationType: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      violationTypes: {
        ...prev.violationTypes,
        [violationType]: checked,
      },
    }));
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
      
      // Log the view activity
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('salaysay-uploads')
        .remove([fileToDelete.file_path]);
      
      if (storageError) {
        toast.error("Failed to delete file from storage.");
        console.error(storageError);
        return;
      }
      
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
      
      // Log the delete activity
      await logActivity(
        'delete',
        `Deleted salaysay for ${fileToDelete.violation_type}`,
        fileToDelete.id
      );
      
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

  if (loading) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-8 text-center">
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
        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
          No salaysay files found. Click "Submit Salaysay" to upload a new file.
        </td>
      </tr>
    );
  }

  return (
    <>
      {filteredFiles.map((file) => (
        <tr key={file.id} className="border-t border-gray-100 hover:bg-gray-50">
          <td className="px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <FileIcon className="h-4 w-4 text-red-500" />
              <span className="font-medium text-gray-700 truncate max-w-[300px]">
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
      ))}

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
