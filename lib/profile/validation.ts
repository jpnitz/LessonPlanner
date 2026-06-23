const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

export function validateStudentProfile(input: {
  display_name: string;
  birthday: string;
  zip_code: string;
  login_id?: string;
  login_email?: string;
  password?: string;
  isNew?: boolean;
}) {
  const errors: Record<string, string> = {};

  if (!input.display_name.trim()) {
    errors.display_name = "Name is required.";
  }

  if (!input.birthday) {
    errors.birthday = "Birthday is required.";
  }

  if (!input.zip_code.trim()) {
    errors.zip_code = "Zip code is required.";
  } else if (!ZIP_PATTERN.test(input.zip_code.trim())) {
    errors.zip_code = "Enter a valid US zip code (12345 or 12345-6789).";
  }

  if (input.isNew) {
    const hasLoginId = Boolean(input.login_id?.trim());
    const hasLoginEmail = Boolean(input.login_email?.trim());

    if (!hasLoginId && !hasLoginEmail) {
      errors.login = "Provide a login ID or email for this student.";
    }

    if (hasLoginId && hasLoginEmail) {
      errors.login = "Use either a login ID or an email, not both.";
    }

    if (hasLoginId && !/^[a-zA-Z0-9._-]{3,32}$/.test(input.login_id!.trim())) {
      errors.login_id = "Login ID must be 3–32 characters (letters, numbers, . _ -).";
    }

    if (hasLoginEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.login_email!.trim())) {
      errors.login_email = "Enter a valid email address.";
    }

    if (!input.password || input.password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
  }

  return errors;
}

export function maskApiKey(value: string) {
  if (value.length <= 4) return "••••••••";
  return `${"•".repeat(8)}${value.slice(-4)}`;
}

export function isProfileIncomplete(student: {
  birthday: string | null;
  zip_code: string | null;
}) {
  return !student.birthday || !student.zip_code?.trim();
}
