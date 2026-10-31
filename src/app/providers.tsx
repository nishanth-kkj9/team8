import type { ReactNode } from "react";
import { ToastProvider } from "../context/ToastContext";
import { AuthProvider } from "../context/AuthContext";
import { DocDeskDataProvider } from "../context/DocDeskDataContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <DocDeskDataProvider>{children}</DocDeskDataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
