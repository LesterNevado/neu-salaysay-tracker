
import { X, CheckCircle, AlertCircle, FileText, BadgeInfo, Trash, Info } from "lucide-react";
import { FileUpload } from "./types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface FileUploadItemProps {
  upload: FileUpload;
  onRemove: (file: File) => void;
}

export function FileUploadItem({ upload, onRemove }: FileUploadItemProps) {
  return (
    <div className="flex items-start p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex-shrink-0 mr-3 mt-1">
        <div className="text-xs font-medium bg-gray-100 px-2.5 py-1 rounded">
          PDF
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1.5">
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
            <div className="mt-2 border-t border-gray-100 pt-2">
              <div className="flex items-center gap-1 mb-2">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium">AI Analysis</span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md border border-gray-100 text-xs space-y-2">
                {upload.extractedInfo.senderName && (
                  <div className="grid grid-cols-2">
                    <span className="text-gray-500">Sender Name:</span>
                    <span className="font-medium">{upload.extractedInfo.senderName}</span>
                  </div>
                )}
                
                {upload.extractedInfo.addressee && (
                  <div className="grid grid-cols-2">
                    <span className="text-gray-500">Addressee:</span>
                    <span className="font-medium">{upload.extractedInfo.addressee}</span>
                  </div>
                )}
                
                {upload.extractedInfo.studentNumber && (
                  <div className="grid grid-cols-2">
                    <span className="text-gray-500">Student Number:</span>
                    <span className="font-medium">{upload.extractedInfo.studentNumber}</span>
                  </div>
                )}
                
                {upload.extractedInfo.date && (
                  <div className="grid grid-cols-2">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">{upload.extractedInfo.date}</span>
                  </div>
                )}
                
                {upload.extractedInfo.natureOfExcuse && (
                  <div className="mt-1">
                    <span className="text-gray-500 block mb-1">Nature of Excuse:</span>
                    <span className="font-medium block p-1.5 bg-white border border-gray-100 rounded">
                      {upload.extractedInfo.natureOfExcuse}
                    </span>
                  </div>
                )}
              </div>
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
          <Trash className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
