"use client";

import { useState } from "react";
import type { Profile, StudentSafe } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StudentForm } from "@/components/profile/student-form";
import { useMainPane } from "@/components/main-pane/main-pane-context";

type ProfilePaneProps = {
  initialProfile: Profile;
  initialEmail: string;
  initialStudents: StudentSafe[];
  isStudentAccount: boolean;
};

async function parseApiError(response: Response) {
  const data = await response.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }
  throw new Error(data.error ?? "Request failed.");
}

export function ProfilePane({
  initialProfile,
  initialEmail,
  initialStudents,
  isStudentAccount,
}: ProfilePaneProps) {
  const { openProfile } = useMainPane();
  const [fullName, setFullName] = useState(initialProfile.full_name);
  const [students, setStudents] = useState(initialStudents);
  const [addingStudent, setAddingStudent] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  async function refreshStudents() {
    const response = await fetch("/api/students");
    if (!response.ok) throw new Error("Could not refresh students.");
    const data = await response.json();
    setStudents(data.students);
  }

  async function handleProfileSave(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });

    setSavingProfile(false);

    if (!response.ok) {
      const data = await response.json();
      setProfileError(data.error ?? "Could not save profile.");
      return;
    }

    const data = await response.json();
    setFullName(data.profile.full_name);
    setProfileMessage("Your account info was saved.");
  }

  async function handleStudentSave(
    studentId: string | null,
    payload: Record<string, unknown>,
  ) {
    const response = await fetch(
      studentId ? `/api/students/${studentId}` : "/api/students",
      {
        method: studentId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) await parseApiError(response);

    setAddingStudent(false);
    await refreshStudents();
    openProfile();
  }

  async function handleStudentDelete(studentId: string) {
    const response = await fetch(`/api/students/${studentId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error ?? "Could not delete student.");
    }

    await refreshStudents();
  }

  const primaryStudent = students.find((student) => student.is_primary);
  const additionalStudents = students.filter((student) => !student.is_primary);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="mt-2 text-sm text-muted">
          Manage your account and student profiles. Birthday and zip code are
          required before any student profile can be saved.
        </p>
      </div>

      {!isStudentAccount ? (
        <form
          onSubmit={handleProfileSave}
          className="space-y-4 rounded-lg border border-border bg-surface p-4"
        >
          <h2 className="text-base font-semibold text-foreground">Your account</h2>
          <Input label="Email" value={initialEmail} disabled />
          <Input
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          {profileError ? <p className="text-sm text-danger">{profileError}</p> : null}
          {profileMessage ? (
            <p className="text-sm text-accent-hover">{profileMessage}</p>
          ) : null}
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save account"}
          </Button>
        </form>
      ) : null}

      {isStudentAccount && students[0] ? (
        <StudentForm
          student={students[0]}
          allowDelete={false}
          onSave={(payload) => handleStudentSave(students[0].id, payload)}
        />
      ) : null}

      {!isStudentAccount && primaryStudent ? (
        <StudentForm
          student={primaryStudent}
          allowDelete={false}
          onSave={(payload) => handleStudentSave(primaryStudent.id, payload)}
        />
      ) : null}

      {!isStudentAccount ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Additional students
              </h2>
              <p className="mt-1 text-sm text-muted">
                Each student gets their own login ID or email and password.
              </p>
            </div>
            {!addingStudent ? (
              <Button type="button" onClick={() => setAddingStudent(true)}>
                Add student
              </Button>
            ) : null}
          </div>

          {addingStudent ? (
            <StudentForm
              isNew
              onSave={(payload) => handleStudentSave(null, payload)}
              onCancel={() => setAddingStudent(false)}
            />
          ) : null}

          {additionalStudents.length === 0 && !addingStudent ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted">
              No additional students yet.
            </p>
          ) : null}

          {additionalStudents.map((student) => (
            <StudentForm
              key={student.id}
              student={student}
              onSave={(payload) => handleStudentSave(student.id, payload)}
              onDelete={() => handleStudentDelete(student.id)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
