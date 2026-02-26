import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RepositoryPage } from "./pages/RepositoryPage";
import { CortexPage } from "./pages/CortexPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { PipelinePage } from "./pages/PipelinePage";
import { InfrastructurePage } from "./pages/InfrastructurePage";
import { AuthPage } from "./pages/AuthPage";
import { RepoSelectionPage } from "./pages/RepoSelectionPage";

export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/select-repo",
    element: <RepoSelectionPage />,
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
    path: "/repo/:id/infrastructure",
    element: <InfrastructurePage />,
  },
]);
