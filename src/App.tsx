
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
import { logActivity } from "./utils/activityLogger";
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
  // Add a flag to track if this is an initial session or a new login
  const [isInitialSession, setIsInitialSession] = useState(true);
  // Track newly authenticated sessions via Google
  const [isNewGoogleAuth, setIsNewGoogleAuth] = useState(false);

  useEffect(() => {
    // Set up the Supabase auth listener FIRST
    // This is crucial for maintaining the session across tab changes and refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed:", event, newSession?.user?.email);
      
      const previouslyLoggedIn = !!session;
      const isNowLoggedIn = !!newSession;
      
      // Always update the session and user state when auth state changes
      setSession(newSession);
      setUser(newSession?.user || null);
      
      // Check if this is a successful Google sign-in by checking URL
      const url = new URL(window.location.href);
      const hasAuthParam = url.searchParams.has('provider') || url.hash.includes('provider=');
      
      // Handle successfully completed Google auth flow
      if (event === 'SIGNED_IN' && hasAuthParam) {
        console.log("Detected new Google auth sign-in");
        setIsNewGoogleAuth(true);
        toast.success("Successfully signed in");
      } else if (event === 'SIGNED_IN' && !isInitialSession && !previouslyLoggedIn && isNowLoggedIn) {
        // This is a non-initial session sign-in that wasn't from the Index page
        logActivity('login', 'User logged in').catch(console.error);
        toast.success("Successfully signed in");
      } else if (event === 'SIGNED_OUT') {
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
        } else {
          console.log("No existing session found");
        }
      } catch (err) {
        console.error("Unexpected error in session initialization:", err);
        toast.error("An unexpected error occurred.");
      } finally {
        setIsLoading(false);
        // After initial session check, set isInitialSession to false
        // so we can distinguish between a restored session and a new login
        setTimeout(() => {
          setIsInitialSession(false);
        }, 1000); // Small delay to ensure auth listener is properly set up
      }
    };

    // Initialize the session
    initSession();

    // Cleanup the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Effect to log new Google auth activity after session is established
  useEffect(() => {
    if (isNewGoogleAuth && session && !isLoading) {
      console.log("Logging Google authentication activity");
      logActivity('login', 'User logged in via Google').catch(console.error);
      setIsNewGoogleAuth(false); // Reset the flag
    }
  }, [isNewGoogleAuth, session, isLoading]);

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
