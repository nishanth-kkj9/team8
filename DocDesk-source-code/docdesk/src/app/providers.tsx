import type { ReactNode } from "react";
import { ToastProvider } from "../context/ToastContext";
import { DemoAuthProvider } from "../context/DemoAuthContext";
import { DocDeskDataProvider } from "../context/DocDeskDataContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DemoAuthProvider>
        <DocDeskDataProvider>{children}</DocDeskDataProvider>
      </DemoAuthProvider>
    </ToastProvider>
  );
}
