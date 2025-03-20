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
import { logLoginActivity, logActivity } from "./utils/activity";
import { toast } from "sonner";

export const AuthContext = React.createContext({
  session: null,
  user: null,
  isLoading: true
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000,
    },
  },
});

const App: React.FC = () => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousLoginStatus, setPreviousLoginStatus] = useState(false);
  const [lastLoginTimestamp, setLastLoginTimestamp] = useState<number | null>(null);
  const [lastLogoutTimestamp, setLastLogoutTimestamp] = useState<number | null>(null);
  const [lastActiveUserId, setLastActiveUserId] = useState<string | null>(null);

  const isGoogleAuth = () => {
    const url = new URL(window.location.href);
    return url.hash.includes('google') || 
           url.searchParams.has('provider=google') || 
           url.hash.includes('provider=google');
  };

  const handleLogout = async (userId: string) => {
    console.log("Logging out user:", userId);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logSuccess = await logLoginActivity(
        userId,
        'User logged out'
      );
      
      if (logSuccess) {
        console.log("Successfully logged logout activity to Supabase");
        queryClient.invalidateQueries();
      } else {
        console.error("Failed to log logout activity to Supabase");
      }
    } catch (err) {
      console.error("Error logging logout activity:", err);
    }
  };

  useEffect(() => {
    const logAuthActivity = async () => {
      const currentTime = Date.now();
      
      if (session && user) {
        const isNewLogin = !previousLoginStatus || 
                           (lastLoginTimestamp === null || (currentTime - lastLoginTimestamp > 30000));
        
        if (isNewLogin) {
          console.log("New login detected, logging activity");
          setLastLoginTimestamp(currentTime);
          setPreviousLoginStatus(true);
          setLastActiveUserId(user.id);
          
          const authMethod = isGoogleAuth() ? 'Google' : 'direct';
          
          try {
            const logSuccess = await logLoginActivity(
              user.id,
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
        }
      }
      
      if (!session && previousLoginStatus && lastActiveUserId) {
        const isNewLogout = lastLogoutTimestamp === null || 
                          (currentTime - (lastLogoutTimestamp || 0) > 30000);
        
        if (isNewLogout) {
          console.log("New logout detected, logging activity");
          setLastLogoutTimestamp(currentTime);
          setPreviousLoginStatus(false);
          
          await handleLogout(lastActiveUserId);
        }
      }
    };
    
    if (!isLoading) {
      logAuthActivity();
    }
  }, [session, user, isLoading, previousLoginStatus, lastLoginTimestamp, lastLogoutTimestamp, lastActiveUserId]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event, newSession?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        const userId = lastActiveUserId || (user?.id) || (newSession?.user?.id);
        
        if (userId) {
          console.log("SIGNED_OUT event detected for user:", userId);
          await handleLogout(userId);
        }
        
        setSession(null);
        setUser(null);
        setPreviousLoginStatus(false);
        
        toast.info("Signed out successfully");
      } else {
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (event === 'SIGNED_IN') {
          toast.success("Successfully signed in");
        }
      }
    });

    const initSession = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          toast.error("Error retrieving your session.");
        } else if (data?.session) {
          console.log("Retrieved existing session:", data.session.user?.email);
          setSession(data.session);
          setUser(data.session.user);
          setLastActiveUserId(data.session.user.id);
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

    initSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
