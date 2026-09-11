const MONTHS_EN = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const MONTHS_AR = {
  "يناير": 1, "فبراير": 2, "مارس": 3, "ابريل": 4, "أبريل": 4, "مايو": 5,
  "يونيو": 6, "يوليو": 7, "اغسطس": 8, "أغسطس": 8, "سبتمبر": 9,
  "اكتوبر": 10, "أكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12,
};

const EXPIRY_WORDS = [
  "expires", "expiry", "expiration", "valid until", "valid till",
  "exp date", "exp.", "due date", "due on", "deadline",
  "ينتهي", "انتهاء", "صالحة حتى", "ساري حتى", "صالح حتى",
  "تاريخ الانتهاء", "آخر موعد", "استحقاق",
];

const APPOINTMENT_WORDS = [
  "appointment", "meeting", "interview", "reminder",
  "موعد", "اجتماع", "مقابلة", "كشف", "عيادة",
];

const TYPE_HINTS = [
  { id: "renewal", keys: ["إقامة", "اقامة", "visa", "iqama", "renew", "تجديد", "رخصة"] },
  { id: "document", keys: ["passport", "جواز", "عقد", "contract", "id ", "هوية"] },
  { id: "insurance", keys: ["insurance", "تأمين"] },
  { id: "payment", keys: ["invoice", "فاتورة", "rent", "إيجار", "ايجار", "payment"] },
  { id: "appointment", keys: APPOINTMENT_WORDS },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIso(y, m, d) {
  const yi = Number(y);
  const mi = Number(m);
  const di = Number(d);
  if (!yi || mi < 1 || mi > 12 || di < 1 || di > 31) return null;
  if (yi < 1990 || yi > 2100) return null;
  const dt = new Date(yi, mi - 1, di);
  if (dt.getFullYear() !== yi || dt.getMonth() !== mi - 1 || dt.getDate() !== di) return null;
  return `${yi}-${pad(mi)}-${pad(di)}`;
}

function normalize(text) {
  return String(text || "")
    .replace(/\u200f|\u200e/g, "")
    .replace(/[٠-٩]/g, (d) => "0123456789"["\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(d)]);
}

export function extractDates(raw) {
  const text = normalize(raw);
  const found = [];
  const push = (iso, source, hint) => {
    if (!iso) return;
    if (found.some((f) => f.iso === iso && f.source === source)) return;
    found.push({ iso, source, hint });
  };

  for (const m of text.matchAll(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g)) {
    push(toIso(m[1], m[2], m[3]), m[0], nearbyHint(text, m.index));
  }
  for (const m of text.matchAll(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|\d{2})\b/g)) {
    let y = m[3];
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
    push(toIso(y, m[2], m[1]), m[0], nearbyHint(text, m.index));
  }
  for (const m of text.matchAll(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/g)) {
    const mon = MONTHS_EN[m[2].toLowerCase()];
    if (mon) push(toIso(m[3], mon, m[1]), m[0], nearbyHint(text, m.index));
  }
  for (const m of text.matchAll(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})\b/g)) {
    const mon = MONTHS_EN[m[1].toLowerCase()];
    if (mon) push(toIso(m[3], mon, m[2]), m[0], nearbyHint(text, m.index));
  }
  for (const m of text.matchAll(/(\d{1,2})\s*(يناير|فبراير|مارس|ابريل|أبريل|مايو|يونيو|يوليو|اغسطس|أغسطس|سبتمبر|اكتوبر|أكتوبر|نوفمبر|ديسمبر)\s*(20\d{2})/g)) {
    push(toIso(m[3], MONTHS_AR[m[2]], m[1]), m[0], nearbyHint(text, m.index));
  }
  return found;
}

function nearbyHint(text, index) {
  const start = Math.max(0, (index || 0) - 28);
  const slice = text.slice(start, (index || 0) + 8).toLowerCase();
  if (EXPIRY_WORDS.some((w) => slice.includes(w))) return "expiry";
  if (APPOINTMENT_WORDS.some((w) => slice.includes(w))) return "appointment";
  return "date";
}

