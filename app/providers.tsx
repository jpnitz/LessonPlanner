"use client";

import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { MainPaneProvider } from "@/components/main-pane/main-pane-context";
import { ProposedCurriculumProvider } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { ProposedLessonsProvider } from "@/components/proposed-lessons/proposed-lessons-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthModalProvider>
      <ProposedCurriculumProvider>
        <ProposedLessonsProvider>
          <MainPaneProvider>
            {children}
            <AuthModal />
          </MainPaneProvider>
        </ProposedLessonsProvider>
      </ProposedCurriculumProvider>
    </AuthModalProvider>
  );
}
