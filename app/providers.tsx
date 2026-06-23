"use client";

import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { MainPaneProvider } from "@/components/main-pane/main-pane-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthModalProvider>
      <MainPaneProvider>
        {children}
        <AuthModal />
      </MainPaneProvider>
    </AuthModalProvider>
  );
}
