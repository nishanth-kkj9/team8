import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck, Loader2 } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { useToast } from "../../../context/ToastContext";
import {
  canAccessArea,
  homePathForProfile,
  type AppArea,
} from "../../../lib/permissions";
import { isValidEmail } from "../../../lib/validation";
import { Button } from "../../../components/ui/Button";
import { Field, Input } from "../../../components/ui/Field";
import { Logo } from "../../../components/ui/Logo";
import type { DemoProfile } from "../../../types/auth";

interface FieldErrors {
  email?: string;
  otp?: string;
  form?: string;
}

function areaFromPath(path: string): AppArea | null {
  const segment = path.split("/")[1];
  if (segment === "sa") return "student-affairs";
  if (segment === "admin") return "admin";
  if (segment === "app") return "requester";
  return null;
}

/** Honour the remembered target only if the signed-in profile may access it; otherwise go home. */
function targetFor(profile: DemoProfile, from?: string): string {
  if (from) {
    const area = areaFromPath(from);
    if (area && canAccessArea(area, profile)) return from;
  }
  return homePathForProfile(profile);
}

/**
 * Production Login Page. Email + OTP authentication against official CampusOS API endpoints.
 * Admin users authenticate via POST /api/v1/auth/admin/login.
 * Students, Faculty, and Office Staff authenticate via POST /api/v1/auth/login.
 */
export function DemoLoginPage() {
  const { profile, status, signInWithEmail } = useDemoAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (status === "restoring") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 aria-label="Loading DocDesk" className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (profile) {
    return <Navigate to={targetFor(profile, from)} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!isValidEmail(email)) {
      next.email = "Enter a valid email address.";
    }
    if (!otp.trim()) {
      next.otp = "Enter your OTP.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const signedIn = await signInWithEmail(email, otp);
      toast({
        title: `Signed in as ${signedIn.name}`,
        description: "CampusOS session authenticated successfully.",
        variant: "success",
      });
      navigate(targetFor(signedIn, from), { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Sign-in failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-primary-950 p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-600/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl"
        />
        <Logo className="relative text-white" />
        <div className="relative max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            CampusOS Document Requests
          </h1>
          <p className="text-sm leading-6 text-primary-100/85">
            Submit requests for official academic documents, track every step from
            pending to acknowledged, receive Student Affairs answers with attachments,
            and return filled-in forms — without repeated office visits.
          </p>
          <ul className="space-y-2 text-sm text-primary-100/85">
            {[
              "One desk for bonafide certificates, transcripts, scholarship forms and more",
              "Transparent lifecycle: pending → answered → acknowledged",
              "Turnaround expectations set by Student Affairs",
              "Secure document download and filled-form return workflow",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-200/70">
          CampusOS Academic Platform — Production Submission
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <Logo className="text-ink-900" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
              Sign in to DocDesk
            </h2>
            <p className="text-sm text-ink-500">
              Enter your registered CampusOS email and one-time password (OTP).
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card"
          >
            {errors.form && (
              <div
                role="alert"
                className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {errors.form}
              </div>
            )}
            <Field label="Email address" htmlFor="email" required error={errors.email}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@campus.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                invalid={!!errors.email}
              />
            </Field>
            <Field
              label="OTP"
              htmlFor="otp"
              required
              error={errors.otp}
            >
              <div className="relative">
                <Input
                  id="otp"
                  name="otp"
                  type={showOtp ? "text" : "password"}
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  invalid={!!errors.otp}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOtp((visible) => !visible)}
                  aria-label={showOtp ? "Hide OTP" : "Show OTP"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700"
                >
                  {showOtp ? (
                    <EyeOff aria-hidden className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
            <Button type="submit" isLoading={submitting} className="w-full">
              {!submitting && <LogIn aria-hidden className="h-4 w-4" />}
              Sign in
            </Button>
          </form>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
            <ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0" />
            Authenticated directly against official CampusOS API endpoints.
          </p>
        </div>
      </main>
    </div>
  );
}

export const LoginPage = DemoLoginPage;
