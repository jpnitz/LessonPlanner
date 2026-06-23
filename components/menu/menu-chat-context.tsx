"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ChatMessage } from "@/types/curriculum";

export type MenuChatMode = "idle" | "standard" | "create_curriculum";

type MenuChatContextValue = {
  messages: ChatMessage[];
  chatMode: MenuChatMode;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setChatMode: (mode: MenuChatMode) => void;
  resetChat: () => void;
  markStandardChat: () => void;
  markCreateCurriculum: () => void;
};

const MenuChatContext = createContext<MenuChatContextValue | null>(null);

export function MenuChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatMode, setChatMode] = useState<MenuChatMode>("idle");

  const resetChat = useCallback(() => {
    setMessages([]);
    setChatMode("idle");
  }, []);

  const markStandardChat = useCallback(() => {
    setChatMode("standard");
  }, []);

  const markCreateCurriculum = useCallback(() => {
    setChatMode("create_curriculum");
  }, []);

  const value = useMemo(
    () => ({
      messages,
      chatMode,
      setMessages,
      setChatMode,
      resetChat,
      markStandardChat,
      markCreateCurriculum,
    }),
    [
      messages,
      chatMode,
      resetChat,
      markStandardChat,
      markCreateCurriculum,
    ],
  );

  return (
    <MenuChatContext.Provider value={value}>{children}</MenuChatContext.Provider>
  );
}

export function useMenuChat() {
  const context = useContext(MenuChatContext);
  if (!context) {
    throw new Error("useMenuChat must be used within MenuChatProvider");
  }
  return context;
}
