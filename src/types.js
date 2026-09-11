export const TYPES = [
  { id: "document", label: "مستند" },
  { id: "appointment", label: "موعد" },
  { id: "renewal", label: "تجديد" },
  { id: "payment", label: "دفعة" },
  { id: "insurance", label: "تأمين" },
  { id: "other", label: "أخرى" },
];

export function daysLeft(iso) {
  if (!iso) return null;
  const a = new Date(iso + "T00:00:00");
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86400000);
}

export function statusOf(iso) {
  const d = daysLeft(iso);
  if (d == null) return { key: "none", label: "بدون تاريخ" };
  if (d < 0) return { key: "overdue", label: "منتهي" };
  if (d === 0) return { key: "today", label: "النهارده" };
  if (d <= 3) return { key: "soon", label: "خلال 3 أيام" };
  if (d <= 30) return { key: "month", label: "خلال شهر" };
  return { key: "later", label: "لاحقًا" };
}

export function formatArDate(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function todayIso() {
  const n = new Date();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${m}-${d}`;
}
