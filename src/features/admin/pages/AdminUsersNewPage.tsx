import { useMemo, useState, type FormEvent } from "react";
import { Check, Copy, Eye, EyeOff, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Field, Input } from "../../../components/ui/Field";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { isValidEmail } from "../../../lib/validation";
import { ApiError } from "../../../services/api/apiErrors";
import { campusOsClient } from "../../../services/api/campusOsClient";

interface StudentFormState {
  name: string;
  usn: string;
  dept: string;
  email_id: string;
  phone_number: string;
}

const emptyForm: StudentFormState = {
  name: "",
  usn: "",
  dept: "",
  email_id: "",
  phone_number: "",
};

export function AdminUsersNewPage() {
  const { profile, status } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<{
    name: string;
    email: string;
    otp?: string;
  } | null>(null);
  const [showOtp, setShowOtp] = useState(true);
  const [copied, setCopied] = useState(false);

  const adminDomain = useMemo(() => {
    if (profile?.email_id && profile.email_id.includes("@")) {
      return profile.email_id.split("@")[1]?.toLowerCase() ?? "team8.com";
    }
    return "team8.com";
  }, [profile?.email_id]);

  if (status === "restoring") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 aria-label="Loading DocDesk" className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/login" replace state={{ from: "/admin/users/new" }} />;
  }

  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.name.trim() || form.name.trim().length < 2 || form.name.trim().length > 100) {
      next.name = "Name must be 2–100 characters.";
    }

    if (!/^[A-Za-z0-9]{5,20}$/.test(form.usn.trim())) {
      next.usn = "USN must be 5–20 alphanumeric characters (e.g. 1NT22CS001).";
    }

    if (!form.dept.trim() || form.dept.trim().length < 2 || form.dept.trim().length > 60) {
      next.dept = "Department must be 2–60 characters (e.g. CSE).";
    }

    if (!isValidEmail(form.email_id)) {
      next.email_id = "Enter a valid email address.";
    } else if (
      adminDomain &&
      !form.email_id.trim().toLowerCase().endsWith(`@${adminDomain}`)
    ) {
      next.email_id = `Email must use the team domain (@${adminDomain}).`;
    }

    if (!/^\+?\d{10,15}$/.test(form.phone_number.trim())) {
      next.phone_number = "Phone number must be 10–15 digits.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field: keyof StudentFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleCopyOtp = async () => {
    if (!createdStudent?.otp) return;
    try {
      await navigator.clipboard.writeText(createdStudent.otp);
      setCopied(true);
      toast({
        title: "OTP copied to clipboard",
        description: `Student OTP: ${createdStudent.otp}`,
        variant: "success",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Could not copy",
        description: "Please select and copy the OTP manually.",
        variant: "error",
      });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setCreatedStudent(null);
    setCopied(false);
    setSubmitting(true);

    try {
      const payload = {
        role: "student",
        name: form.name.trim(),
        usn: form.usn.trim().toUpperCase(),
        dept: form.dept.trim(),
        email_id: form.email_id.trim().toLowerCase(),
        phone_number: form.phone_number.trim(),
      };

      const response = await campusOsClient.post<{
        user?: Record<string, unknown>;
        name?: unknown;
        email_id?: unknown;
        otp?: unknown;
      }>("/admin/users", payload);

      const userPayload = response?.user ?? response ?? {};
      const createdName = String(userPayload.name ?? payload.name).trim();
      const createdEmail = String(userPayload.email_id ?? payload.email_id).trim();
      const createdOtp = userPayload.otp == null ? "" : String(userPayload.otp);

      setCreatedStudent({
        name: createdName || payload.name,
        email: createdEmail || payload.email_id,
        ...(createdOtp ? { otp: createdOtp } : {}),
      });

      toast({
        title: "Student registered successfully",
        description: `Generated OTP for ${createdName || payload.name}`,
        variant: "success",
      });

      setForm(emptyForm);
      setErrors({});
    } catch (err) {
      let message = "Student registration failed.";
      if (err instanceof ApiError) {
        if (err.status === 409) {
          message = "This student already exists. Check the email or USN.";
        } else if (err.status === 422 && err.code === "EMAIL_DOMAIN_MISMATCH") {
          message = `Email domain must match the team domain (@${adminDomain}).`;
        } else if (err.status === 422 && err.code === "VALIDATION_ERROR") {
          message = "Please review the form and correct the invalid values.";
        } else if (err.status === 401) {
          message = "Your session expired. Please sign in again.";
        } else if (err.status === 403 || err.code === "FORBIDDEN") {
          message = "Only the Admin can register students.";
        } else {
          message = err.message;
        }
      }
      setErrors({ form: message });
      toast({
        title: "Registration failed",
        description: message,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs text-ink-500">
            <Link to="/admin/dashboard" className="hover:text-ink-800">Admin</Link>
            <span className="mx-1.5 text-ink-400">/</span>
            <span className="text-ink-800 font-medium">Register Student</span>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Register Student & Generate OTP</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Create an official student account and obtain the sign-in OTP for DocDesk access.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 sm:self-auto">
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin-only
        </div>
      </header>

      {createdStudent && (
        <div className="rounded-card border-2 border-emerald-300 bg-emerald-50/80 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold">
              ✓
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-emerald-950">
                  Registration Successful!
                </h2>
                <p className="mt-0.5 text-sm text-emerald-800">
                  Student <strong>{createdStudent.name}</strong> (<code>{createdStudent.email}</code>) is registered.
                </p>
              </div>

              {createdStudent.otp ? (
                <div className="rounded-control border border-emerald-300 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                        Generated Student Sign-in OTP
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <code className="text-2xl font-mono font-bold tracking-widest text-emerald-800">
                          {showOtp ? createdStudent.otp : "••••••"}
                        </code>
                        <button
                          type="button"
                          onClick={() => setShowOtp(!showOtp)}
                          aria-label={showOtp ? "Hide OTP" : "Show OTP"}
                          className="rounded p-1.5 text-ink-500 hover:bg-slate-100"
                        >
                          {showOtp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="inline-flex items-center gap-2 rounded-control bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied!" : "Copy OTP"}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-ink-600">
                    Give this OTP and their email (<code>{createdStudent.email}</code>) to the student. They will enter it on the DocDesk Sign-in page.
                  </p>
                </div>
              ) : (
                <div className="rounded-control border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Student created, but backend OTP was not returned directly. The student can sign in with the team-wide OTP.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="rounded-card border border-line bg-surface p-6 shadow-card space-y-6">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Student Profile Information</h2>
          <p className="text-xs text-ink-500">All fields are required by CampusOS to register a student.</p>
        </div>

        {errors.form && (
          <div role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errors.form}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Full name" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Riya Sharma"
              invalid={!!errors.name}
            />
          </Field>

          <Field label="USN" htmlFor="usn" required error={errors.usn} hint="5–20 alphanumeric chars">
            <Input
              id="usn"
              value={form.usn}
              onChange={(e) => handleChange("usn", e.target.value.toUpperCase())}
              placeholder="e.g. 1NT22CS001"
              invalid={!!errors.usn}
            />
          </Field>

          <Field label="Department" htmlFor="dept" required error={errors.dept}>
            <Input
              id="dept"
              value={form.dept}
              onChange={(e) => handleChange("dept", e.target.value)}
              placeholder="e.g. CSE"
              invalid={!!errors.dept}
            />
          </Field>

          <Field
            label="Email address"
            htmlFor="email_id"
            required
            error={errors.email_id}
            hint={`Must end with @${adminDomain}`}
          >
            <Input
              id="email_id"
              type="email"
              value={form.email_id}
              onChange={(e) => handleChange("email_id", e.target.value)}
              placeholder={`student@${adminDomain}`}
              invalid={!!errors.email_id}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Phone number" htmlFor="phone_number" required error={errors.phone_number} hint="10–15 digits">
              <Input
                id="phone_number"
                type="tel"
                value={form.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="9876543210"
                invalid={!!errors.phone_number}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/dashboard")}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            <UserPlus className="h-4 w-4" />
            Register Student & Generate OTP
          </Button>
        </div>
      </form>
    </div>
  );
}
