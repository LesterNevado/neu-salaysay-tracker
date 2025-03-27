
import { X, CheckCircle, AlertCircle, FileText, BadgeInfo } from "lucide-react";
import { FileUpload } from "./types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FileUploadItemProps {
  upload: FileUpload;
  onRemove: (file: File) => void;
}

export function FileUploadItem({ upload, onRemove }: FileUploadItemProps) {
  const getConfidenceColor = (confidence?: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex-shrink-0 mr-3">
        <div className="text-xs font-medium bg-gray-100 px-2.5 py-1 rounded">
          PDF
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 break-words pr-4">
              {upload.file.name}
            </p>
            {upload.status === 'completed' && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {upload.status === 'analyzing' && (
              <div className="flex items-center">
                <span className="text-xs text-blue-500 mr-2">Analyzing...</span>
                <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            )}
          </div>
          
          {upload.status === 'uploading' && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          )}
          
          {upload.status === 'completed' && upload.violationType && (
            <p className="text-xs text-gray-500">
              Type: {upload.violationType}
            </p>
          )}
          
          {upload.extractedInfo && (
            <div className="mt-1.5 border-t border-gray-100 pt-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs">
                      <BadgeInfo className={cn("h-3.5 w-3.5", getConfidenceColor(upload.extractedInfo.confidence))} />
                      <span className="font-medium">AI Analysis</span>
                      <span className={cn("text-[10px] ml-1 px-1.5 py-0.5 rounded-full", {
                        "bg-green-100 text-green-700": upload.extractedInfo.confidence === 'high',
                        "bg-yellow-100 text-yellow-700": upload.extractedInfo.confidence === 'medium',
                        "bg-red-100 text-red-700": upload.extractedInfo.confidence === 'low',
                      })}>
                        {upload.extractedInfo.confidence}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="w-64 p-3">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Extracted Information</h4>
                      <div className="space-y-1 text-xs">
                        {upload.extractedInfo.senderName && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Sender Name:</span>
                            <span className="font-medium">{upload.extractedInfo.senderName}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Student Number:</span>
                          <span className="font-medium">{upload.extractedInfo.studentNumber || 'Not found'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date:</span>
                          <span className="font-medium">{upload.extractedInfo.date || 'Not found'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500">Nature of Excuse:</span>
                          <span className="font-medium text-xs mt-1">
                            {upload.extractedInfo.natureOfExcuse || 'Not found'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
      {upload.status !== 'uploading' && upload.status !== 'analyzing' && (
        <button
          onClick={() => onRemove(upload.file)}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