export function guessType(text) {
  const t = normalize(text).toLowerCase();
  for (const row of TYPE_HINTS) {
    if (row.keys.some((k) => t.includes(k.toLowerCase()))) return row.id;
  }
  return "other";
}

export function guessTitle(fileName, text) {
  const base = String(fileName || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  if (base) return base.slice(0, 80);
  const line = String(text || "").split(/\n/).map((s) => s.trim()).find((s) => s.length > 3);
  return (line || "سجل بدون عنوان").slice(0, 80);
}

export function buildCandidates(fileName, text) {
  const blob = `${fileName || ""}\n${text || ""}`;
  const dates = extractDates(blob);
  const type = guessType(blob);
  const title = guessTitle(fileName, text);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const ranked = dates
    .map((d) => {
      const dt = new Date(d.iso + "T00:00:00");
      const future = dt >= now;
      let score = future ? 3 : 1;
      if (d.hint === "expiry") score += 4;
      if (d.hint === "appointment") score += 3;
      return { ...d, score };
    })
    .sort((a, b) => b.score - a.score);
  return {
    title,
    type,
    dates: ranked,
    suggestedDate: ranked[0]?.iso || null,
    remindDays: type === "appointment" ? 2 : 30,
  };
}

export function answerQuestion(question, items) {
  const q = normalize(question).toLowerCase().trim();
  if (!q) return { kind: "empty", text: "اكتب سؤالك: امتى الإقامة؟ إيه المواعيد الأسبوع الجاي؟" };
  const open = items.filter((i) => i.status !== "done" && i.status !== "cancelled");
  if (/أسبوع|الاسبوع|week/.test(q)) {
    const hit = open.filter((i) => {
      const d = daysBetween(i.dueDate);
      return d != null && d >= 0 && d <= 7;
    });
    return listReply("خلال الأسبوع", hit);
  }
  if (/شهر|30|month/.test(q)) {
    const hit = open.filter((i) => {
      const d = daysBetween(i.dueDate);
      return d != null && d >= 0 && d <= 30;
    });
    return listReply("خلال 30 يوم", hit);
  }
  if (/نهارد|اليوم|today/.test(q)) {
    const hit = open.filter((i) => daysBetween(i.dueDate) === 0);
    return listReply("النهارده", hit);
  }
  if (/عاجل|منتهي|خلص|overdue/.test(q)) {
    const hit = open.filter((i) => {
      const d = daysBetween(i.dueDate);
      return d != null && d <= 3;
    });
    return listReply("العاجل", hit);
  }
  const words = q.split(/\s+/).filter((w) => w.length >= 2);
  const scored = open
    .map((i) => {
      const hay = normalize(`${i.title} ${i.notes || ""} ${i.fileName || ""} ${i.type}`).toLowerCase();
      const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
      return { i, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || String(a.i.dueDate).localeCompare(String(b.i.dueDate)));
  if (!scored.length) {
    return { kind: "none", text: "مفيش حاجة مطابقة في السجل المحلي. ضيف الملف أو الموعد الأول." };
  }
  return listReply("أقرب نتيجة", scored.slice(0, 8).map((x) => x.i));
}

function daysBetween(iso) {
  if (!iso) return null;
  const a = new Date(iso + "T00:00:00");
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86400000);
}

function listReply(title, items) {
  if (!items.length) return { kind: "none", text: `${title}: مفيش.` };
  const lines = items.map((i) => {
    const d = daysBetween(i.dueDate);
    const when = i.dueDate ? i.dueDate.split("-").reverse().join("/") : "بدون تاريخ";
    const left = d == null ? "" : d < 0 ? ` (عدّى ${-d} يوم)` : d === 0 ? " (النهارده)" : ` (باقي ${d} يوم)`;
    return `• ${i.title} - ${when}${left}`;
  });
  return { kind: "list", text: `${title}\n${lines.join("\n")}` };
}
