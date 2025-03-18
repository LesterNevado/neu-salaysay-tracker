import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { FileIcon, Loader2, Trash2, Users, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusDropdown } from "./StatusDropdown";

interface SalaysayFile {
  id: string;
  created_at: string;
  file_path: string;
  violation_type: string;
  status: string;
  fileName: string;
  user_id: string;
  user_email?: string;
  profiles?: { email: string };
}

type SortField = 'fileName' | 'created_at' | 'violation_type' | 'status';
type SortDirection = 'asc' | 'desc';

interface FileExplorerProps {
  userId: string;
  refreshTrigger?: number;
  showAllUsers?: boolean;
}

export function FileExplorer({ 
  userId, 
  refreshTrigger = 0, 
  showAllUsers = false 
}: FileExplorerProps) {
  const [files, setFiles] = useState<SalaysayFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<SalaysayFile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const fileViewerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchFiles();
    }
  }, [userId, refreshTrigger, showAllUsers]);

  const checkFileExists = async (filePath: string): Promise<boolean> => {
    try {
      const { data } = await supabase.storage
        .from('salaysay-uploads')
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop()
        });
      
      return data !== null && data.length > 0;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  };

  const deleteOrphanedRecord = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('salaysay_submissions')
        .delete()
        .eq('id', fileId);
      
      if (error) {
        console.error('Error deleting orphaned record:', error);
      } else {
        console.log('Successfully deleted orphaned record:', fileId);
      }
    } catch (error) {
      console.error('Exception when deleting orphaned record:', error);
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('salaysay_submissions')
        .select(`
          *,
          profiles:user_id (
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (!showAllUsers) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const filesWithExistenceCheck = await Promise.all(
        data.map(async (file) => {
          const exists = await checkFileExists(file.file_path);
          if (!exists) {
            await deleteOrphanedRecord(file.id);
            return null;
          }
          return {
            ...file,
            fileName: file.file_path.split('/').pop() || file.file_path,
            user_email: file.profiles?.email
          };
        })
      );

      setFiles(filesWithExistenceCheck.filter((file): file is NonNullable<typeof file> => 
        file !== null
      ));
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        variant: "destructive",
        title: "Failed to load files",
        description: "There was an error loading your files. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = async (filePath: string, fileId: string) => {
    try {
      setViewingFile(fileId);
      setViewError(null);
      
      const { data, error } = await supabase.storage
        .from('salaysay-uploads')
        .createSignedUrl(filePath, 600);

      if (error) {
        throw error;
      }

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      setViewError("There was an error opening the file. Please try again.");
      toast({
        variant: "destructive",
        title: "Failed to view file",
        description: "There was an error opening the file. Please try again."
      });
    } finally {
      setViewingFile(null);
    }
  };

  const handleDeleteClick = (file: SalaysayFile) => {
    setDeletingFile(file);
    setDeleteDialogOpen(true);
  };

  const deleteFile = async () => {
    if (!deletingFile) return;
    
    try {
      setIsDeleting(true);
      
      const { error: storageError } = await supabase.storage
        .from('salaysay-uploads')
        .remove([deletingFile.file_path]);
      
      if (storageError) {
        throw storageError;
      }
      
      const { error: dbError } = await supabase
        .from('salaysay_submissions')
        .delete()
        .eq('id', deletingFile.id);
      
      if (dbError) {
        throw dbError;
      }
      
      setFiles(files.filter(f => f.id !== deletingFile.id));
      
      toast({
        title: "File deleted",
        description: "The file has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete file",
        description: "There was an error deleting the file. Please try again."
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingFile(null);
    }
  };

  const handleStatusChange = (fileId: string, newStatus: string) => {
    setFiles(files.map(file => 
      file.id === fileId ? {...file, status: newStatus} : file
    ));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const canEditStatus = (fileUserId: string) => {
    return showAllUsers || fileUserId === userId;
  };

  const canDeleteFile = (fileUserId: string) => {
    return fileUserId === userId;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedFiles = () => {
    const sortedFiles = [...files];
    
    return sortedFiles.sort((a, b) => {
      let compareA, compareB;
      
      switch (sortField) {
        case 'fileName':
          compareA = a.fileName.toLowerCase();
          compareB = b.fileName.toLowerCase();
          break;
        case 'created_at':
          compareA = new Date(a.created_at).getTime();
          compareB = new Date(b.created_at).getTime();
          break;
        case 'violation_type':
          compareA = a.violation_type.toLowerCase();
          compareB = b.violation_type.toLowerCase();
          break;
        case 'status':
          compareA = a.status.toLowerCase();
          compareB = b.status.toLowerCase();
          break;
        default:
          compareA = a.created_at;
          compareB = b.created_at;
      }
      
      if (sortDirection === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Loading files...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">No salaysay files {showAllUsers ? "" : "uploaded yet"}.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {viewError && (
        <Alert variant="destructive">
          <AlertTitle>Failed to view file</AlertTitle>
          <AlertDescription>{viewError}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left font-medium">
                  <button 
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('fileName')}
                  >
                    File Name
                    <SortIcon field="fileName" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  <button 
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('created_at')}
                  >
                    Date Uploaded
                    <SortIcon field="created_at" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  <button 
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('violation_type')}
                  >
                    Violation Type
                    <SortIcon field="violation_type" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  <button 
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </th>
                {showAllUsers && (
                  <th className="px-4 py-2 text-left font-medium">Uploaded By</th>
                )}
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getSortedFiles().map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button 
                      className="flex items-center text-left focus:outline-none group"
                      onClick={() => handleViewFile(file.file_path, file.id)}
                      disabled={viewingFile === file.id}
                    >
                      <FileIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                      <span className="font-medium text-blue-600 group-hover:text-blue-800 group-hover:underline truncate max-w-[250px]">
                        {viewingFile === file.id ? (
                          <span className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            Opening...
                          </span>
                        ) : (
                          file.fileName
                        )}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(file.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {file.violation_type}
                  </td>
                  <td className="px-4 py-3">
                    <StatusDropdown 
                      fileId={file.id}
                      currentStatus={file.status as "pending_review" | "approved" | "rejected"}
                      canEdit={canEditStatus(file.user_id)}
                      onStatusChange={(newStatus) => handleStatusChange(file.id, newStatus)}
                    />
                  </td>
                  {showAllUsers && (
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        {file.user_email || "Unknown user"}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {canDeleteFile(file.user_id) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(file)}
                              disabled={isDeleting && deletingFile?.id === file.id}
                            >
                              {isDeleting && deletingFile?.id === file.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete file</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file "{deletingFile?.fileName}" from the system.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteFile}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div ref={fileViewerRef} className="hidden"></div>
    </div>
  );
}
