export function validateName(value: string): string | null {
  if (!value.trim()) return 'Name is required.';
  return null;
}

export function validateEmail(value: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
  return null;
}

export function validateAddress(value: string): string | null {
  if (!value.trim()) return 'Address is required.';
  if (value.length > 400) return 'Address cannot exceed 400 characters.';
  return null;
}
