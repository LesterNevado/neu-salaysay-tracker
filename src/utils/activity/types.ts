
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
