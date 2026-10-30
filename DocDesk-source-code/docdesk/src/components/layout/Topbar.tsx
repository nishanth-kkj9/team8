import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HelpCircle, LogOut, Menu, RotateCcw, UserRound } from "lucide-react";
import { useDemoAuth } from "../../context/DemoAuthContext";
import { useDocDeskData } from "../../context/DocDeskDataContext";
import { useToast } from "../../context/ToastContext";
import { mockDocDeskService } from "../../services/serviceProvider";
import { AREA_LABELS, type AppArea } from "../../lib/permissions";
import { initials, roleLine } from "../../lib/display";
import { Button } from "../ui/Button";
import { DemoChip } from "../ui/DemoChip";
import { Modal } from "../ui/Modal";
import { pageTitleFor } from "./navConfig";

const AREA_TITLES: Record<AppArea, string> = {
  requester: "Requester portal",
  "student-affairs": "Student Affairs",
  admin: "Admin",
};

interface TopbarProps {
  area: AppArea;
  onOpenMobileNav: () => void;
}

export function Topbar({ area, onOpenMobileNav }: TopbarProps) {
  const { profile, signOut } = useDemoAuth();
  const { refresh } = useDocDeskData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the profile menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  // Close the profile menu on route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  const onReset = async () => {
    setResetOpen(false);
    setResetting(true);
    try {
      await mockDocDeskService.resetDemoData();
      await refresh();
      toast({
        title: "Demo data reset",
        description: "Seed requests and document types were restored.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Reset failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="rounded-control p-2 text-ink-500 hover:bg-primary-50 hover:text-primary-800 lg:hidden"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1.5 text-sm text-ink-500">
            <li className="hidden sm:block">{AREA_TITLES[area]}</li>
            <li aria-hidden className="hidden text-ink-400 sm:block">
              /
            </li>
            <li aria-current="page" className="truncate font-medium text-ink-800">
              {pageTitleFor(location.pathname, location.search)}
            </li>
          </ol>
        </nav>

        <DemoChip />

        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="About this demo"
          className="rounded-control p-2 text-ink-500 hover:bg-primary-50 hover:text-primary-800"
        >
          <HelpCircle aria-hidden className="h-5 w-5" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-control border border-line bg-surface py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-primary-50"
          >
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-700 text-[11px] font-semibold text-white"
            >
              {initials(profile?.name ?? "?")}
            </span>
            <span className="hidden max-w-[160px] truncate text-sm font-medium text-ink-700 sm:block">
              {profile?.name}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Profile menu"
              className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-card border border-line bg-surface p-2 shadow-pop"
            >
              <div className="border-b border-line px-3 pb-3 pt-2">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {profile?.name}
                </p>
                <p className="truncate text-xs text-ink-500">{profile?.email_id}</p>
                {profile && (
                  <p className="mt-1 text-xs text-ink-500">{roleLine(profile)}</p>
                )}
              </div>
              {area === "requester" && (
                <Link
                  to="/app/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 flex items-center gap-2 rounded-control px-3 py-2 text-sm text-ink-700 hover:bg-primary-50"
                >
                  <UserRound aria-hidden className="h-4 w-4 text-ink-500" />
                  My Profile
                </Link>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setResetOpen(true);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-ink-700 hover:bg-primary-50"
              >
                <RotateCcw aria-hidden className="h-4 w-4 text-ink-500" />
                Reset demo data
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  signOut();
                  navigate("/login");
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="About this DocDesk demo">
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            DocDesk is the CampusOS academic document request desk. This build is a
            <strong> frontend-only demo</strong> — no backend or CampusOS API is called.
          </li>
          <li>
            Signed in as <strong>{profile?.name}</strong> — {AREA_LABELS[area]}.
          </li>
          <li>All data is mock data persisted in this browser. Use the profile menu → “Reset demo data” to restore the seed dataset.</li>
          <li>
            The only request statuses are <em>pending</em>, <em>answered</em> and{" "}
            <em>acknowledged</em>; Admin is read-only in DocDesk.
          </li>
        </ul>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={resetting} onClick={onReset}>
              Reset demo data
            </Button>
          </>
        }
      >
        <p>
          This restores the original demo requests and document types in this browser.
          Your sign-in stays active. The CampusOS API is not affected — this build never
          contacts a server.
        </p>
      </Modal>
    </header>
  );
}
