"use client";

import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { CurrentTopicProvider } from "@/components/current-topic/current-topic-context";
import { MainPaneProvider } from "@/components/main-pane/main-pane-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthModalProvider>
      <CurrentTopicProvider>
        <MainPaneProvider>
          {children}
          <AuthModal />
        </MainPaneProvider>
      </CurrentTopicProvider>
    </AuthModalProvider>
  );
}
