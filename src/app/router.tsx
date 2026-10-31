import { createBrowserRouter, Navigate } from "react-router-dom";
import { useDemoAuth } from "../context/DemoAuthContext";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RequesterDashboardPage } from "../features/requester/pages/RequesterDashboardPage";
import { NewRequestPage } from "../features/requester/pages/NewRequestPage";
import { MyRequestsPage } from "../features/requester/pages/MyRequestsPage";
import { RequestDetailPage } from "../features/requester/pages/RequestDetailPage";
import { ProfilePage } from "../features/requester/pages/ProfilePage";
import { DocumentCatalogPage } from "../features/requester/pages/DocumentCatalogPage";
import { TurnaroundTimePage } from "../features/student-affairs/pages/TurnaroundTimePage";
import { SaFilledFormsPage } from "../features/student-affairs/pages/SaFilledFormsPage";
import { AdminDashboardPage } from "../features/admin/pages/AdminDashboardPage";
import { AdminAllRequestsPage } from "../features/admin/pages/AdminAllRequestsPage";
import { AdminRequestDetailPage } from "../features/admin/pages/AdminRequestDetailPage";
import { AdminDocumentTypesPage } from "../features/admin/pages/AdminDocumentTypesPage";
import { DocumentTypesPage } from "../features/student-affairs/pages/DocumentTypesPage";
import { AdminUsersNewPage } from "../features/admin/pages/AdminUsersNewPage";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { HomeRedirect } from "../routes/HomeRedirect";
import { NotFoundPage } from "../routes/NotFoundPage";
import { isStudentAffairs } from "../lib/permissions";

function AdminDocumentTypesRoute() {
  const { profile } = useDemoAuth();
  return isStudentAffairs(profile) ? <DocumentTypesPage /> : <AdminDocumentTypesPage />;
}

/** DocDesk has two portals: students and the College Main Admin staff. */
export const router = createBrowserRouter([
  { path: "/", element: <HomeRedirect /> },
  { path: "/login", element: <LoginPage /> },
  {
    path: "/app",
    element: <ProtectedRoute area="requester" />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <RequesterDashboardPage /> },
      { path: "requests", element: <MyRequestsPage /> },
      { path: "requests/new", element: <NewRequestPage /> },
      { path: "requests/:requestId", element: <RequestDetailPage /> },
      { path: "document-types", element: <DocumentCatalogPage /> },
      { path: "document-types/:docTypeId", element: <DocumentCatalogPage /> },
      { path: "profile", element: <ProfilePage /> },
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
      { path: "document-types", element: <AdminDocumentTypesRoute /> },
      { path: "turnaround-time", element: <TurnaroundTimePage /> },
      { path: "filled-forms", element: <SaFilledFormsPage /> },
      { path: "users/new", element: <AdminUsersNewPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
