
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    };
    
    checkUser();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p>Redirecting...</p>
    </div>
  );
}
