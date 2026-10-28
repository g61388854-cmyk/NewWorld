import { describe, expect, it } from "vitest";
import {
  canSendRequests, idleTimeoutMinutes, maskProfile, mfaRequired, verificationLabel, visibleLevels, type ViewerFacts,
} from "@/lib/policy";

const investigator: ViewerFacts = { accountType: "CUSTOMER", role: "INVESTIGATOR", membershipStatus: "ACTIVE", organizationType: "LAW_ENFORCEMENT" };
const advocate: ViewerFacts = { accountType: "CUSTOMER", role: "ADVOCATE", membershipStatus: "ACTIVE", organizationType: "BAR" };
const pending: ViewerFacts = { accountType: "CUSTOMER", role: "INQUIRER", membershipStatus: "PENDING", organizationType: null };
const translator: ViewerFacts = { accountType: "TRANSLATOR" };
const admin: ViewerFacts = { accountType: "ADMIN" };

const profile = {
  displayName: "Тест",
  city: "Грозный",
  summary: "О себе",
  experienceYears: 5,
  qualifications: [{ id: "q" }],
  rateInfo: "1000",
  paymentTerms: "Безнал",
  contactPhone: "+7",
  contactEmail: "a@b.c",
  visibility: { rateInfo: "STATE_ONLY" },
};

describe("права заказчиков", () => {
  it("запросы направляет только заказчик с подтверждёнными полномочиями", () => {
    expect(canSendRequests(investigator)).toBe(true);
    expect(canSendRequests(advocate)).toBe(true);
    expect(canSendRequests(pending)).toBe(false);
    expect(canSendRequests({ ...investigator, membershipStatus: "REVOKED" })).toBe(false);
    expect(canSendRequests(translator)).toBe(false);
    expect(canSendRequests(admin)).toBe(false);
  });

  it("MFA обязательна для администратора и государственного сегмента, включая неподтверждённые заявки", () => {
    expect(mfaRequired(admin)).toBe(true);
    expect(mfaRequired(investigator)).toBe(true);
    expect(mfaRequired(pending)).toBe(true);
    expect(mfaRequired(advocate)).toBe(false);
    expect(mfaRequired(translator)).toBe(false);
  });

  it("для привилегированных ролей тайм-аут неактивности короче", () => {
    expect(idleTimeoutMinutes(admin)).toBeLessThan(idleTimeoutMinutes(translator));
    expect(idleTimeoutMinutes(investigator)).toBe(30);
  });
});

describe("раскрытие сведений профиля", () => {
  it("неподтверждённый заказчик видит только публичные поля", () => {
    const m = maskProfile(profile, visibleLevels(pending, false));
    expect(m.summary).toBe("О себе");
    expect(m.city).toBeNull();
    expect(m.qualifications).toEqual([]);
    expect(m.contactPhone).toBeNull();
    expect(m.hidden).toContain("city");
  });

  it("контакты раскрываются только при подтверждённом привлечении", () => {
    expect(maskProfile(profile, visibleLevels(advocate, false)).contactPhone).toBeNull();
    expect(maskProfile(profile, visibleLevels(advocate, true)).contactPhone).toBe("+7");
  });

  it("сведения уровня STATE_ONLY видят только государственные органы", () => {
    expect(maskProfile(profile, visibleLevels(investigator, false)).rateInfo).toBe("1000");
    expect(maskProfile(profile, visibleLevels(advocate, false)).rateInfo).toBeNull();
  });

  it("стоимость по умолчанию скрыта, а владелец видит всё", () => {
    const noVis = { ...profile, visibility: {} };
    expect(maskProfile(noVis, visibleLevels(investigator, true)).rateInfo).toBeNull();
    expect(maskProfile(noVis, new Set(["PUBLIC"]), true).rateInfo).toBe("1000");
  });

  it("администратор не получает контакты уровня ENGAGEMENT", () => {
    expect(maskProfile(profile, visibleLevels(admin, false)).contactPhone).toBeNull();
  });
});

describe("статус подтверждения", () => {
  it("ограничение профиля имеет приоритет", () => {
    expect(verificationLabel({ identityStatus: "VERIFIED", documentsStatus: "VERIFIED", qualificationStatus: "VERIFIED", restricted: true }).label)
      .toBe("Профиль временно ограничен");
  });
  it("выводится наивысший пройденный уровень", () => {
    expect(verificationLabel({ identityStatus: "VERIFIED", documentsStatus: "VERIFIED", qualificationStatus: "NONE", restricted: false }).label)
      .toBe("Документы проверены");
    expect(verificationLabel({ identityStatus: "NONE", documentsStatus: "PENDING", qualificationStatus: "NONE", restricted: false }).label)
      .toBe("Профиль не проверен");
  });
});
