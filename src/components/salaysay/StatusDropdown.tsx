
import { useState } from "react";
import { Loader2, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusOption = "pending_review" | "approved" | "rejected";

interface StatusDropdownProps {
  fileId: string;
  initialStatus: string;
  canEdit: boolean;
  onStatusChange?: (newStatus: StatusOption) => void;
}

export function StatusDropdown({ 
  fileId, 
  initialStatus, 
  canEdit,
  onStatusChange 
}: StatusDropdownProps) {
  const [status, setStatus] = useState<StatusOption>(initialStatus as StatusOption || "pending_review");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const statusOptions: { value: StatusOption; label: string; icon: React.ReactNode }[] = [
    { 
      value: "pending_review", 
      label: "Pending Review", 
      icon: <Clock className="h-4 w-4 text-yellow-600" /> 
    },
    { 
      value: "approved", 
      label: "Approved", 
      icon: <ShieldCheck className="h-4 w-4 text-green-600" /> 
    },
    { 
      value: "rejected", 
      label: "Rejected", 
      icon: <ShieldX className="h-4 w-4 text-red-600" /> 
    },
  ];

  const handleStatusChange = async (newStatus: StatusOption) => {
    if (newStatus === status || !canEdit) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('salaysay_submissions')
        .update({ status: newStatus })
        .eq('id', fileId);
      
      if (error) throw error;
      
      setStatus(newStatus);
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
      toast({
        title: "Status updated",
        description: `Document status changed to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: "There was an error updating the document status."
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case "pending_review":
        return "text-yellow-600";
      case "approved":
        return "text-green-600";
      case "rejected":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getCurrentStatus = () => {
    return statusOptions.find(option => option.value === status);
  };

  const getFormattedStatusText = (statusValue: string) => {
    return statusValue.replace('_', ' ').charAt(0).toUpperCase() + statusValue.replace('_', ' ').slice(1);
  };

  if (isUpdating) {
    return (
      <div className="flex items-center">
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-500" />
        <span className="text-gray-500">Updating...</span>
      </div>
    );
  }

  if (!canEdit) {
    const currentStatus = getCurrentStatus();
    return (
      <div className={`flex items-center ${getStatusColor(status)}`}>
        {currentStatus?.icon}
        <span className="ml-2">{getFormattedStatusText(status)}</span>
      </div>
    );
  }

  return (
    <Select
      value={status}
      onValueChange={(value) => handleStatusChange(value as StatusOption)}
      disabled={isUpdating}
    >
      <SelectTrigger 
        className={`h-8 w-full border-0 bg-transparent focus:ring-0 pl-0 ${getStatusColor(status)}`}
      >
        <div className="flex items-center">
          {getCurrentStatus()?.icon}
          <span className="ml-2">{getFormattedStatusText(status)}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            className="px-2 py-1.5"
          >
            <div className="flex items-center">
              {option.icon}
              <span className="ml-2">{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
