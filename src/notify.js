import * as Notifications from "expo-notifications";
import { daysLeft } from "./types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermissions() {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === "granted";
}

export async function rescheduleAll(items, settings) {
  const ok = await ensurePermissions();
  if (!ok) return { scheduled: 0, permission: false };
  await Notifications.cancelAllScheduledNotificationsAsync();

  const hour = settings.morningHour ?? 8;
  const minute = settings.morningMinute ?? 0;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "تقرير المواعيد",
      body: morningBody(items, settings.expiryWindowDays ?? 30),
    },
    trigger: { hour, minute, repeats: true },
  });

  let extra = 0;
  const open = items.filter((i) => i.status === "open" && i.dueDate);
  for (const item of open) {
    const left = daysLeft(item.dueDate);
    const remind = Number(item.remindDays ?? 3);
    if (left == null || left < 0) continue;
    const fire = new Date(item.dueDate + "T09:00:00");
    fire.setDate(fire.getDate() - remind);
    if (fire.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `تذكير: ${item.title}`,
          body: `باقي ${remind} يوم - ${item.dueDate.split("-").reverse().join("/")}`,
        },
        trigger: fire,
      });
      extra += 1;
    }
  }
  return { scheduled: 1 + extra, permission: true };
}

export function morningBody(items, windowDays) {
  const open = (items || []).filter((i) => i.status === "open" && i.dueDate);
  const overdue = open.filter((i) => daysLeft(i.dueDate) < 0);
  const soon = open.filter((i) => {
    const d = daysLeft(i.dueDate);
    return d >= 0 && d <= 3;
  });
  const month = open.filter((i) => {
    const d = daysLeft(i.dueDate);
    return d > 3 && d <= windowDays;
  });
  if (!overdue.length && !soon.length && !month.length) {
    return "مفيش حاجة مستعجلة خلال الشهر. يوم هادي.";
  }
  const bits = [];
  if (overdue.length) bits.push(`منتهي: ${overdue.length}`);
  if (soon.length) bits.push(`خلال 3 أيام: ${soon.length}`);
  if (month.length) bits.push(`خلال شهر: ${month.length}`);
  const first = [...overdue, ...soon, ...month][0];
  return `${bits.join(" | ")}${first ? `\nأول حاجة: ${first.title}` : ""}`;
}
