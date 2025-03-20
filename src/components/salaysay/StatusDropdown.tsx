
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, ShieldX } from "lucide-react";
import { logActivity } from "@/utils/activity";

type StatusType = "pending_review" | "approved" | "rejected";

interface StatusDropdownProps {
  fileId: string;
  currentStatus: StatusType;
  onStatusChange?: (newStatus: StatusType) => void;
  canEdit?: boolean;
}

export function StatusDropdown({
  fileId,
  currentStatus,
  onStatusChange,
  canEdit = true,
}: StatusDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getStatusDisplay = (status: StatusType) => {
    switch (status) {
      case "pending_review":
        return (
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-yellow-500" />
            <span className="text-black">Pending Review</span>
          </div>
        );
      case "approved":
        return (
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            <span className="text-black">Approved</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center">
            <ShieldX className="mr-2 h-4 w-4 text-red-500" />
            <span className="text-black">Rejected</span>
          </div>
        );
      default:
        return <span className="text-black">Unknown Status</span>;
    }
  };

  const updateStatus = async (newStatus: StatusType) => {
    if (newStatus === currentStatus) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("salaysay_submissions")
        .update({ status: newStatus })
        .eq("id", fileId);

      if (error) throw error;

      // Log the status change
      await logActivity(
        'status_change',
        `Changed status from ${currentStatus} to ${newStatus}`,
        fileId,
        newStatus
      );

      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
      toast({
        title: "Status updated",
        description: `File status has been updated to ${newStatus.replace("_", " ")}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "There was a problem updating the status",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start h-auto py-1.5 bg-white"
          disabled={isLoading || !canEdit}
        >
          {getStatusDisplay(currentStatus)}
        </Button>
      </DropdownMenuTrigger>
      {canEdit && (
        <DropdownMenuContent align="end" className="w-[200px] bg-white">
          <DropdownMenuItem
            className="cursor-pointer text-black hover:bg-gray-100"
            onClick={() => updateStatus("pending_review")}
          >
            <Clock className="mr-2 h-4 w-4 text-yellow-500" />
            <span>Pending Review</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-black hover:bg-gray-100"
            onClick={() => updateStatus("approved")}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            <span>Approved</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-black hover:bg-gray-100"
            onClick={() => updateStatus("rejected")}
          >
            <ShieldX className="mr-2 h-4 w-4 text-red-500" />
            <span>Rejected</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
