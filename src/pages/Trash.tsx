
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { TrashView } from "@/components/salaysay/TrashView";

export default function TrashPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        
        // Here you could add logic to check if user is admin
        // For example, checking a role field in the profile
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p>You need to be logged in to view the trash.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Trash</h1>
      <p className="text-gray-600 mb-6">
        Files will be permanently deleted 30 days after being moved to trash.
      </p>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <TrashView userId={userId} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
