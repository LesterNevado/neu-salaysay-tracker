
import { ActivityLog } from "@/types/activity.types";

export type ActionType = 'upload' | 'view' | 'login' | 'logout' | 'comment' | 'delete';
export type StatusType = string | null;

export interface ActivityLogFilters {
  userFilter?: string;
  actionFilter?: string;
  page?: number;
  itemsPerPage?: number;
}

export interface ActivityLogResult {
  logs: ActivityLog[];
  totalCount: number;
}
