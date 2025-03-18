import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ActivityLogs from "./pages/ActivityLogs";
import NotFound from "./pages/NotFound";
import { supabase } from "./integrations/supabase/client";
import { logLoginActivity } from "./utils/activityLogger";
import { toast } from "sonner";

// Create a context for auth state
export const AuthContext = React.createContext({
  session: null,
  user: null,
  isLoading: true
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent queries from refetching when window regains focus
      retry: 1,
      staleTime: 60000, // Consider data fresh for 1 minute
    },
  },
});

const App: React.FC = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousLoginStatus, setPreviousLoginStatus] = useState(false);
  const [lastLoginTimestamp, setLastLoginTimestamp] = useState<number | null>(null);

  useEffect(() => {
    // Set up the Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event, newSession?.user?.email);
      
      // Always update the session and user state when auth state changes
      setSession(newSession);
      setUser(newSession?.user || null);
      
      if (event === 'SIGNED_IN') {
        // Only log sign-in activity if this is a true new sign-in
        // We can detect this based on URL or by checking if the user was previously null
        const currentTime = Date.now();
        const url = new URL(window.location.href);
        const isRedirectFromAuth = url.hash.includes('access_token') || 
                                  url.searchParams.has('access_token') ||
                                  url.hash.includes('provider=') || 
                                  url.searchParams.has('provider=');
        
        // Prevent duplicate logging within a short period (30 seconds)
        const isNewLogin = !lastLoginTimestamp || (currentTime - lastLoginTimestamp > 30000);
        
        if (isRedirectFromAuth && isNewLogin && newSession?.user) {
          setLastLoginTimestamp(currentTime);
          
          // Determine auth method
          const authMethod = url.hash.includes('google') || url.searchParams.has('provider=google') 
            ? 'Google' 
            : 'direct';
          
          console.log(`Detected new login via ${authMethod}, logging activity...`);
          
          // We need to use the special login logger because the regular logger 
          // might not work correctly during the login transition
          try {
            const logSuccess = await logLoginActivity(
              newSession.user.id,
              `User logged in via ${authMethod}`
            );
            
            if (logSuccess) {
              console.log("Successfully logged login activity to Supabase");
            } else {
              console.error("Failed to log login activity to Supabase");
            }
          } catch (err) {
            console.error("Error logging login activity:", err);
          }
          
          toast.success("Successfully signed in");
        }
      } else if (event === 'SIGNED_OUT') {
        setPreviousLoginStatus(false);
        setLastLoginTimestamp(null);
        toast.info("Signed out successfully");
      }
    });

    // Get the initial session (this runs only once)
    const initSession = async () => {
      try {
        setIsLoading(true);
        
        // Get the current session from Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          toast.error("Error retrieving your session.");
        } else if (data?.session) {
          console.log("Retrieved existing session:", data.session.user?.email);
          setSession(data.session);
          setUser(data.session.user);
          setPreviousLoginStatus(true);
        } else {
          console.log("No existing session found");
        }
      } catch (err) {
        console.error("Unexpected error in session initialization:", err);
        toast.error("An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize the session
    initSession();

    // Cleanup the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [lastLoginTimestamp]);

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ session, user, isLoading }}>
          <BrowserRouter>
            <TooltipProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route 
                  path="/dashboard" 
                  element={
                    !isLoading && !session ? <Navigate to="/" /> : <Dashboard />
                  } 
                />
                <Route 
                  path="/activity-logs" 
                  element={
                    !isLoading && !session ? <Navigate to="/" /> : <ActivityLogs />
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </BrowserRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
