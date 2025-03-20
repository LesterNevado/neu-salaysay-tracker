
export interface ActivityLog {
  id: string;
  created_at: string;
  user_id: string;
  action_type: 'upload' | 'status_change' | 'login' | 'logout' | 'comment' | 'delete';
  description: string;
  related_file_id?: string;
  new_status?: 'pending_review' | 'approved' | 'rejected';
  user?: {
    email: string;
    full_name: string;
    avatar_url: string;
  };
  file?: {
    violation_type: string;
    file_path: string;
  };
}
