
import { useEffect, useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Send, User, Users, ActivitySquare, FileIcon, Filter, Calendar, Search } from "lucide-react";
import { UploadDialog } from "@/components/UploadDialog";
import { FileExplorer } from "@/components/salaysay/FileExplorer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthContext } from "@/App";
import { logLogoutActivity } from "@/utils/activity";
import { VIOLATION_TYPES } from "@/components/upload/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState<'start' | 'end' | null>(null);
  const [usersList, setUsersList] = useState<{id: string, name: string}[]>([]);
  const [fileNameFilter, setFileNameFilter] = useState("");
  const [filters, setFilters] = useState<{
    violationTypes: Record<string, boolean>;
    startDate: Date | null;
    endDate: Date | null;
    userId: string | null;
    fileName: string;
  }>({
    violationTypes: VIOLATION_TYPES.reduce((acc, type) => ({ ...acc, [type]: false }), {}),
    startDate: null,
    endDate: null,
    userId: null,
    fileName: ""
  });
  const [userProfile, setUserProfile] = useState<{
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    id: string | null;
  }>({
    email: null,
    fullName: null,
    avatarUrl: null,
    id: null,
  });

  // Fetch users for the filter dropdown when showing all users is enabled
  useEffect(() => {
    if (showAllUsers) {
      const fetchUsers = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true });
          
        if (error) {
          console.error("Error fetching users:", error);
          return;
        }
        
        setUsersList(data.map(user => ({
          id: user.id,
          name: user.full_name || user.email || "Unknown user"
        })));
      };
      
      fetchUsers();
    }
  }, [showAllUsers]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }

      setUserProfile(prev => ({ 
        ...prev, 
        email: session.user.email,
        id: session.user.id
      }));

      const avatarUrl = session.user.user_metadata?.avatar_url || 
                        session.user.user_metadata?.picture || 
                        null;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        
        if (session.user.email) {
          const { error: updateError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
              email: session.user.email,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            });
            
          if (updateError) {
            console.error("Error creating profile:", updateError);
          } else {
            console.log("Created/updated profile with avatar URL:", avatarUrl);
          }
        }
      } else if (profileData && (!profileData.avatar_url) && avatarUrl) {
        console.log("Updating existing profile with avatar URL from auth metadata");
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);
          
        if (updateError) {
          console.error("Error updating profile with avatar URL:", updateError);
        } else {
          console.log("Updated profile with avatar URL:", avatarUrl);
        }
      }

      setUserProfile({
        email: session.user.email,
        fullName: profileData?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
        avatarUrl: avatarUrl || profileData?.avatar_url || null,
        id: session.user.id,
      });
    };
    
    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    if (userProfile.id) {
      try {
        console.log("Logging logout activity before sign out");
        await logLogoutActivity(userProfile.id);
      } catch (error) {
        console.error("Error logging logout:", error);
      }
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message
      });
    } else {
      navigate('/');
    }
  };

  const handleSubmitSalaysay = () => {
    setIsUploadDialogOpen(true);
  };

  const refreshFileExplorer = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const getInitials = () => {
    if (!userProfile.fullName) return "U";
    return userProfile.fullName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const toggleShowAllUsers = () => {
    setShowAllUsers(prev => !prev);
    if (!showAllUsers) {
      setFilters(prev => ({ ...prev, userId: null }));
    }
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

  const handleDateChange = (date: Date | null, type: 'start' | 'end') => {
    setFilters(prev => ({
      ...prev,
      [type === 'start' ? 'startDate' : 'endDate']: date
    }));
    // Close the calendar after date selection
    setCalendarOpen(null);
  };

  const handleUserFilterChange = (userId: string) => {
    setFilters(prev => ({
      ...prev,
      userId: userId === 'all' ? null : userId
    }));
  };

  const handleFileNameFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFileNameFilter(value);
    setFilters(prev => ({
      ...prev,
      fileName: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      violationTypes: VIOLATION_TYPES.reduce((acc, type) => ({ ...acc, [type]: false }), {}),
      startDate: null,
      endDate: null,
      userId: null,
      fileName: ""
    });
    setFileNameFilter("");
  };

  const hasActiveFilters = Object.values(filters.violationTypes).some(val => val) || 
    filters.startDate !== null || 
    filters.endDate !== null ||
    filters.userId !== null ||
    filters.fileName !== "";

  const activeViolationTypeFilters = Object.entries(filters.violationTypes)
    .filter(([_, isActive]) => isActive)
    .map(([type]) => type);

  const getActiveFiltersCount = () => {
    let count = 0;
    
    // Count active violation types
    count += Object.values(filters.violationTypes).filter(Boolean).length;
    
    // Count date filters
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    
    // Count user filter
    if (filters.userId) count++;
    
    // Count filename filter
    if (filters.fileName) count++;
    
    return count;
  };

  return (
    <div className="min-h-screen bg-[#BBDEFB]">
      <header className="h-16 bg-[#0E254E] text-white flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/42a0c089-7817-4d54-b180-12a27a76a70f.png" 
            alt="NEU Logo" 
            className="w-8 h-8"
          />
          <h1 className="text-xl font-bold">NEU-STAT</h1>
        </div>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Avatar>
                    <AvatarImage src={userProfile.avatarUrl || ""} alt={userProfile.fullName || "User"} />
                    <AvatarFallback className="bg-gray-200 text-gray-700">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-white p-3 shadow-lg border rounded-md">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{userProfile.fullName || "User"}</p>
                  <p className="text-xs text-gray-500">{userProfile.email}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-transparent"
          >
            Sign Out
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-6 max-w-6xl">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Salaysay Tracking And Archival Tool</h2>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/activity-logs')} 
                variant="outline" 
                className="flex items-center gap-2 border-gray-200"
              >
                <ActivitySquare className="h-4 w-4" />
                Activity Logs
              </Button>
              <Button 
                onClick={handleSubmitSalaysay} 
                className="flex items-center gap-2 bg-[#0E254E] hover:bg-[#0E254E]/90"
              >
                <Send className="h-4 w-4" />
                Submit Salaysay
              </Button>
            </div>
          </div>
          <p className="text-gray-600">
            NEU-STAT is New Era University's official Salaysay Tracking System, enabling seamless submission, monitoring, and approval of Salaysay documents.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Salaysay Files</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="show-all-users" className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Show all users' files
                </Label>
                <Switch 
                  id="show-all-users" 
                  checked={showAllUsers} 
                  onCheckedChange={toggleShowAllUsers}
                />
              </div>
              <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex items-center gap-1 border-gray-200 ${hasActiveFilters ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <Filter className={`h-3.5 w-3.5 ${hasActiveFilters ? 'text-blue-500' : ''}`} />
                    Filter {hasActiveFilters && <span className="ml-1 text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{getActiveFiltersCount()}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Filters</h4>
                      {hasActiveFilters && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearFilters} 
                          className="text-xs text-blue-500 hover:text-blue-700 p-0 h-auto"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>

                    {/* File Name Filter */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Filter by File Name</h5>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by file name"
                          value={fileNameFilter}
                          onChange={handleFileNameFilterChange}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium mb-2">Date Range</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <Popover open={calendarOpen === 'start'} onOpenChange={(open) => open ? setCalendarOpen('start') : setCalendarOpen(null)}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className={`justify-start text-left font-normal ${filters.startDate ? 'bg-blue-50 border-blue-200' : ''}`}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {filters.startDate ? format(filters.startDate, 'PP') : <span>Start date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={filters.startDate || undefined}
                              onSelect={(date) => handleDateChange(date, 'start')}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Popover open={calendarOpen === 'end'} onOpenChange={(open) => open ? setCalendarOpen('end') : setCalendarOpen(null)}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className={`justify-start text-left font-normal ${filters.endDate ? 'bg-blue-50 border-blue-200' : ''}`}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {filters.endDate ? format(filters.endDate, 'PP') : <span>End date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={filters.endDate || undefined}
                              onSelect={(date) => handleDateChange(date, 'end')}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* User Filter - Only show when "Show all users" is enabled */}
                    {showAllUsers && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Filter by User</h5>
                        <Select
                          value={filters.userId || 'all'}
                          onValueChange={handleUserFilterChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {usersList.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Violation Type Filters */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Filter by Violation Type</h5>
                      <div className="space-y-3">
                        {VIOLATION_TYPES.map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`filter-${type}`} 
                              checked={filters.violationTypes[type]} 
                              onCheckedChange={(checked) => 
                                handleFilterChange(type, checked === true)
                              }
                            />
                            <Label htmlFor={`filter-${type}`} className="text-sm">
                              {type}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-sm">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">File Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date Uploaded</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Violation Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Uploaded By</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userProfile.id && (
                  <FileExplorer 
                    userId={userProfile.id} 
                    refreshTrigger={refreshTrigger} 
                    showAllUsers={showAllUsers}
                    violationTypeFilters={activeViolationTypeFilters}
                    dateRangeFilter={{
                      startDate: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : null,
                      endDate: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : null
                    }}
                    userFilter={filters.userId}
                    fileNameFilter={filters.fileName}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <UploadDialog 
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        userId={userProfile.id || ""}
        onUploadComplete={refreshFileExplorer}
      />
    </div>
  );
}
