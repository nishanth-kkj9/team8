import { Link, useLocation } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useDemoAuth } from "../../context/DemoAuthContext";
import { homePathForProfile, type AppArea } from "../../lib/permissions";
import { initials, roleLine } from "../../lib/display";
import { cn } from "../../lib/cn";
import { Logo } from "../ui/Logo";
import { NAV_BY_AREA, isNavItemActive } from "./navConfig";

const DESKTOP_WIDTH = "lg:w-[264px]";
const DESKTOP_WIDTH_COLLAPSED = "lg:w-[76px]";

interface SidebarProps {
  area: AppArea;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Mobile drawer variant. */
  isMobile?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  area,
  collapsed,
  onToggleCollapsed,
  isMobile = false,
  onClose,
}: SidebarProps) {
  const location = useLocation();
  const { profile } = useDemoAuth();
  const nav = NAV_BY_AREA[area];
  const iconOnly = collapsed && !isMobile;
  const current = { pathname: location.pathname, search: location.search };

  return (
    <div className="flex h-full flex-col bg-primary-950 text-primary-100">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/10",
          iconOnly ? "justify-center" : "justify-between px-5",
        )}
      >
        <Link
          to={homePathForProfile(profile)}
          onClick={onClose}
          aria-label="DocDesk home"
          className="min-w-0"
        >
          <Logo markOnly={iconOnly} className="text-white" />
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-control p-1.5 text-primary-200 hover:bg-white/10 hover:text-white"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav
        aria-label={`${nav.heading} navigation`}
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {!iconOnly && (
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-300/80">
            {nav.heading}
          </p>
        )}
        <ul className="space-y-1">
          {nav.items.map((item) => {
            const active = isNavItemActive(item, current);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  title={iconOnly ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
                    iconOnly && "justify-center px-0",
                    active
                      ? "bg-accent-600 font-medium text-white shadow-sm"
                      : "text-primary-100/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
                  {!iconOnly && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        {!iconOnly && profile && (
          <div className="mb-2 flex items-center gap-3 rounded-control bg-white/5 px-3 py-2">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-600/80 text-xs font-semibold text-white"
            >
              {initials(profile.name)}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-xs font-medium text-white">
                {profile.name}
              </span>
              <span className="block truncate text-[11px] text-primary-200/80">
                {roleLine(profile)}
              </span>
            </span>
          </div>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-3 rounded-control px-3 py-2 text-xs text-primary-200/80 transition-colors hover:bg-white/10 hover:text-white",
              iconOnly && "justify-center px-0",
            )}
          >
            {iconOnly ? (
              <PanelLeftOpen aria-hidden className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose aria-hidden className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden lg:block",
        props.collapsed ? DESKTOP_WIDTH_COLLAPSED : DESKTOP_WIDTH,
      )}
    >
      <SidebarContent {...props} />
    </aside>
  );
}

export function MobileSidebar(props: Omit<SidebarProps, "collapsed" | "onToggleCollapsed">) {
  // The AppShell closes this drawer automatically when the route changes.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="fixed inset-0 z-50 lg:hidden"
    >
      <div
        aria-hidden
        onClick={props.onClose}
        className="absolute inset-0 bg-primary-950/50 backdrop-blur-[2px]"
      />
      <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-pop">
        <SidebarContent {...props} collapsed={false} onToggleCollapsed={() => undefined} isMobile />
      </div>
    </div>
  );
}
