
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Trash2, 
  FileIcon, 
  Loader2, 
  Eye, 
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { FileExplorer } from "./FileExplorer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TrashFile = {
  id: string;
  created_at: string;
  deleted_at: string;
  user_id: string;
  file_path: string;
  violation_type: string;
  file_name?: string;
  deletion_reason?: string | null;
  profiles?: {
    full_name: string;
    avatar_url?: string;
    email?: string;
  }
};

interface TrashViewProps {
  userId: string;
  isAdmin?: boolean;
}

export function TrashView({ userId, isAdmin = false }: TrashViewProps) {
  const [files, setFiles] = useState<TrashFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileToAction, setFileToAction] = useState<TrashFile | null>(null);
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  
  useEffect(() => {
    const fetchDeletedFiles = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('salaysay_submissions')
          .select('*, profiles(*)')
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false });
        
        if (!isAdmin) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching deleted files:", error);
          toast.error("Failed to load files from trash. Please try again.");
          return;
        }
        
        const processedData: TrashFile[] = data?.map(item => ({
          ...item,
          file_name: item.file_path.split('/').pop() || item.file_path,
        })) || [];
        
        const userIds = [...new Set(processedData.map(file => file.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', userIds);
          
        const profileMap: Record<string, any> = {};
        if (profiles) {
          profiles.forEach(profile => {
            profileMap[profile.id] = profile;
          });
        }
        
        setUserProfiles(profileMap);
        setFiles(processedData);
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("An unexpected error occurred while loading trash.");
      } finally {
        setLoading(false);
      }
    };

    fetchDeletedFiles();
  }, [userId, isAdmin, refreshTrigger]);
  
  const calculateDaysRemaining = (deletedAt: string) => {
    if (!deletedAt) return 0;
    
    const deletionDate = new Date(deletedAt);
    const expiryDate = addDays(deletionDate, 30);
    const today = new Date();
    
    const daysLeft = differenceInDays(expiryDate, today);
    return Math.max(0, daysLeft);
  };
  
  const handleViewFile = async (file: TrashFile) => {
    try {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('salaysay-uploads')
        .createSignedUrl(file.file_path, 60);
      
      if (urlError) {
        console.error("Error generating signed URL:", urlError);
        toast.error("Failed to generate file URL. Please try again.");
        return;
      }
      
      await logActivity(
        'view',
        `Viewed deleted salaysay from trash`,
        file.id
      );
      
      window.open(urlData.signedUrl, '_blank');
    } catch (error) {
      console.error("Error viewing file:", error);
      toast.error("An error occurred while trying to view the file.");
    }
  };
  
  const handlePermanentDeleteClick = (file: TrashFile) => {
    if (!isAdmin && file.user_id !== userId) {
      toast.error("You can only permanently delete your own files");
      return;
    }
    setFileToAction(file);
    setIsPermanentDeleteDialogOpen(true);
  };
  
  const handleRestoreClick = (file: TrashFile) => {
    if (!isAdmin && file.user_id !== userId) {
      toast.error("You can only restore your own files");
      return;
    }
    setFileToAction(file);
    setIsRestoreDialogOpen(true);
  };
  
  const confirmPermanentDelete = async () => {
    if (!fileToAction) return;
    
    try {
      const fileName = fileToAction.file_name || fileToAction.file_path.split('/').pop() || fileToAction.file_path;
      
      // First delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('salaysay-uploads')
        .remove([fileToAction.file_path]);
      
      if (storageError) {
        toast.error("Failed to delete file from storage.");
        console.error(storageError);
        return;
      }
      
      // Then delete the record from the database
      const { error: dbError } = await supabase
        .from('salaysay_submissions')
        .delete()
        .eq('id', fileToAction.id);
      
      if (dbError) {
        toast.error("Failed to delete file record.");
        console.error(dbError);
        return;
      }
      
      await logActivity(
        'delete',
        `Permanently deleted salaysay for ${fileToAction.violation_type}`,
        fileToAction.id,
        null,
        fileName
      );
      
      setFiles(files.filter(file => file.id !== fileToAction.id));
      toast.success("File permanently deleted.");
      
    } catch (error) {
      console.error("Error during permanent deletion:", error);
      toast.error("An error occurred during permanent deletion.");
    } finally {
      setIsPermanentDeleteDialogOpen(false);
      setFileToAction(null);
    }
  };
  
  const confirmRestore = async () => {
    if (!fileToAction) return;
    
    try {
      const fileName = fileToAction.file_name || fileToAction.file_path.split('/').pop() || fileToAction.file_path;
      
      // Update the record to mark it as not deleted
      const { error: dbError } = await supabase
        .from('salaysay_submissions')
        .update({
          is_deleted: false,
          deleted_at: null,
          deletion_reason: null
        })
        .eq('id', fileToAction.id);
      
      if (dbError) {
        toast.error("Failed to restore file.");
        console.error(dbError);
        return;
      }
      
      await logActivity(
        'restore',
        `Restored salaysay for ${fileToAction.violation_type} from trash`,
        fileToAction.id,
        null,
        fileName
      );
      
      setFiles(files.filter(file => file.id !== fileToAction.id));
      toast.success("File restored successfully.");
      
    } catch (error) {
      console.error("Error during file restoration:", error);
      toast.error("An error occurred during file restoration.");
    } finally {
      setIsRestoreDialogOpen(false);
      setFileToAction(null);
    }
  };
  
  const refreshTrash = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  const getUploaderInitials = (file: TrashFile) => {
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
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (files.length === 0) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Trash is empty</h3>
        <p className="text-gray-500 mt-2">No deleted files found.</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Trash</h2>
        <Button variant="outline" onClick={refreshTrash} className="flex items-center gap-1">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-600 uppercase bg-gray-100">
            <tr>
              <th className="px-4 py-3">File Name</th>
              <th className="px-4 py-3">Deleted Date</th>
              <th className="px-4 py-3">Expires In</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Uploader</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const daysRemaining = calculateDaysRemaining(file.deleted_at);
              const uploader = userProfiles[file.user_id];
              return (
                <tr key={file.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-gray-700 truncate max-w-[200px]">
                        {file.file_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {file.deleted_at && format(new Date(file.deleted_at), "dd/MM/yyyy h:mm a")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={daysRemaining < 5 ? "destructive" : "outline"}>
                      {daysRemaining} days
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {file.violation_type}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewFile(file)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>View File</span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreClick(file)}
                              className="text-green-500 hover:text-green-700 hover:bg-green-50"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>Restore File</span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePermanentDeleteClick(file)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>Delete Permanently</span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <AlertDialog 
        open={isPermanentDeleteDialogOpen} 
        onOpenChange={setIsPermanentDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {fileToAction?.file_name} from the system.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPermanentDelete} 
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog 
        open={isRestoreDialogOpen} 
        onOpenChange={setIsRestoreDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore {fileToAction?.file_name} to your active files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRestore}
              className="bg-green-500 hover:bg-green-600"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
