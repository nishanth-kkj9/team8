import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { canAccessArea, homePathForProfile } from "../../../lib/permissions";
import { isValidEmail } from "../../../lib/validation";
import { Button } from "../../../components/ui/Button";
import { Field, Input } from "../../../components/ui/Field";
import type { CampusProfile } from "../../../types/auth";

interface FieldErrors {
  email?: string;
  otp?: string;
  form?: string;
}

function areaForPath(path: string) {
  if (!path) return null;
  const first = path.split("/")[1];
  if (first === "admin") return "admin" as const;
  if (first === "sa") return "student-affairs" as const;
  if (first === "app") return "requester" as const;
  return null;
}

function targetFor(profile: CampusProfile, from?: string): string {
  if (from) {
    const area = areaForPath(from);
    if (area && canAccessArea(area, profile)) {
      return from;
    }
  }
  return homePathForProfile(profile);
}

export function LoginPage() {
  const { profile, status, signInWithEmail } = useAuth();
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
      const result = await signInWithEmail(email, otp);
      if (result.error || !result.profile) {
        setErrors({ form: result.error || "Sign-in failed." });
        return;
      }

      toast({
        title: `Signed in as ${result.profile.name}`,
        description: "CampusOS session authenticated successfully.",
        variant: "success",
      });
      navigate(targetFor(result.profile, from), { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Sign-in failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-full max-w-md flex-shrink-0 flex-col justify-between overflow-hidden bg-primary-950 p-8 text-white lg:flex">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-semibold">D</div>
            <div>
              <p className="text-lg font-semibold">DocDesk</p>
              <p className="text-xs text-primary-100/80">CampusOS</p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome to DocDesk</h1>
            <p className="text-sm leading-6 text-primary-100/80">
              Sign in with your registered email and team OTP to access your campus document requests.
            </p>
          </div>

          <div className="space-y-3 text-sm text-primary-100/80">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent-400" /> Students sign in with their registered email and account OTP.</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent-400" /> Admin signs in with admin@team8.com and the organiser-provided OTP.</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent-400" /> Roles are resolved from the server profile after login.</div>
          </div>
        </div>

        <p className="text-xs text-primary-200/70">DocDesk authentication is handled by the CampusOS API.</p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-background p-5 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <div className="flex items-center gap-2 text-primary-700">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 font-semibold">D</div>
              <span className="text-lg font-semibold text-ink-900">DocDesk</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Sign in</h2>
            <p className="text-sm text-ink-500">
              Sign in with your registered CampusOS email and account OTP. Students must ask the Admin to create their account first.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
            {errors.form && (
              <div role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errors.form}
              </div>
            )}

            <Field label="Email address" htmlFor="email" required error={errors.email}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@team8.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                invalid={!!errors.email}
              />
            </Field>

            <Field label="OTP" htmlFor="otp" required error={errors.otp}>
              <div className="relative">
                <Input
                  id="otp"
                  name="otp"
                  type={showOtp ? "text" : "password"}
                  autoComplete="one-time-code"
                  placeholder="Enter your account OTP"
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
                  {showOtp ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" isLoading={submitting} className="w-full">
              <LogIn className="h-4 w-4" /> Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-ink-500">
            Admin?{" "}
            <Link
              to="/admin/users/new"
              className="font-medium text-primary-700 hover:underline"
            >
              Sign in to register students
            </Link>
          </p>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Secure sign-in using CampusOS session validation.
          </p>
        </div>
      </main>
    </div>
  );
}
