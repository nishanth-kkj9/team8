import { createBrowserRouter, Navigate } from "react-router-dom";
import { DemoLoginPage } from "../features/auth/pages/DemoLoginPage";
import { RequesterDashboardPage } from "../features/requester/pages/RequesterDashboardPage";
import { NewRequestPage } from "../features/requester/pages/NewRequestPage";
import { MyRequestsPage } from "../features/requester/pages/MyRequestsPage";
import { RequestDetailPage } from "../features/requester/pages/RequestDetailPage";
import { ProfilePage } from "../features/requester/pages/ProfilePage";
import { SaDashboardPage } from "../features/student-affairs/pages/SaDashboardPage";
import { SaQueuePage } from "../features/student-affairs/pages/SaQueuePage";
import { SaRequestDetailPage } from "../features/student-affairs/pages/SaRequestDetailPage";
import { DocumentTypesPage } from "../features/student-affairs/pages/DocumentTypesPage";
import { TurnaroundTimePage } from "../features/student-affairs/pages/TurnaroundTimePage";
import { SaFilledFormsPage } from "../features/student-affairs/pages/SaFilledFormsPage";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminAllRequestsPage } from "../features/admin/pages/AdminAllRequestsPage";
import { AdminRequestDetailPage } from "../features/admin/pages/AdminRequestDetailPage";
import { AdminDocumentTypesPage } from "../features/admin/pages/AdminDocumentTypesPage";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { HomeRedirect } from "../routes/HomeRedirect";
import { NotFoundPage } from "../routes/NotFoundPage";

/*
 * Route plan (ARCHITECTURE.md §11). Each portal is wrapped by ProtectedRoute,
 * which also renders the role-aware AppShell, so every route is either
 * role-correct or shows Access Denied — never a blank or leaking screen.
 * Phase 5 completes the Admin portal as strictly read-only: dashboard, the
 * institution-wide request register, per-request inspection with document
 * downloads, and the read-only document type catalog. No Admin route renders
 * any DocDesk mutation control (§5D).
 */

export const router = createBrowserRouter([
  { path: "/", element: <HomeRedirect /> },
  { path: "/login", element: <DemoLoginPage /> },
  {
    path: "/app",
    element: <ProtectedRoute area="requester" />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <RequesterDashboardPage /> },
      { path: "requests", element: <MyRequestsPage /> },
      { path: "requests/new", element: <NewRequestPage /> },
      { path: "requests/:requestId", element: <RequestDetailPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
  {
    path: "/sa",
    element: <ProtectedRoute area="student-affairs" />,
    children: [
      { index: true, element: <Navigate to="/sa/dashboard" replace /> },
      { path: "dashboard", element: <SaDashboardPage /> },
      { path: "requests", element: <SaQueuePage /> },
      { path: "requests/:requestId", element: <SaRequestDetailPage /> },
      { path: "document-types", element: <DocumentTypesPage /> },
      { path: "turnaround-time", element: <TurnaroundTimePage /> },
      { path: "filled-forms", element: <SaFilledFormsPage /> },
    ],
  },
  {
    path: "/admin",
    element: <ProtectedRoute area="admin" />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <AdminDashboardPage /> },
      { path: "requests", element: <AdminAllRequestsPage /> },
      { path: "requests/:requestId", element: <AdminRequestDetailPage /> },
      { path: "document-types", element: <AdminDocumentTypesPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
