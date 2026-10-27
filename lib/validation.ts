// Input validation helpers (used by register, profile and event forms).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (value.length > 254 || !EMAIL_RE.test(value)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password is too long (max 72 characters).';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

export function validateFullName(name: string): string | null {
  const value = name.trim();
  if (value.length < 2) return 'Full name must be at least 2 characters.';
  if (value.length > 80) return 'Full name is too long (max 80 characters).';
  return null;
}

export function validateIdNumber(idNumber: string): string | null {
  const value = idNumber.trim();
  if (!value) return null; // optional
  if (!/^[A-Za-z0-9\-_.]{3,30}$/.test(value)) {
    return 'ID number may only contain letters, numbers, - _ . (3-30 characters).';
  }
  return null;
}

export type EventFormValues = {
  title: string;
  venue: string;
  description: string;
  start: Date;
  end: Date;
};

export function validateEventForm(
  v: EventFormValues,
  opts: { requireFuture: boolean }
): string | null {
  const title = v.title.trim();
  const venue = v.venue.trim();
  if (title.length < 3) return 'Event name must be at least 3 characters.';
  if (title.length > 100) return 'Event name is too long (max 100 characters).';
  if (venue.length < 2) return 'Venue is required.';
  if (venue.length > 100) return 'Venue is too long (max 100 characters).';
  if (v.description.trim().length > 500) {
    return 'Description is too long (max 500 characters).';
  }
  if (Number.isNaN(v.start.getTime()) || Number.isNaN(v.end.getTime())) {
    return 'Please choose a valid date and time.';
  }
  if (v.start >= v.end) return 'Start time must be before end time.';
  if (opts.requireFuture && v.end.getTime() <= Date.now()) {
    return 'The event must end in the future.';
  }
  return null;
}
