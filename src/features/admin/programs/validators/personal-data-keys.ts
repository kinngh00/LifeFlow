export const prohibitedPersonalDataKeys = new Set([
  "name",
  "email",
  "phone",
  "residentregistrationnumber",
  "rrn",
  "addressdetail",
  "bankaccount",
]);

function normalizeKey(key: string): string {
  return key.replace(/[-_\s]/g, "").toLowerCase();
}

export function findProhibitedPersonalDataKey(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProhibitedPersonalDataKey(item);
      if (found) return found;
    }
    return null;
  }

  if (value === null || typeof value !== "object") return null;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (prohibitedPersonalDataKeys.has(normalizeKey(key))) return key;
    const found = findProhibitedPersonalDataKey(nestedValue);
    if (found) return found;
  }

  return null;
}
