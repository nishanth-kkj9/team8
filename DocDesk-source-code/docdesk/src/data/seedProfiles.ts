import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  GraduationCap,
  HeartHandshake,
  Presentation,
  ShieldCheck,
} from "lucide-react";
import type { DemoProfile, DemoRoleKey } from "../types/auth";

export const TEAM_ID = "campus-team-01";

/**
 * Seed profiles for the five demo logins (ARCHITECTURE.md §7.1).
 * Student Affairs is an office_staff profile whose dept is "Student Affairs".
 */
export const seedProfiles: Record<DemoRoleKey, DemoProfile> = {
  student: {
    role: "student",
    team_id: TEAM_ID,
    name: "Asha Kumar",
    email_id: "asha.kumar@campus.edu",
    phone_number: "+91 98450 12345",
    usn: "1NT21CS047",
    dept: "CSE",
  },
  faculty: {
    role: "faculty",
    team_id: TEAM_ID,
    name: "Meera Rao",
    email_id: "meera.rao@campus.edu",
    phone_number: "+91 98450 23456",
    designation: "Associate Professor",
  },
  office_staff: {
    role: "office_staff",
    team_id: TEAM_ID,
    name: "Suresh Babu",
    email_id: "suresh.babu@campus.edu",
    phone_number: "+91 98450 34567",
    dept: "Accounts",
    designation: "Senior Accountant",
  },
  student_affairs: {
    role: "office_staff",
    team_id: TEAM_ID,
    name: "Ravi Shetty",
    email_id: "ravi.shetty@campus.edu",
    phone_number: "+91 98450 45678",
    dept: "Student Affairs",
    designation: "Student Affairs Officer",
  },
  admin: {
    role: "admin",
    team_id: TEAM_ID,
    name: "Vikram Desai",
    email_id: "admin@campus.edu",
    phone_number: "+91 98450 00001",
    institution_name: "Campus Institute of Technology",
  },
};

export interface DemoAccountOption {
  key: DemoRoleKey;
  label: string;
  persona: string;
  hint: string;
  icon: LucideIcon;
  profile: DemoProfile;
}

/** Demo login shortcuts — clearly labelled demo-only on the login screen. */
export const demoAccounts: DemoAccountOption[] = [
  {
    key: "student",
    label: "Student",
    persona: "Asha Kumar",
    hint: "CSE undergraduate · requests own documents",
    icon: GraduationCap,
    profile: seedProfiles.student,
  },
  {
    key: "faculty",
    label: "Faculty",
    persona: "Meera Rao",
    hint: "Associate Professor · requester",
    icon: Presentation,
    profile: seedProfiles.faculty,
  },
  {
    key: "office_staff",
    label: "Office Staff",
    persona: "Suresh Babu",
    hint: "Accounts department · requester",
    icon: Briefcase,
    profile: seedProfiles.office_staff,
  },
  {
    key: "student_affairs",
    label: "Student Affairs",
    persona: "Ravi Shetty",
    hint: "Office Staff (Student Affairs) · answers requests",
    icon: HeartHandshake,
    profile: seedProfiles.student_affairs,
  },
  {
    key: "admin",
    label: "Admin",
    persona: "Vikram Desai",
    hint: "Institution admin · read-only in DocDesk",
    icon: ShieldCheck,
    profile: seedProfiles.admin,
  },
];
