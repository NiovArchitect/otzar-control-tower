import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Users from "./pages/Users";
import AITeammates from "./pages/AITeammates";
import AccessControl from "./pages/AccessControl";
import Data from "./pages/Data";
import Security from "./pages/Security";
import Analytics from "./pages/Analytics";
import Playground from "./pages/Playground";
import Policies from "./pages/Policies";
import Health from "./pages/Health";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Documentation from "./pages/Documentation";
import Conversations from "./pages/Conversations";
import WorkflowAutomation from "./pages/WorkflowAutomation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/users" element={<Users />} />
          <Route path="/ai-teammates" element={<AITeammates />} />
          <Route path="/access-control" element={<AccessControl />} />
          <Route path="/data" element={<Data />} />
          <Route path="/security" element={<Security />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/health" element={<Health />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/workflow-automation" element={<WorkflowAutomation />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
