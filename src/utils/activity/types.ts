
import { ActivityLog } from "@/types/activity.types";

export type ActionType = 'upload' | 'status_change' | 'login' | 'comment';
export type StatusType = 'pending_review' | 'approved' | 'rejected';

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
