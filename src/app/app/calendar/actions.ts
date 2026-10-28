"use server";

import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { back, parseMoscowLocal, str } from "@/lib/forms";

const PATH = "/app/calendar";

export async function addSlot(form: FormData) {
  const ctx = await requireAccount("TRANSLATOR");
  const profile = await db.translatorProfile.findUniqueOrThrow({ where: { userId: ctx.user.id } });
  const startsAt = parseMoscowLocal(str(form, "startsAt"));
  const endsAt = parseMoscowLocal(str(form, "endsAt"));
  if (!startsAt || !endsAt) back(PATH, "Укажите начало и окончание периода");
  if (endsAt <= startsAt) back(PATH, "Окончание периода должно быть позже начала");
  if (endsAt.getTime() < Date.now()) back(PATH, "Период уже прошёл");
  if (endsAt.getTime() - startsAt.getTime() > 31 * 24 * 3600_000) back(PATH, "Период не может превышать 31 день");
  await db.availabilitySlot.create({ data: { profileId: profile.id, startsAt, endsAt, kind: "AVAILABLE" } });
  back(PATH, "Период доступности добавлен", "ok");
}

export async function removeSlot(form: FormData) {
  const ctx = await requireAccount("TRANSLATOR");
  const profile = await db.translatorProfile.findUniqueOrThrow({ where: { userId: ctx.user.id } });
  await db.availabilitySlot.deleteMany({
    where: { id: str(form, "id"), profileId: profile.id, kind: "AVAILABLE", requestId: null },
  });
  back(PATH, "Период удалён", "ok");
}
