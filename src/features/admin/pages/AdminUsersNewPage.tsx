import { useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
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
  const [showOtp, setShowOtp] = useState(false);

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

    if (!/^[A-Z0-9]{5,20}$/.test(form.usn.trim())) {
      next.usn = "USN must be 5–20 uppercase letters/digits.";
    }

    if (!form.dept.trim() || form.dept.trim().length < 2 || form.dept.trim().length > 60) {
      next.dept = "Department must be 2–60 characters.";
    }

    if (!isValidEmail(form.email_id)) {
      next.email_id = "Enter a valid email address.";
    } else if (!form.email_id.trim().toLowerCase().endsWith("@team8.com")) {
      next.email_id = "Email must use the Team 8 domain.";
    }

    if (!/^\+?\d{10,15}$/.test(form.phone_number.trim())) {
      next.phone_number = "Phone must be 10–15 digits with optional leading +.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field: keyof StudentFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setCreatedStudent(null);
    setShowOtp(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setCreatedStudent(null);
    setShowOtp(false);
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
        title: "Student created successfully",
        description: `${createdName || payload.name} (${createdEmail || payload.email_id}) was registered.`,
        variant: "success",
      });

      setForm(emptyForm);
      setErrors({});
    } catch (err) {
      let message = "Student registration failed.";
      if (err instanceof ApiError) {
        if (err.status === 409) {
          message = "This student already exists. Check the email or USN and try again.";
        } else if (err.status === 422 && err.code === "EMAIL_DOMAIN_MISMATCH") {
          message = "Only Team 8 email addresses are allowed for student registration.";
        } else if (err.status === 422 && err.code === "VALIDATION_ERROR") {
          message = "Please review the form and correct the invalid values.";
        } else if (err.status === 401) {
          message = "Your session expired. Please sign in again.";
        } else if (err.status === 403 || err.code === "FORBIDDEN") {
          message = "Only the Team 8 admin can register students.";
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

  const successMessage = useMemo(
    () => (createdStudent ? `Student ${createdStudent.name} (${createdStudent.email}) has been created.` : ""),
    [createdStudent],
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex items-start justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink-900">Register Student</h1>
          <p className="mt-1 text-sm text-ink-500">Create a CampusOS student account to provide access to DocDesk.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin-only operation
        </div>
      </header>

      {successMessage ? (
        <div className="rounded-card border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-medium">Registration successful</p>
          <p className="mt-1">{successMessage}</p>
          <p className="mt-3 text-emerald-700">
            The student signs in with their registered email and this account-specific OTP.
          </p>
          {createdStudent?.otp ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-control border border-emerald-200 bg-white px-3 py-2">
              <div>
                <p className="text-xs font-medium text-ink-500">Student sign-in OTP</p>
                <code className="text-base font-semibold tracking-widest text-ink-900">
                  {showOtp ? createdStudent.otp : "••••••"}
                </code>
              </div>
              <button
                type="button"
                onClick={() => setShowOtp((visible) => !visible)}
                aria-label={showOtp ? "Hide student OTP" : "Show student OTP"}
                className="rounded p-2 text-ink-500 hover:bg-emerald-50 hover:text-ink-800"
              >
                {showOtp ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-amber-800">
              CampusOS did not include an OTP in the response. Ask the administrator to retrieve or regenerate it.
            </p>
          )}
          <p className="mt-2 text-xs text-emerald-700">
            Share the OTP securely with the student. It is only held on this page and is not saved.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="rounded-card border border-line bg-surface p-6 shadow-card">
        {errors.form ? (
          <div role="alert" className="mb-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errors.form}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Full name" htmlFor="name" required error={errors.name}>
            <Input id="name" value={form.name} onChange={(event) => handleChange("name", event.target.value)} placeholder="Student Name" invalid={!!errors.name} />
          </Field>

          <Field label="USN" htmlFor="usn" required error={errors.usn}>
            <Input id="usn" value={form.usn} onChange={(event) => handleChange("usn", event.target.value.toUpperCase())} placeholder="1NT21CS047" invalid={!!errors.usn} />
          </Field>

          <Field label="Department" htmlFor="dept" required error={errors.dept}>
            <Input id="dept" value={form.dept} onChange={(event) => handleChange("dept", event.target.value)} placeholder="CSE" invalid={!!errors.dept} />
          </Field>

          <Field label="Email address" htmlFor="email_id" required error={errors.email_id}>
            <Input id="email_id" type="email" value={form.email_id} onChange={(event) => handleChange("email_id", event.target.value)} placeholder="student@team8.com" invalid={!!errors.email_id} />
          </Field>

          <div className="md:col-span-2">
            <Field label="Phone number" htmlFor="phone_number" required error={errors.phone_number}>
              <Input id="phone_number" value={form.phone_number} onChange={(event) => handleChange("phone_number", event.target.value)} placeholder="9876543210" invalid={!!errors.phone_number} />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/dashboard")}>Cancel</Button>
          <Button type="submit" isLoading={submitting}>
            <UserPlus className="h-4 w-4" /> Register student
          </Button>
        </div>
      </form>
    </div>
  );
}
