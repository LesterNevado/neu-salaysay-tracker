
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash, FileIcon, Loader2 } from "lucide-react";
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

type SalaysayFile = {
  id: string;
  created_at: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  violation_type: string;
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
  const [loading, setLoading] = useState(true);
  const [fileToDelete, setFileToDelete] = useState<SalaysayFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('salaysay_files')
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
          setFiles(data || []);
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

  const handleDeleteClick = (file: SalaysayFile) => {
    setFileToDelete(file);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('salaysay')
        .remove([fileToDelete.file_path]);
      
      if (storageError) {
        toast.error("Failed to delete file from storage.");
        console.error(storageError);
        return;
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('salaysay_files')
        .delete()
        .eq('id', fileToDelete.id);
      
      if (dbError) {
        toast.error("Failed to delete file record.");
        console.error(dbError);
        return;
      }
      
      // Update the file list
      setFiles(files.filter(file => file.id !== fileToDelete.id));
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
      {files.map((file) => (
        <tr key={file.id} className="border-t border-gray-100 hover:bg-gray-50">
          <td className="px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <FileIcon className="h-4 w-4 text-red-500" />
              <span className="font-medium text-gray-700 truncate max-w-[300px]">
                {file.file_name}
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
            <div className="flex justify-end">
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
              This will permanently delete {fileToDelete?.file_name}.
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
