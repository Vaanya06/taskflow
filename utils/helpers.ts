export function isNonEmpty(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}