"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveStudentLoginEmail } from "@/lib/profile/student-auth";

export function AuthModal() {
  const router = useRouter();
  const { isOpen, mode, closeAuth, setMode } = useAuthModal();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState<"parent" | "student">("parent");
  const [studentLogin, setStudentLogin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setLoginRole("parent");
    setStudentLogin("");
    setError(null);
    setMessage(null);
    setLoading(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAuth();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeAuth]);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    let supabase;
    try {
      supabase = createClient();
    } catch (configError) {
      setError(
        configError instanceof Error
          ? configError.message
          : "Supabase is not configured.",
      );
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.refresh();
        closeAuth();
        setLoading(false);
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account, then log in.",
      );
      setMode("login");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:
        loginRole === "student"
          ? resolveStudentLoginEmail(studentLogin)
          : email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    closeAuth();
    setLoading(false);
  }

  function handleGoogleStub() {
    setError(null);
    setMessage(
      "Google sign-in will be wired in a later phase. Use email and password for now.",
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        resetForm();
        closeAuth();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-md"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-semibold text-foreground">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {mode === "signup"
                ? "Sign up as a parent or teacher."
                : "Log in to your MicroSchool account."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              closeAuth();
            }}
            className="rounded-md p-1 text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex rounded-md border border-border bg-surface-muted p-1">
          <button
            type="button"
            className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
            onClick={() => {
              resetForm();
              setMode("login");
            }}
          >
            Log in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
            onClick={() => {
              resetForm();
              setMode("signup");
            }}
          >
            Sign up
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <Input
              label="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Smith"
              required
              autoComplete="name"
            />
          ) : (
            <div className="flex rounded-md border border-border bg-surface-muted p-1">
              <button
                type="button"
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium ${
                  loginRole === "parent"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted"
                }`}
                onClick={() => setLoginRole("parent")}
              >
                Parent / teacher
              </button>
              <button
                type="button"
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium ${
                  loginRole === "student"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted"
                }`}
                onClick={() => setLoginRole("student")}
              >
                Student
              </button>
            </div>
          )}

          {mode === "login" && loginRole === "student" ? (
            <Input
              label="Login ID or email"
              value={studentLogin}
              onChange={(event) => setStudentLogin(event.target.value)}
              placeholder="jamie.smith or student@example.com"
              required
              autoComplete="username"
            />
          ) : (
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          )}

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />

          {error ? (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-hover">
              {message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Log in"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={handleGoogleStub}
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
