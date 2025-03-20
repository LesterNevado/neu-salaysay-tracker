
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropZone } from "./upload/DropZone";
import { FileUploadItem } from "./upload/FileUploadItem";
import { useFileUpload } from "./upload/useFileUpload";
import { VIOLATION_TYPES } from "./upload/types";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUploadComplete?: () => void;
}

export function UploadDialog({ isOpen, onClose, userId, onUploadComplete }: UploadDialogProps) {
  const [selectedViolationType, setSelectedViolationType] = useState<string>("");
  const { toast } = useToast();
  const { uploads, addFiles, removeFile, uploadToSupabase } = useFileUpload(userId);

  // Add the missing variable definition
  const allUploadsCompleted = uploads.length > 0 && 
    uploads.every(upload => upload.status === 'completed');

  const handleUpload = async () => {
    if (!selectedViolationType) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select a violation type."
      });
      return;
    }

    const pendingUploads = uploads.filter(upload => upload.status === 'pending');
    
    if (pendingUploads.length === 0) {
      toast({
        title: "No files to upload",
        description: "Please select files to upload."
      });
      return;
    }

    for (const upload of pendingUploads) {
      await uploadToSupabase(upload.file, selectedViolationType);
    }
    
    // Trigger refresh of file explorer after upload completes
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleClose = () => {
    addFiles([]);
    setSelectedViolationType("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-black">
            Upload Salaysay
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="violation-type" className="text-black">Violation Type</Label>
            <Select 
              value={selectedViolationType} 
              onValueChange={setSelectedViolationType}
            >
              <SelectTrigger id="violation-type" className="w-full bg-white text-black">
                <SelectValue placeholder="Select violation type" className="text-black" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {VIOLATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="text-black">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {uploads.length === 0 ? (
            <DropZone onFilesSelected={addFiles} />
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <FileUploadItem
                  key={upload.file.name}
                  upload={upload}
                  onRemove={removeFile}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              Cancel
            </Button>
            {allUploadsCompleted ? (
              <Button
                onClick={handleClose}
                className="px-6"
              >
                Done
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                className="px-6"
                disabled={uploads.length === 0 || !selectedViolationType}
              >
                Upload files
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
