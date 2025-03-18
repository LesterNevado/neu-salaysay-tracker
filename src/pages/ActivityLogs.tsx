
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Upload, 
  ShieldCheck, 
  ShieldX, 
  Clock, 
  User, 
  FileText,
  Filter as FilterIcon
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Profile } from "@/types/database.types";
import { ActivityLog } from "@/types/activity.types";
import { toast } from 'sonner';
import { getActivityLogs } from "@/utils/activityLogger";
import { AuthContext } from "@/App";

export default function ActivityLogs() {
  const navigate = useNavigate();
  const { session, isLoading: authLoading } = useContext(AuthContext);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !session) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      // Fetch user profiles for the dropdown
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        toast.error("Failed to load user profiles");
      } else {
        setUserProfiles(profiles || []);
      }

      await fetchActivityLogs();
    };

    if (session) {
      fetchData();
    }
  }, [navigate, userFilter, actionFilter, currentPage, session, authLoading]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const { logs, totalCount } = await getActivityLogs(
        userFilter, 
        actionFilter, 
        currentPage, 
        itemsPerPage
      );
      
      setActivities(logs);
      setTotalCount(totalCount);
    } catch (error) {
      console.error('Error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getActionIcon = (activity: ActivityLog) => {
    switch (activity.action_type) {
      case 'upload':
        return <Upload className="h-5 w-5 text-blue-500" />;
      case 'status_change':
        if (activity.new_status === 'approved') {
          return <ShieldCheck className="h-5 w-5 text-green-500" />;
        } else if (activity.new_status === 'rejected') {
          return <ShieldX className="h-5 w-5 text-red-500" />;
        } else {
          return <Clock className="h-5 w-5 text-yellow-500" />;
        }
      case 'login':
        return <User className="h-5 w-5 text-purple-500" />;
      case 'comment':
        return <FileText className="h-5 w-5 text-indigo-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderUserInitials = (fullName: string | null) => {
    if (!fullName) return "U";
    return fullName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return dateString;
    }
  };

  // Function to get the display name for a user
  const getUserDisplayName = (userId: string) => {
    const profile = userProfiles.find(p => p.id === userId);
    return profile?.full_name || profile?.email || 'Unknown user';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/42a0c089-7817-4d54-b180-12a27a76a70f.png" 
              alt="NEU Logo" 
              className="w-16 h-16"
            />
            <h1 className="text-3xl font-bold text-gray-800">Activity Logs</h1>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>System Activity</CardTitle>
              <div className="flex items-center">
                <FilterIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filters</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-1 block">User</label>
                <Select 
                  value={userFilter} 
                  onValueChange={setUserFilter}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="All Users" />
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
              <div>
                <label className="text-sm font-medium mb-1 block">Action Type</label>
                <Select 
                  value={actionFilter} 
                  onValueChange={setActionFilter}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="upload">Upload</SelectItem>
                    <SelectItem value="status_change">Status Change</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-4">
                {loading ? (
                  <div className="text-center py-10">Loading activities...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No activity logs found with the current filters.
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors"
                    >
                      <div className="mt-1">
                        {getActionIcon(activity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={activity.user?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {renderUserInitials(activity.user?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {activity.user?.full_name || activity.user?.email || 'Unknown user'}
                          </span>
                          <span>{activity.description}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(activity.created_at)}
                        </p>
                        {activity.file && (
                          <div className="text-sm text-muted-foreground mt-1">
                            File: {activity.file.violation_type}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="table">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            Loading activities...
                          </TableCell>
                        </TableRow>
                      ) : activities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No activity logs found with the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activities.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell className="w-12">
                              {getActionIcon(activity)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={activity.user?.avatar_url || ""} />
                                  <AvatarFallback className="text-xs">
                                    {renderUserInitials(activity.user?.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>
                                  {activity.user?.full_name || activity.user?.email || 'Unknown user'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{activity.description}</TableCell>
                            <TableCell>{formatDate(activity.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>

            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    aria-disabled={currentPage <= 1}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink 
                        isActive={currentPage === pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    aria-disabled={currentPage >= totalPages}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
