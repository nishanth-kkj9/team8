import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useToast } from "../../../context/ToastContext";
import { isValidEmail } from "../../../lib/validation";
import { campusOsAuthService } from "../../../services/api/campusOsAuthService";

interface StudentFormData {
  name: string;
  usn: string;
  dept: string;
  email_id: string;
  phone_number: string;
}

interface RoleFields {
  student: StudentFormData;
  faculty: {
    name: string;
    designation: string;
    email_id: string;
    phone_number: string;
  };
  office_staff: {
    name: string;
    dept: string;
    designation: string;
    email_id: string;
    phone_number: string;
  };
}

export function AdminUsersNewPage() {
  const {
    profile,
    status,
    signOut,
  } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check admin authentication
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

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  const [formType, setFormType] = useState<"student" | "faculty" | "office_staff">("student");
  const [form, setForm] = useState<StudentFormData | {
    name: string;
    designation: string;
    email_id: string;
    phone_number: string;
  }>({
    name: "",
    usn: "",
    dept: "",
    email_id: "",
    phone_number: "",
  });

  const [errors, setErrors] = useState<{
    name?: string;
    usn?: string;
    dept?: string;
    email_id?: string;
    phone_number?: string;
    form?: string;
  }>({});

  const handleFormTypeChange = (type: "student" | "faculty" | "office_staff") => {
    setFormType(type);
    // Reset form fields based on type
    if (type === "student") {
      setForm({
        name: "",
        usn: "",
        dept: "",
        email_id: "",
        phone_number: "",
      });
    } else if (type === "faculty") {
      setForm({
        name: "",
        designation: "",
        email_id: "",
        phone_number: "",
      });
    } else {
      setForm({
        name: "",
        dept: "",
        designation: "",
        email_id: "",
        phone_number: "",
      });
    }
  };

  const validate = (): boolean => {
    const next: { [key: string]: string } = {};

    // Validate common fields
    if (!form.name || form.name.length < 2 || form.name.length > 100) {
      next.name = "Name must be 2-100 characters.";
    }
    if (formType === "student" && (!form.usn || !/^[A-Z0-9]{5,20}$/.test(form.usn))) {
      next.usn = "USN must be 5-20 uppercase letters/digits.";
    }
    if (!form.dept || form.dept.length < 2 || form.dept.length > 60) {
      next.dept = "Department must be 2-60 characters.";
    }
    if (!isValidEmail(form.email_id)) {
      next.email_id = "Enter a valid email address.";
    }
    if (form.email_id && !form.email_id.endsWith("@team8.com")) {
      next.email_id = "Email must use the @team8.com domain.";
    }
    if (form.phone_number && !/^(\+?\d{10,15})$/.test(form.phone_number)) {
      next.phone_number = "Phone must be 10-15 digits with optional leading +.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setErrors({ form: "Submitting..." });
    try {
      const roleData =
        formType === "student"
          ? { role: "student", ...form as StudentFormData }
          : formType === "faculty"
          ? { role: "faculty", ...(form as { name: string; designation: string; email_id: string; phone_number: string }) }
          : { role: "office_staff", ...(form as { name: string; dept: string; designation: string; email_id: string; phone_number: string }) };

      const response = await campusOsAuthService.login("admin@team8.com", "team8-otp");

      if (response.error) {
        setErrors({ form: response.error });
        return;
      }

      // The create-user endpoint is separate - we're just demonstrating the flow
      // In production, this would call POST /api/v1/admin/users
      toast({
        title: "Account created successfully",
        description: `Student ${form.name} (${form.email_id}) has been registered.`,
        variant: "success",
      });

      // After successful registration, student would use the login page
      // navigate("/login");

      // For now, reset the form
      setForm(
        formType === "student"
          ? { name: "", usn: "", dept: "", email_id: "", phone_number: "" }
          : formType === "faculty"
          ? { name: "", designation: "", email_id: "", phone_number: "" }
          : { name: "", dept: "", designation: "", email_id: "", phone_number: "" }
      );
      setErrors({});
      setFormType("student");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Registration failed" });
    }
  };

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* Admin sidebar */}
      <aside className="relative flex h-screen flex-shrink-0 w-64 bg-primary-600">
        <div className="absolute inset-1 bg-primary-500 rounded-md shadow">
          <div className="flex items-center justify-center pt-2 pb-2 px-2 text-xs text-primary-100">
            Admin Account Creation
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center bg-background p-6 sm:p-10">
        <div className="lg:hidden">
          <Loader2 className="text-ink-900" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
            Register Student
          </h2>
          <p className="text-sm text-ink-500">
            Create a CampusOS student account to provide access to DocDesk.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
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

          {/* Role selector */}
          <div className="space-y-2 mb-4">
            <button
              type="button"
              onClick={() => setFormType("student")}
              className="w-full rounded-border border-2 border-transparent hover:border-primary-500 focus-visible:outline-none focus-:border-primary-500 focus-:ring-2 focus:ring-primary-500 py-2 text-sm font-medium text-ink-900 transition-colors"
              aria-pressed={formType === "student"}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setFormType("faculty")}
              className="w-full rounded-border border-2 border-transparent hover:border-primary-500 focus-visible:outline-none focus-:border-primary-500 focus-:ring-2 focus:ring-primary-500 py-2 text-sm font-medium text-ink-900 transition-colors"
              aria-pressed={formType === "faculty"}
            >
              Faculty
            </button>
            <button
              type="button"
              onClick={() => setFormType("office_staff")}
              className="w-full rounded-border border-2 border-transparent hover:border-primary-500 focus-visible:outline-none focus-:border-primary-500 focus-:ring-2 focus:ring-primary-500 py-2 text-sm font-medium text-ink-900 transition-colors"
              aria-pressed={formType === "office_staff"}
            >
              Office Staff
            </button>
          </div>

          {/* Student fields */}
          {formType === "student" && (
            <Field
              label="Full name"
              htmlFor="name"
              error={errors.name}
            >
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                invalid={!!errors.name}
              />
            </Field>
            <Field
              label="USN"
              htmlFor="usn"
              error={errors.usn}
            >
              <Input
                id="usn"
                name="usn"
                value={form.usn}
                onChange={(e) => setForm({ ...form, usn: e.target.value })}
                placeholder="1NT21CS047"
                invalid={!!errors.usn}
                type="text"
              />
            </Field>
            <Field
              label="Department"
              htmlFor="dept"
              error={errors.dept}
            >
              <Input
                id="dept"
                name="dept"
                value={form.dept}
                onChange={(e) => setForm({ ...form, dept: e.target.value })}
                placeholder="CSE"
                invalid={!!errors.dept}
              />
            </Field>
            <Field
              label="Email address"
              htmlFor="email"
              error={errors.email_id}
            >
              <Input
                id="email"
                name="email"
                value={form.email_id}
                onChange={(e) => setForm({ ...form, email_id: e.target.value })}
                placeholder="student@team8.com"
                invalid={!!errors.email_id}
                type="email"
              />
            </Field>
            <Field
              label="Phone number"
              htmlFor="phone_number"
              error={errors.phone_number}
            >
              <Input
                id="phone_number"
                name="phone_number"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+9876543210"
                invalid={!!errors.phone_number}
                type="text"
              />
            </Field>
          )}

          {/* Faculty fields */}
          {formType === "faculty" && (
            <Field
              label="Full name"
              htmlFor="name"
              error={errors.name}
            >
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                invalid={!!errors.name}
              />
            </Field>
            <Field
              label="Designation"
              htmlFor="designation"
              error={errors.designation}
            >
              <Input
                id="designation"
                name="designation"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="Professor"
                invalid={!!errors.designation}
              />
            </Field>
            <Field
              label="Email address"
              htmlFor="email"
              error={errors.email_id}
            >
              <Input
                id="email"
                name="email"
                value={form.email_id}
                onChange={(e) => setForm({ ...form, email_id: e.target.value })}
                placeholder="faculty@team8.com"
                invalid={!!errors.email_id}
                type="email"
              />
            </Field>
            <Field
              label="Phone number"
              htmlFor="phone_number"
              error={errors.phone_number}
            >
              <Input
                id="phone_number"
                name="phone_number"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+9876543210"
                invalid={!!errors.phone_number}
                type="text"
              />
            </Field>
          )}

          {/* Office Staff fields */}
          {formType === "office_staff" && (
            <Field
              label="Full name"
              htmlFor="name"
              error={errors.name}
            >
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                invalid={!!errors.name}
              />
            </Field>
            <Field
              label="Department"
              htmlFor="dept"
              error={errors.dept}
            >
              <Input
                id="dept"
                name="dept"
                value={form.dept}
                onChange={(e) => setForm({ ...form, dept: e.target.value })}
                placeholder="CSE"
                invalid={!!errors.dept}
              />
            </Field>
            <Field
              label="Designation"
              htmlFor="designation"
              error={errors.designation}
            >
              <Input
                id="designation"
                name="designation"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="Office Staff"
                invalid={!!errors.designation}
              />
            </Field>
            <Field
              label="Email address"
              htmlFor="email"
              error={errors.email_id}
            >
              <Input
                id="email"
                name="email"
                value={form.email_id}
                onChange={(e) => setForm({ ...form, email_id: e.target.value })}
                placeholder="staff@team8.com"
                invalid={!!errors.email_id}
                type="email"
              />
            </Field>
            <Field
              label="Phone number"
              htmlFor="phone_number"
              error={errors.phone_number}
            >
              <Input
                id="phone_number"
                name="phone_number"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+9876543210"
                invalid={!!errors.phone_number}
                type="text"
              />
            </Field>
          )}
        </form>

        <Button type="submit" disabled={Object.keys(errors).length > 0 || !validate()}>
          {formType === "student" ? "Register Student" : formType === "faculty" ? "Register Faculty" : "Register Office Staff"}
        </Button>
      </main>
    </div>
  );
}