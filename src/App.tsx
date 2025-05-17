
import React, { useState, useEffect, createContext } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ActivityLogs from "./pages/ActivityLogs";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Toaster } from "@/components/ui/toaster";
import Trash from "./pages/Trash"; // Import the new Trash page

// Create AuthContext to share authentication state
export const AuthContext = createContext({
  session: null,
  user: null,
  isLoading: true
});

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoading }}>
      <Router>
        <div className="container" style={{ padding: "50px 0 100px 0" }}>
          {!session ? (
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={["google"]}
              redirectTo={`${window.location.origin}/dashboard`}
            />
          ) : (
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/activity-logs" element={<ActivityLogs />} />
              <Route path="/trash" element={<Trash />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </div>
        <Toaster />
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
