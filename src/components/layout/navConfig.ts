import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FilePlus2,
  FileText,
  Files,
  Inbox,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import type { AppArea } from "../../lib/permissions";

export interface NavLocation {
  pathname: string;
  search: string;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  isActive?: (location: NavLocation) => boolean;
}

export const NAV_BY_AREA: Record<AppArea, { heading: string; items: NavItem[] }> = {
  requester: {
    heading: "Student",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/app/dashboard" },
      { label: "Request a Document", icon: FilePlus2, to: "/app/requests/new" },
      { label: "Document Types", icon: Files, to: "/app/document-types", isActive: (l) => l.pathname.startsWith("/app/document-types") },
      { label: "My Requests", icon: FileText, to: "/app/requests", isActive: (l) => l.pathname.startsWith("/app/requests") },
      { label: "My Profile", icon: UserRound, to: "/app/profile" },
    ],
  },
  admin: {
    heading: "Admin",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/admin/dashboard" },
      {
        label: "All Requests",
        icon: Inbox,
        to: "/admin/requests",
        isActive: (l) => l.pathname === "/admin/requests" && !new URLSearchParams(l.search).get("status"),
      },
      {
        label: "Pending Requests",
        icon: ClipboardList,
        to: "/admin/requests?status=pending",
        isActive: (l) => l.pathname === "/admin/requests" && new URLSearchParams(l.search).get("status") === "pending",
      },
      {
        label: "Answered Requests",
        icon: FileCheck2,
        to: "/admin/requests?status=answered",
        isActive: (l) => l.pathname === "/admin/requests" && new URLSearchParams(l.search).get("status") === "answered",
      },
      { label: "Filled Forms to Review", icon: ClipboardCheck, to: "/admin/filled-forms" },
      { label: "Document Types", icon: Files, to: "/admin/document-types" },
      { label: "Turnaround Time", icon: CalendarClock, to: "/admin/turnaround-time" },
    ],
  },
};

export function isNavItemActive(item: NavItem, location: NavLocation): boolean {
  return item.isActive ? item.isActive(location) : location.pathname === item.to;
}

export function pageTitleFor(pathname: string, search: string): string {
  if (pathname === "/admin/requests") {
    const status = new URLSearchParams(search).get("status");
    if (status === "pending") return "Pending Requests";
    if (status === "answered") return "Answered Requests";
    return "All Requests";
  }
  const titles: Record<string, string> = {
    "/app/dashboard": "Dashboard",
    "/app/requests": "My Requests",
    "/app/requests/new": "Request a Document",
    "/app/document-types": "Document Types",
    "/app/profile": "My Profile",
    "/admin/dashboard": "Dashboard",
    "/admin/filled-forms": "Filled Forms to Review",
    "/admin/document-types": "Document Types",
    "/admin/turnaround-time": "Turnaround Time",
    "/admin/users/new": "Create Account",
  };
  if (titles[pathname]) return titles[pathname];
  if (/^\/app\/document-types\/[^/]+$/.test(pathname)) return "Document Type details";
  if (/^\/(app|admin)\/requests\/[^/]+$/.test(pathname)) return "Request details";
  return "DocDesk";
}
