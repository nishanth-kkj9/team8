import type { ReactNode } from "react";
import { ToastProvider } from "../context/ToastContext";
import { DemoAuthProvider } from "../context/DemoAuthContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DemoAuthProvider>
        {children}
      </DemoAuthProvider>
    </ToastProvider>
  );
}
