import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RepositoryPage } from "./pages/RepositoryPage";
import { CortexPage } from "./pages/CortexPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { PipelinePage } from "./pages/PipelinePage";
import { InfrastructurePage } from "./pages/InfrastructurePage";
import { RepositorySettingsPage } from "./pages/RepositorySettingsPage";
import { AuthPage } from "./pages/AuthPage";
import { AutomationReportPage } from "./pages/AutomationReportPage";

export const routeConfig = [
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/onboarding",
    element: <OnboardingPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
  {
    path: "/repo/:id",
    element: <RepositoryPage />,
  },
  {
    path: "/repo/:id/cortex",
    element: <CortexPage />,
  },
  {
    path: "/repo/:id/workspace",
    element: <WorkspacePage />,
  },
  {
    path: "/repo/:id/pipeline",
    element: <PipelinePage />,
  },
  {
    path: "/repo/:id/settings",
    element: <RepositorySettingsPage />,
  },
  {
    path: "/repo/:id/infrastructure",
    element: <InfrastructurePage />,
  },
  {
    path: "/repo/:id/automation-report",
    element: <AutomationReportPage />,
  },
];

// Convenience export for places that need the router singleton directly
export const router = createBrowserRouter(routeConfig);
