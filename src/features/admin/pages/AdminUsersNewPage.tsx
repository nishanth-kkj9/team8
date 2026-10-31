import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Field, Input, Select } from "../../../components/ui/Field";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { isValidEmail } from "../../../lib/validation";
import { ApiError } from "../../../services/api/apiErrors";
import { campusOsClient } from "../../../services/api/campusOsClient";

type UserRole = "student" | "faculty" | "office_staff";
type AccountFields = { name: string; usn: string; dept: string; designation: string; email_id: string; phone_number: string };
const empty: AccountFields = { name: "", usn: "", dept: "", designation: "", email_id: "", phone_number: "" };

export function AdminUsersNewPage() {
  const { profile, status } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("student");
  const [form, setForm] = useState<AccountFields>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; otp?: string } | null>(null);
  const teamDomain = useMemo(() => profile?.email_id.split("@")[1]?.toLowerCase() ?? "", [profile?.email_id]);

  if (status === "restoring") return <div className="p-8 text-center">Validating CampusOS session…</div>;
  if (!profile || profile.role !== "admin") return <Navigate to="/login" replace state={{ from: "/admin/users/new" }} />;

  const set = (key: keyof AccountFields, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "", form: "" }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 100) next.name = "Name must be 2–100 characters.";
    if (role === "student" && !/^[A-Za-z0-9]{5,20}$/.test(form.usn.trim())) next.usn = "USN must be 5–20 letters or digits.";
    if ((role === "student" || role === "office_staff") && (form.dept.trim().length < 2 || form.dept.trim().length > 60)) next.dept = "Department must be 2–60 characters.";
    if ((role === "faculty" || role === "office_staff") && (form.designation.trim().length < 2 || form.designation.trim().length > 60)) next.designation = "Designation must be 2–60 characters.";
    if (!isValidEmail(form.email_id)) next.email_id = "Enter a valid email address.";
    else if (teamDomain && form.email_id.trim().toLowerCase().split("@")[1] !== teamDomain) next.email_id = `Email must use @${teamDomain}.`;
    if (!/^\+?\d{10,15}$/.test(form.phone_number.trim())) next.phone_number = "Phone number must be 10–15 digits, with an optional leading +.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      role,
      name,
      email_id: form.email_id.trim().toLowerCase(),
      phone_number: form.phone_number.trim(),
      ...(role === "student" ? { usn: form.usn.trim().toUpperCase(), dept: form.dept.trim() } : {}),
      ...(role === "faculty" ? { designation: form.designation.trim() } : {}),
      ...(role === "office_staff" ? { dept: form.dept.trim(), designation: form.designation.trim() } : {}),
    };
    setBusy(true);
    setCreated(null);
    try {
      const response = await campusOsClient.post<Record<string, unknown> | { user: Record<string, unknown> }>("/admin/users", payload);
      const account = ("user" in response ? response.user : response) as Record<string, unknown>;
      setCreated({ name: String(account.name ?? name), email: String(account.email_id ?? payload.email_id), ...(account.otp != null ? { otp: String(account.otp) } : {}) });
      setForm(empty);
      toast({ title: "Campus account created", description: `${ROLE_LABEL[role]} account created for ${payload.email_id}.`, variant: "success" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Account creation failed. Check your connection and retry.";
      setErrors({ form: message });
      toast({ title: "Account creation failed", description: message, variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  return <div className="mx-auto max-w-2xl space-y-6">
    <header className="rounded-card border border-line bg-surface p-5 shadow-card">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-500"><Link to="/admin/dashboard">Admin</Link><span className="mx-2">/</span>Create Campus Account</nav>
      <h1 className="mt-2 text-2xl font-semibold text-ink-900">Create Campus Account</h1>
      <p className="mt-1 text-sm text-ink-500">Provision a Student, Faculty, or Office Staff account in CampusOS. Student Affairs uses Office Staff with department “Student Affairs”.</p>
    </header>
    {created && <section aria-live="polite" className="rounded-card border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-950">
      <h2 className="font-semibold">Account created</h2><p className="mt-1">{created.name} · {created.email}</p>
      {created.otp && <div className="mt-3 rounded border border-emerald-200 bg-white p-3"><p className="text-xs font-medium">Team sign-in OTP (shared by CampusOS)</p><code className="mt-1 block text-lg font-semibold">{created.otp}</code><p className="mt-1 text-xs">This is the team OTP returned by the API, not a unique credential for this account.</p></div>}
      <button type="button" className="mt-3 text-xs underline" onClick={() => setCreated(null)}>Dismiss</button>
    </section>}
    <form onSubmit={submit} noValidate className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
      {errors.form && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}
      <Field label="Account role" htmlFor="account-role" required><Select id="account-role" value={role} onChange={(e) => { setRole(e.target.value as UserRole); setForm(empty); setErrors({}); }}><option value="student">Student</option><option value="faculty">Faculty</option><option value="office_staff">Office Staff</option></Select></Field>
      <Field label="Full name" htmlFor="name" required error={errors.name}><Input id="name" value={form.name} maxLength={100} onChange={(e) => set("name", e.target.value)} /></Field>
      {role === "student" && <Field label="USN" htmlFor="usn" required error={errors.usn}><Input id="usn" value={form.usn} maxLength={20} onChange={(e) => set("usn", e.target.value)} /></Field>}
      {(role === "student" || role === "office_staff") && <Field label="Department" htmlFor="dept" required error={errors.dept} hint={role === "office_staff" ? "Enter Student Affairs for DocDesk staff access." : undefined}><Input id="dept" value={form.dept} maxLength={60} onChange={(e) => set("dept", e.target.value)} /></Field>}
      {(role === "faculty" || role === "office_staff") && <Field label="Designation" htmlFor="designation" required error={errors.designation}><Input id="designation" value={form.designation} maxLength={60} onChange={(e) => set("designation", e.target.value)} /></Field>}
      <Field label="Campus email" htmlFor="email" required error={errors.email_id} hint={teamDomain ? `Must use @${teamDomain}.` : undefined}><Input id="email" type="email" value={form.email_id} onChange={(e) => set("email_id", e.target.value)} /></Field>
      <Field label="Phone number" htmlFor="phone" required error={errors.phone_number}><Input id="phone" type="tel" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} /></Field>
      <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => navigate("/admin/dashboard")}>Cancel</Button><Button type="submit" isLoading={busy}>Create account</Button></div>
    </form>
  </div>;
}

const ROLE_LABEL: Record<UserRole, string> = { student: "Student", faculty: "Faculty", office_staff: "Office Staff" };
