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
  UserPlus,
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
  /** Custom active check; defaults to exact pathname match. */
  isActive?: (location: NavLocation) => boolean;
}

/**
 * Role-aware navigation (ARCHITECTURE.md §4.2–4.4). Every role sees only its
 * own items — visibility derives from the signed-in profile, never from
 * scattered role checks in components.
 */
export const NAV_BY_AREA: Record<AppArea, { heading: string; items: NavItem[] }> = {
  requester: {
    heading: "Requester portal",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        to: "/app/dashboard",
        isActive: (l) => l.pathname === "/app/dashboard",
      },
      {
        label: "Request a Document",
        icon: FilePlus2,
        to: "/app/requests/new",
        isActive: (l) => l.pathname === "/app/requests/new",
      },
      {
        label: "My Requests",
        icon: FileText,
        to: "/app/requests",
        isActive: (l) => l.pathname.startsWith("/app/requests"),
      },
      {
        label: "My Profile",
        icon: UserRound,
        to: "/app/profile",
        isActive: (l) => l.pathname === "/app/profile",
      },
    ],
  },
  "student-affairs": {
    heading: "Student Affairs",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        to: "/sa/dashboard",
        isActive: (l) => l.pathname === "/sa/dashboard",
      },
      {
        label: "All Requests",
        icon: Inbox,
        to: "/sa/requests",
        isActive: (l) =>
          l.pathname === "/sa/requests" &&
          !new URLSearchParams(l.search).get("status"),
      },
      {
        label: "Pending Requests",
        icon: ClipboardList,
        to: "/sa/requests?status=pending",
        isActive: (l) =>
          l.pathname === "/sa/requests" &&
          new URLSearchParams(l.search).get("status") === "pending",
      },
      {
        label: "Answered Requests",
        icon: FileCheck2,
        to: "/sa/requests?status=answered",
        isActive: (l) =>
          l.pathname === "/sa/requests" &&
          new URLSearchParams(l.search).get("status") === "answered",
      },
      {
        label: "Filled Forms to Review",
        icon: ClipboardCheck,
        to: "/sa/filled-forms",
        isActive: (l) => l.pathname === "/sa/filled-forms",
      },
      {
        label: "Document Types",
        icon: Files,
        to: "/sa/document-types",
        isActive: (l) => l.pathname === "/sa/document-types",
      },
      {
        label: "Turnaround Time",
        icon: CalendarClock,
        to: "/sa/turnaround-time",
        isActive: (l) => l.pathname === "/sa/turnaround-time",
      },
    ],
  },
  admin: {
    heading: "Admin",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        to: "/admin/dashboard",
        isActive: (l) => l.pathname === "/admin/dashboard",
      },
      {
        label: "All Requests",
        icon: Inbox,
        to: "/admin/requests",
        isActive: (l) => l.pathname.startsWith("/admin/requests"),
      },
      {
        label: "Document Details",
        icon: Files,
        to: "/admin/document-types",
        isActive: (l) => l.pathname === "/admin/document-types",
      },
      {
        label: "Register Student",
        icon: UserPlus,
        to: "/admin/users/new",
        isActive: (l) => l.pathname === "/admin/users/new",
      },
    ],
  },
};

export function isNavItemActive(item: NavItem, location: NavLocation): boolean {
  return item.isActive ? item.isActive(location) : location.pathname === item.to;
}

/** Topbar page title for the current location. */
export function pageTitleFor(pathname: string, search: string): string {
  if (pathname === "/sa/requests") {
    const status = new URLSearchParams(search).get("status");
    if (status === "pending") return "Pending Requests";
    if (status === "answered") return "Answered Requests";
    return "All Requests";
  }
  const titles: Record<string, string> = {
    "/app/dashboard": "Dashboard",
    "/app/requests": "My Requests",
    "/app/requests/new": "Request a Document",
    "/app/profile": "My Profile",
    "/sa/dashboard": "Dashboard",
    "/sa/filled-forms": "Filled Forms to Review",
    "/sa/document-types": "Document Types",
    "/sa/turnaround-time": "Turnaround Time",
    "/admin/dashboard": "Dashboard",
    "/admin/requests": "All Requests",
    "/admin/document-types": "Document Details",
    "/admin/users/new": "Register Student",
  };
  if (titles[pathname]) return titles[pathname];
  if (/^\/(app|sa|admin)\/requests\/[^/]+$/.test(pathname)) return "Request details";
  return "DocDesk";
}
