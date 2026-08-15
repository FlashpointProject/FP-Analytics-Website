export function normalizeCountry(value: string | string[] | undefined): string | false | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  const normalized = raw.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(normalized)) {
    return false;
  }
  return normalized;
}
