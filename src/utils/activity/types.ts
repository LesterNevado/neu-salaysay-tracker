
/**
 * Defines the allowed action types for activity logs
 */
export type ActionType = 
  | 'upload' 
  | 'view' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'soft-delete' // Added new action type
  | 'restore';    // Added new action type

/**
 * Defines the allowed status types for activity logs
 */
export type StatusType = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'archived';

/**
 * Defines the filters for activity logs
 */
export interface ActivityLogFilters {
  userFilter?: string;
  actionFilter?: string;
  violationTypeFilter?: string;
  startDate?: string | null;
  endDate?: string | null;
  page?: number;
  itemsPerPage?: number;
  fileName?: string;
}

/**
 * Defines the result of a get activity logs operation
 */
export interface ActivityLogResult {
  logs: any[];
  totalCount: number;
}
