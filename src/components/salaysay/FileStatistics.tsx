
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

type FileStats = {
  totalFiles: number;
  violationTypeCounts: Record<string, number>;
  senderNames?: Record<string, {
    count: number;
    violationTypes: Record<string, number>;
  }>;
}

interface FileStatisticsProps {
  stats: FileStats;
  keywordFilter: string;
  className?: string;
  onSenderClick?: (senderName: string) => void;
}

export function FileStatistics({ stats, keywordFilter, className = "", onSenderClick }: FileStatisticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get top 5 senders by file count
  const topSenders = stats.senderNames ? 
    Object.entries(stats.senderNames)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
    : [];
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Total Matching Files</h4>
          <p className="text-2xl font-bold text-blue-600">{stats.totalFiles}</p>
        </div>
        
        <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-2">By Classification</h4>
          <div className="space-y-1">
            {Object.entries(stats.violationTypeCounts).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{type}</span>
                <Badge variant="outline" className="bg-blue-50">{count}</Badge>
              </div>
            ))}
            {Object.keys(stats.violationTypeCounts).length === 0 && (
              <p className="text-sm text-gray-500">No classification data</p>
            )}
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Top 5 Senders</h4>
          <div className="space-y-2">
            {topSenders.map(([name, data]) => (
              <Button
                key={name}
                variant="ghost"
                className="w-full justify-between text-left font-normal hover:bg-blue-50"
                onClick={() => onSenderClick?.(name)}
              >
                <span className="truncate flex-1">{name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50">{data.count}</Badge>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Button>
            ))}
            {topSenders.length === 0 && (
              <p className="text-sm text-gray-500">No sender data available</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Show sender name statistics if keyword search is active */}
      {keywordFilter && stats.senderNames && Object.keys(stats.senderNames).length > 0 && (
        <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm mt-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sender Analysis</h4>
          <div className="space-y-3">
            {Object.entries(stats.senderNames).map(([name, data]) => (
              <div key={name} className="pb-2 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{name}</span>
                  <Badge variant="outline" className="bg-blue-50">{data.count} file(s)</Badge>
                </div>
                <div className="pl-2 space-y-1">
                  {Object.entries(data.violationTypes).map(([type, count]) => (
                    <div key={`${name}-${type}`} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">{type}</span>
                      <span className="text-gray-700">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
