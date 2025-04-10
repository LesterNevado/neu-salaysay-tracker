
import { useState } from "react";
import { BarChart, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}

export function FileStatistics({ stats, keywordFilter, className = "" }: FileStatisticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`space-y-2 ${className}`}>
      <Button 
        variant="ghost" 
        className="flex items-center gap-2 text-blue-700 p-2 w-full justify-between" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2">
          <BarChart className="h-4 w-4" />
          <span className="font-medium">File Statistics</span>
        </span>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
      
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
        </div>
      )}
      
      {/* Show sender name statistics if keyword search is active */}
      {isExpanded && keywordFilter && stats.senderNames && Object.keys(stats.senderNames).length > 0 && (
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
