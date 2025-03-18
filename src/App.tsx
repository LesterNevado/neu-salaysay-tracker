
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
  // Flag to track if we need to log a sign-in event
  const [shouldLogSignIn, setShouldLogSignIn] = useState(false);
  // Track the auth provider used
  const [authProvider, setAuthProvider] = useState<string | null>(null);

  // Effect for activity logging when session and auth provider are available
  useEffect(() => {
    const handleActivityLogging = async () => {
      // Only proceed if we should log a sign in and we have a session
      if (shouldLogSignIn && session && !isLoading) {
        console.log(`Logging sign-in activity via ${authProvider || 'direct'}`);
        
        try {
          // Directly log to Supabase with appropriate message based on provider
          const message = authProvider 
            ? `User logged in via ${authProvider}` 
            : 'User logged in';
            
          await logActivity('login', message);
          console.log("Successfully logged activity");
          
          // Reset the flag to prevent duplicate logging
          setShouldLogSignIn(false);
          setAuthProvider(null);
        } catch (error) {
          console.error("Error logging sign-in activity:", error);
        }
      }
    };

    handleActivityLogging();
  }, [shouldLogSignIn, session, isLoading, authProvider]);

  useEffect(() => {
    // Set up the Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed:", event, newSession?.user?.email);
      
      // Always update the session and user state when auth state changes
      setSession(newSession);
      setUser(newSession?.user || null);
      
      if (event === 'SIGNED_IN') {
        // For newly signed-in users (not initial session load)
        if (!isInitialSession) {
          // Check if this is a Google sign-in by looking at the URL
          const url = new URL(window.location.href);
          const hasProvider = url.searchParams.has('provider') || 
                            url.hash.includes('provider=');
          
          if (hasProvider) {
            // Set the auth provider for the activity log
            setAuthProvider('Google');
            // Set the flag to log this sign-in
            setShouldLogSignIn(true);
          } else {
            // This is a different kind of sign-in
            setShouldLogSignIn(true);
          }
          
          toast.success("Successfully signed in");
        }
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
