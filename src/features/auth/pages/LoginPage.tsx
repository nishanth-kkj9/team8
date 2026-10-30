import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck, Loader2 } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { isValidEmail } from "../../../lib/validation";
import { Button } from "../../../components/ui/Button";
import { Field, Input } from "../../../components/ui/Field";
import { Logo } from "../../../components/ui/Logo";
import type { CampusProfile } from "../../../types/auth";

interface FieldErrors {
  email?: string;
  otp?: string;
  form?: string;
}

/** Honour the remembered target only if the signed-in profile may access it; otherwise go home. */
function areaFromPath(path: string): "student-affairs" | "admin" | "requester" | null {
  const segment = path.split("/")[1];
  if (segment === "sa") return "student-affairs";
  if (segment === "admin") return "admin";
  if (segment === "app") return "requester";
  return null;
}

/** Production Login Page. Email + OTP authentication against official CampusOS API endpoints. */
export function LoginPage() {
  const {
    profile,
    status,
    signInWithEmail,
    signOut,
  } = useAuth();
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
        <Loader2
          aria-label="Loading DocDesk"
          className="h-6 w-6 animate-spin text-primary-600"
        />
      </div>
    );
  }

  if (profile) {
    return <Navigate to={"/app/dashboard"} replace />;
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

      if (result.error) {
        setErrors({ form: result.error });
      } else if (result.profile) {
        toast({
          title: `Signed in as ${result.profile.name}`,
          description: "CampusOS session authenticated successfully.",
          variant: "success",
        });
        navigate("/app/dashboard", { replace: true });
      } else {
        setErrors({ form: "Sign-in failed - no profile received." });
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Sign-in failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="relative flex h-screen flex-shrink-0 w-64 bg-primary-600">
        <div
          className="absolute inset-1 bg-primary-500 rounded-md shadow"
        >
          <div className="flex items-center justify-center pt-2 pb-2 px-2 text-xs text-primary-100">
            Authenticated directly against official CampusOS API endpoints.
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center bg-background p-6 sm:p-10">
        <div className="lg:hidden">
          <Logo className="text-ink-900" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
            Welcome back
          </h2>
          <p className="text-sm text-ink-500">
            Sign in to access your campus document services.
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
          <Field
            label="Email address"
            htmlFor="email"
            required
            error={errors.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@team8.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                placeholder="Enter your team OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                invalid={!!errors.otp}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOtp((visible) => !visible)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700"
                aria-label={showOtp ? "Hide OTP" : "Show OTP"}
              >
                <EyeOff className="h-4 w-4" />
              </button>
            </div>
          </Field>
          <Button type="submit" isLoading={submitting} className="w-full">
            <LogIn className="h-4 w-4" /> Sign in
          </Button>
        </form>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          Authenticated directly against official CampusOS API endpoints.
        </p>
      </main>
    </div>
  );
}

export const LoginPage = LoginPage;