// Демонстрационные данные для локальной разработки. Все лица и организации вымышлены.
// Запуск: npm run db:seed. Пароль всех демо-аккаунтов: demo-password-2026

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "demo-password-2026";

function daysFromNow(days: number, hour = 9): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour - 3, 0, 0, 0);
  return d;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Демо-данные не загружаются в production");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await db.user.upsert({
    where: { email: "admin@demo.newworld" },
    update: {},
    create: { email: "admin@demo.newworld", fullName: "Администратор платформы", passwordHash, accountType: "ADMIN" },
  });

  const org = await db.organization.create({
    data: { name: "Демонстрационный следственный отдел", type: "LAW_ENFORCEMENT", region: "Чеченская Республика" },
  });
  const expiresAt = daysFromNow(365);

  await db.user.create({
    data: {
      email: "investigator@demo.newworld",
      fullName: "Иван Демонстрационный",
      passwordHash,
      accountType: "CUSTOMER",
      membership: {
        create: {
          role: "INVESTIGATOR",
          status: "ACTIVE",
          organizationId: org.id,
          claimedOrganization: org.name,
          position: "Следователь",
          evidence: "Демо-аккаунт",
          reviewedAt: new Date(),
          expiresAt,
        },
      },
    },
  });

  const bar = await db.organization.create({ data: { name: "Демонстрационная коллегия адвокатов", type: "BAR" } });
  await db.user.create({
    data: {
      email: "advocate@demo.newworld",
      fullName: "Анна Примерова",
      passwordHash,
      accountType: "CUSTOMER",
      membership: {
        create: {
          role: "ADVOCATE",
          status: "ACTIVE",
          organizationId: bar.id,
          claimedOrganization: bar.name,
          evidence: "Демо-аккаунт",
          reviewedAt: new Date(),
          expiresAt,
        },
      },
    },
  });

  await db.user.create({
    data: {
      email: "pending@demo.newworld",
      fullName: "Пётр Ожидающий",
      passwordHash,
      accountType: "CUSTOMER",
      membership: {
        create: {
          role: "INQUIRER",
          claimedOrganization: "Демонстрационный отдел дознания",
          position: "Дознаватель",
          evidence: "Служебный телефон: указывается в заявке",
        },
      },
    },
  });

  const translators = [
    {
      email: "translator1@demo.newworld",
      name: "Хеда Демонстрационная",
      region: "Чеченская Республика",
      city: "Грозный",
      pairs: [["che", "rus", true, "Родной"]],
      specializations: ["criminal", "legal", "personal_docs"],
      formats: ["written", "consecutive", "onsite", "remote"],
      verified: true,
      urgent: true,
    },
    {
      email: "translator2@demo.newworld",
      name: "Магомед Примеров",
      region: "Республика Дагестан",
      city: "Махачкала",
      pairs: [["ava", "rus", true, "Родной"], ["che", "rus", true, "Свободный"]],
      specializations: ["criminal", "civil"],
      formats: ["consecutive", "onsite"],
      verified: false,
      urgent: false,
    },
    {
      email: "translator3@demo.newworld",
      name: "Елена Образцова",
      region: "Москва",
      city: "Москва",
      pairs: [["eng", "rus", true, "Профессиональный"], ["deu", "rus", false, "Профессиональный"]],
      specializations: ["legal", "business", "simultaneous"],
      formats: ["written", "simultaneous", "remote", "layout"],
      verified: true,
      urgent: false,
    },
  ] as const;

  for (const t of translators) {
    await db.user.create({
      data: {
        email: t.email,
        fullName: t.name,
        passwordHash,
        accountType: "TRANSLATOR",
        profile: {
          create: {
            displayName: t.name,
            region: t.region,
            city: t.city,
            summary: "Демонстрационный профиль. Сведения вымышлены.",
            experienceYears: 8,
            specializations: [...t.specializations],
            formats: [...t.formats],
            clientTypes: ["individuals", "organizations", "state"],
            remote: t.formats.includes("remote" as never),
            travelReady: true,
            urgentReady: t.urgent,
            rateInfo: "По договорённости",
            contactPhone: "+7 000 000-00-00",
            published: true,
            identityStatus: t.verified ? "VERIFIED" : "NONE",
            documentsStatus: t.verified ? "VERIFIED" : "PENDING",
            languages: {
              create: t.pairs.map(([source, target, bidirectional, level]) => ({
                source, target, bidirectional, level, verified: t.verified,
              })),
            },
            qualifications: {
              create: [
                { kind: "education", title: "Диплом о высшем лингвистическом образовании (демо)", issuer: "Демонстрационный университет", year: 2015, status: t.verified ? "VERIFIED" : "PENDING" },
              ],
            },
            slots: {
              create: [
                { kind: "AVAILABLE", startsAt: daysFromNow(0, 0), endsAt: daysFromNow(14, 23) },
              ],
            },
          },
        },
      },
    });
  }

  console.log(`Демо-данные загружены. Пароль всех аккаунтов: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
