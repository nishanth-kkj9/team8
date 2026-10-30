import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useDemoAuth } from "../../context/DemoAuthContext";
import { areaForProfile } from "../../lib/permissions";
import { cn } from "../../lib/cn";
import { MobileSidebar, Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const COLLAPSE_KEY = "docdesk.sidebar-collapsed.v1";

/**
 * Shared role-aware app shell (ARCHITECTURE.md §4.1): collapsible left sidebar
 * on desktop, drawer navigation on mobile, topbar with breadcrumbs & profile menu,
 * and footer branding.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { profile } = useDemoAuth();
  const area = profile ? areaForProfile(profile) : "requester";
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-800 focus:shadow-pop"
      >
        Skip to content
      </a>

      <Sidebar
        area={area}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      {drawerOpen && (
        <MobileSidebar area={area} onClose={() => setDrawerOpen(false)} />
      )}

      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]",
        )}
      >
        <Topbar area={area} onOpenMobileNav={() => setDrawerOpen(true)} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
        <footer className="border-t border-line px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-xs text-ink-400">
            DocDesk — CampusOS Academic Document Requests.
          </p>
        </footer>
      </div>
    </div>
  );
}
