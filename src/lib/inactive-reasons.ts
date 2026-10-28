export const INACTIVE_REASONS = [
  { value: "unpaid_leave", label: "Fizetés nélküli szabadság" },
  { value: "gyes", label: "GYES" },
  { value: "gyed", label: "GYED" },
  { value: "maternity", label: "Szülési szabadság" },
  { value: "long_sick", label: "Tartós betegállomány" },
  { value: "other", label: "Egyéb" },
] as const;

export type InactiveReasonValue = (typeof INACTIVE_REASONS)[number]["value"];

export function inactiveReasonLabel(value: string | null | undefined) {
  if (!value) return "Passzív";
  return INACTIVE_REASONS.find((reason) => reason.value === value)?.label ?? "Passzív";
}

export function isInactiveReason(value: string): value is InactiveReasonValue {
  return INACTIVE_REASONS.some((reason) => reason.value === value);
}
