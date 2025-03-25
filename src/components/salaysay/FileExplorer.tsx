
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { 
  FileIcon, 
  Loader2, 
  Trash2, 
  Users, 
  ArrowUp, 
  ArrowDown,
  Calendar,
  Filter,
  X
} from "lucide-react";
import { format, parseISO, isValid, startOfDay, endOfDay } from "date-fns";
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
import { logActivity } from "@/utils/activity";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { VIOLATION_TYPES } from "../upload/types";

interface SalaysayFile {
  id: string;
  created_at: string;
  file_path: string;
  violation_type: string;
  fileName: string;
  user_id: string;
  user_email?: string;
  profiles?: { email: string };
}

type SortField = 'fileName' | 'created_at' | 'violation_type';
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
  
  // Filters
  const [userFilter, setUserFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  
  const fileViewerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchUserProfiles();
      fetchFiles();
    }
  }, [userId, refreshTrigger, showAllUsers]);

  useEffect(() => {
    updateActiveFilters();
  }, [userFilter, typeFilter, startDateFilter, endDateFilter, searchQuery]);

  const updateActiveFilters = () => {
    const filters: string[] = [];
    
    if (userFilter !== "all") {
      const user = userProfiles.find(profile => profile.id === userFilter);
      filters.push(`User: ${user?.email || user?.full_name || userFilter}`);
    }
    
    if (typeFilter !== "all") {
      filters.push(`Type: ${typeFilter}`);
    }
    
    if (startDateFilter) {
      filters.push(`From: ${format(startDateFilter, 'dd/MM/yyyy')}`);
    }
    
    if (endDateFilter) {
      filters.push(`To: ${format(endDateFilter, 'dd/MM/yyyy')}`);
    }
    
    if (searchQuery) {
      filters.push(`Search: ${searchQuery}`);
    }
    
    setActiveFilters(filters);
  };

  const fetchUserProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name');
        
      if (error) {
        throw error;
      }
      
      setUserProfiles(data || []);
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  };

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
        `);
      
      // Apply database filters
      if (!showAllUsers) {
        query = query.eq('user_id', userId);
      } else if (userFilter !== "all") {
        query = query.eq('user_id', userFilter);
      }
      
      if (typeFilter !== "all") {
        query = query.eq('violation_type', typeFilter);
      }
      
      if (startDateFilter) {
        const startDate = startOfDay(startDateFilter).toISOString();
        query = query.gte('created_at', startDate);
      }
      
      if (endDateFilter) {
        const endDate = endOfDay(endDateFilter).toISOString();
        query = query.lte('created_at', endDate);
      }
      
      // Sort by creation date by default
      query = query.order('created_at', { ascending: false });
      
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

      let filteredFiles = filesWithExistenceCheck.filter((file): file is NonNullable<typeof file> => 
        file !== null
      );
      
      // Apply client-side search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredFiles = filteredFiles.filter(file => 
          file.fileName.toLowerCase().includes(query) || 
          file.violation_type.toLowerCase().includes(query)
        );
      }

      setFiles(filteredFiles);
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

      // Log the view activity
      await logActivity(
        'view',
        `Viewed salaysay file: ${filePath.split('/').pop() || filePath}`,
        fileId
      );

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
      
      await logActivity(
        'delete',
        `Deleted salaysay file: ${deletingFile.fileName || deletingFile.file_path}`,
        deletingFile.id
      );
      
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy h:mm a');
    } catch {
      return dateString;
    }
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

  const clearFilters = () => {
    setUserFilter("all");
    setTypeFilter("all");
    setStartDateFilter(undefined);
    setEndDateFilter(undefined);
    setSearchQuery("");
    fetchFiles();
  };

  const removeFilter = (index: number) => {
    const filterType = activeFilters[index].split(':')[0].trim();
    
    switch (filterType) {
      case 'User':
        setUserFilter('all');
        break;
      case 'Type':
        setTypeFilter('all');
        break;
      case 'From':
        setStartDateFilter(undefined);
        break;
      case 'To':
        setEndDateFilter(undefined);
        break;
      case 'Search':
        setSearchQuery('');
        break;
    }
    
    fetchFiles();
  };

  const applyFilters = () => {
    fetchFiles();
    setIsFiltersOpen(false);
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
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="px-3 py-1">
              {filter}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 hover:bg-transparent p-0"
                onClick={() => removeFilter(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
        
        <div className="flex space-x-2">
          {activeFilters.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="text-xs"
            >
              Clear All Filters
            </Button>
          )}
          
          <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Filter Files</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by filename or type"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {showAllUsers && (
                  <div className="space-y-2">
                    <Label htmlFor="user">User</Label>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger id="user">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {userProfiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || profile.email || 'Unknown user'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="type">Violation Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {VIOLATION_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {startDateFilter ? format(startDateFilter, 'PPP') : <span>From</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={startDateFilter}
                          onSelect={setStartDateFilter}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {endDateFilter ? format(endDateFilter, 'PPP') : <span>To</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={endDateFilter}
                          onSelect={setEndDateFilter}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsFiltersOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={applyFilters}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
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
