import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
<<<<<<< HEAD
import { notifyVisitorPageChange, startVisitorTracking } from "./lib/visitorTracker";
=======
import SiteBanGate from "./components/SiteBanGate";
>>>>>>> web/main

const queryClient = new QueryClient();

const VisitorPageTracking = () => {
  const location = useLocation();

<<<<<<< HEAD
  useEffect(() => {
    notifyVisitorPageChange();
  }, [location.pathname]);
=======
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <SiteBanGate>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </SiteBanGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
>>>>>>> web/main

  return null;
};

const App = () => {
  useEffect(() => {
    const stopTracking = startVisitorTracking();

    return () => {
      stopTracking.then((stop) => stop());
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <VisitorPageTracking />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;