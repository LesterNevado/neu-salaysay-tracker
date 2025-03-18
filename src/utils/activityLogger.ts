
import { supabase } from "@/integrations/supabase/client";

type ActionType = 'upload' | 'status_change' | 'login' | 'comment';
type StatusType = 'pending_review' | 'approved' | 'rejected';

export const logActivity = async (
  action: ActionType, 
  description: string, 
  fileId?: string, 
  newStatus?: StatusType
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('activity_logs')
      .insert({
        user_id: session.user.id,
        action_type: action,
        description,
        related_file_id: fileId,
        new_status: newStatus,
      });
  } catch (err) {
    console.error("Error logging activity:", err);
  }
};
