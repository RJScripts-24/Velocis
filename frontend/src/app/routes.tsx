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
import AboutPage from "./pages/Aboutus";
import CareerPage from "./pages/CareerPage";
import ContactPage from "./pages/ContactPage";
import Security from "./pages/Security";
import Blog from "./pages/Blog";

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
  {
    path: "/about",
    element: <AboutPage />,
  },
  {
    path: "/careers",
    element: <CareerPage />,
  },
  {
    path: "/contact",
    element: <ContactPage />,
  },
  {
    path: "/security",
    element: <Security />,
  },
  {
    path: "/blog",
    element: <Blog />,
  },
];

// Convenience export for places that need the router singleton directly
export const router = createBrowserRouter(routeConfig);
