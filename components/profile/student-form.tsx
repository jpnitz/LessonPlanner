"use client";

import { useState } from "react";
import type { StudentSafe } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LlmApiKeyField } from "@/components/profile/llm-api-key-field";

type StudentFormProps = {
  student?: StudentSafe;
  isNew?: boolean;
  allowDelete?: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
};

export function StudentForm({
  student,
  isNew = false,
  allowDelete = true,
  onSave,
  onDelete,
  onCancel,
}: StudentFormProps) {
  const [displayName, setDisplayName] = useState(student?.display_name ?? "");
  const [birthday, setBirthday] = useState(student?.birthday ?? "");
  const [zipCode, setZipCode] = useState(student?.zip_code ?? "");
  const [loginId, setLoginId] = useState(student?.login_id ?? "");
  const [loginEmail, setLoginEmail] = useState(student?.login_email ?? "");
  const [password, setPassword] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [clearLlmApiKey, setClearLlmApiKey] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"login_id" | "email">(
    student?.login_email ? "email" : "login_id",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload: Record<string, unknown> = {
      display_name: displayName,
      birthday,
      zip_code: zipCode,
      llm_api_key: llmApiKey,
      clear_llm_api_key: clearLlmApiKey,
    };

    if (isNew) {
      payload.password = password;
      if (loginMethod === "login_id") {
        payload.login_id = loginId;
      } else {
        payload.login_email = loginEmail;
      }
    } else if (password) {
      payload.password = password;
    }

    try {
      await onSave(payload);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("{")) {
        setErrors(JSON.parse(error.message));
      } else {
        setErrors({
          form: error instanceof Error ? error.message : "Could not save student.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm("Remove this student and their login?")) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Could not delete student.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {isNew
              ? "Add student"
              : student?.is_primary
                ? "Your student profile"
                : student?.display_name}
          </h3>
          {student?.is_primary ? (
            <p className="mt-1 text-sm text-muted">
              This is your own learner profile inside MicroSchool.
            </p>
          ) : null}
        </div>
        {!isNew && !student?.is_primary && onDelete && allowDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Removing…" : "Remove"}
          </Button>
        ) : null}
      </div>

      <Input
        label="Name"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        required
      />
      {errors.display_name ? (
        <p className="text-sm text-danger">{errors.display_name}</p>
      ) : null}

      <Input
        label="Birthday"
        type="date"
        value={birthday}
        onChange={(event) => setBirthday(event.target.value)}
        required
      />
      {errors.birthday ? (
        <p className="text-sm text-danger">{errors.birthday}</p>
      ) : null}

      <Input
        label="Zip code"
        value={zipCode}
        onChange={(event) => setZipCode(event.target.value)}
        placeholder="12345"
        required
      />
      {errors.zip_code ? (
        <p className="text-sm text-danger">{errors.zip_code}</p>
      ) : null}

      {isNew ? (
        <div className="space-y-3 rounded-md border border-border bg-surface-muted p-3">
          <p className="text-sm font-medium text-foreground">Student login</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ${
                loginMethod === "login_id"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted"
              }`}
              onClick={() => setLoginMethod("login_id")}
            >
              Login ID
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ${
                loginMethod === "email"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted"
              }`}
              onClick={() => setLoginMethod("email")}
            >
              Email
            </button>
          </div>
          {loginMethod === "login_id" ? (
            <Input
              label="Login ID"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="jamie.smith"
              required
            />
          ) : (
            <Input
              label="Email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="student@example.com"
              required
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
          />
          {errors.login ? <p className="text-sm text-danger">{errors.login}</p> : null}
          {errors.login_id ? (
            <p className="text-sm text-danger">{errors.login_id}</p>
          ) : null}
          {errors.login_email ? (
            <p className="text-sm text-danger">{errors.login_email}</p>
          ) : null}
          {errors.password ? (
            <p className="text-sm text-danger">{errors.password}</p>
          ) : null}
        </div>
      ) : !student?.is_primary ? (
        <Input
          label="New password (optional)"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Leave blank to keep current password"
          minLength={6}
        />
      ) : null}

      <LlmApiKeyField
        hasExistingKey={Boolean(student?.has_llm_api_key)}
        maskedPreview={student?.llm_api_key_masked ?? null}
        value={llmApiKey}
        onChange={setLlmApiKey}
        clearExisting={clearLlmApiKey}
        onClearExistingChange={setClearLlmApiKey}
      />

      {errors.form ? <p className="text-sm text-danger">{errors.form}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save student"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
