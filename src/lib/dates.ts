export const HOLIDAYS = new Set([
  "2026-01-01",
  "2026-03-15",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01",
  "2026-05-25",
  "2026-08-20",
  "2026-10-23",
  "2026-11-01",
  "2026-12-25",
  "2026-12-26",
]);

const MONTHS = [
  "január",
  "február",
  "március",
  "április",
  "május",
  "június",
  "július",
  "augusztus",
  "szeptember",
  "október",
  "november",
  "december",
];

const MONTHS_SHORT = [
  "jan.",
  "febr.",
  "márc.",
  "ápr.",
  "máj.",
  "jún.",
  "júl.",
  "aug.",
  "szept.",
  "okt.",
  "nov.",
  "dec.",
];

const WEEKDAYS = [
  "vasárnap",
  "hétfő",
  "kedd",
  "szerda",
  "csütörtök",
  "péntek",
  "szombat",
];

const WEEKDAYS_SHORT = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

export const QUARTER_META = [
  { index: 0, label: "Q1 · JAN–MÁR", quotaKey: "q1Quota" as const },
  { index: 1, label: "Q2 · ÁPR–JÚN", quotaKey: "q2Quota" as const },
  { index: 2, label: "Q3 · JÚL–SZEP", quotaKey: "q3Quota" as const },
  { index: 3, label: "Q4 · OKT–DEC", quotaKey: "q4Quota" as const },
];

export function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function eachDay(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor.getTime() <= last.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function isWorkday(iso: string) {
  const day = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  if (day === 0 || day === 6) return false;
  return !HOLIDAYS.has(iso);
}

export function countWorkdays(start: string, end: string) {
  return eachDay(start, end).filter(isWorkday).length;
}

export function workdaysOf(start: string, end: string) {
  return eachDay(start, end).filter(isWorkday);
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function monthTitle(year: number, monthIndex: number) {
  return `${year}. ${MONTHS[monthIndex]}`;
}

export function weekdayName(iso: string) {
  return WEEKDAYS[new Date(`${iso}T00:00:00.000Z`).getUTCDay()];
}

export function weekdayShortHeaders() {
  return ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
}

export function formatRange(start: string, end: string) {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  const startLabel = capitalize(MONTHS_SHORT[sm - 1]);
  if (start === end) return `${startLabel} ${sd}.`;
  if (sm === em) return `${startLabel} ${sd}–${ed}.`;
  return `${startLabel} ${sd}. – ${capitalize(MONTHS_SHORT[em - 1])} ${ed}.`;
}

export function formatDayHeading(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${capitalize(MONTHS_SHORT[month - 1])} ${day}.`;
}

export function yearOf(iso: string) {
  return Number(iso.slice(0, 4));
}

export function quarterIndex(iso: string) {
  return Math.floor((Number(iso.slice(5, 7)) - 1) / 3);
}

export function monthIndex(iso: string) {
  return Number(iso.slice(5, 7)) - 1;
}

export function weekdayMonFirst(iso: string) {
  const day = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  return WEEKDAYS_SHORT[day];
}
