// Правила доступа и раскрытия сведений. Модуль не обращается к базе данных
// и покрыт модульными тестами (tests/policy.test.ts).

export type AccountType = "TRANSLATOR" | "CUSTOMER" | "ADMIN";
export type CustomerRole =
  | "INVESTIGATOR"
  | "INQUIRER"
  | "COURT"
  | "ADVOCATE"
  | "LAW_ENFORCEMENT"
  | "AGENCY_STAFF";
export type MembershipStatus = "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED";
export type OrganizationType = "LAW_ENFORCEMENT" | "COURT" | "BAR" | "AGENCY" | "OTHER";

export type Visibility = "PUBLIC" | "VERIFIED_CUSTOMERS" | "STATE_ONLY" | "ENGAGEMENT" | "PRIVATE";

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: "Все пользователи",
  VERIFIED_CUSTOMERS: "Подтверждённые заказчики",
  STATE_ONLY: "Только государственные органы и суды",
  ENGAGEMENT: "Только после подтверждения участия",
  PRIVATE: "Только владелец профиля",
};

/** Поля профиля, уровень раскрытия которых выбирает переводчик, и значения по умолчанию. */
export const CONFIGURABLE_FIELDS = {
  city: { label: "Город", default: "VERIFIED_CUSTOMERS" },
  summary: { label: "Профессиональная информация", default: "PUBLIC" },
  experienceYears: { label: "Опыт работы", default: "VERIFIED_CUSTOMERS" },
  qualifications: { label: "Квалификация", default: "VERIFIED_CUSTOMERS" },
  rateInfo: { label: "Стоимость услуг", default: "PRIVATE" },
  paymentTerms: { label: "Условия оплаты", default: "VERIFIED_CUSTOMERS" },
  contactPhone: { label: "Телефон", default: "ENGAGEMENT" },
  contactEmail: { label: "Электронная почта для связи", default: "ENGAGEMENT" },
} as const satisfies Record<string, { label: string; default: Visibility }>;

export type ConfigurableField = keyof typeof CONFIGURABLE_FIELDS;

const STATE_ROLES: CustomerRole[] = ["INVESTIGATOR", "INQUIRER", "COURT", "LAW_ENFORCEMENT"];
const STATE_ORGS: OrganizationType[] = ["LAW_ENFORCEMENT", "COURT"];

export interface ViewerFacts {
  accountType: AccountType | null;
  role?: CustomerRole | null;
  membershipStatus?: MembershipStatus | null;
  organizationType?: OrganizationType | null;
}

export function isStateRole(role: CustomerRole | null | undefined): boolean {
  return !!role && STATE_ROLES.includes(role);
}

/** Заказчик с подтверждённой принадлежностью к организации. */
export function isActiveCustomer(v: ViewerFacts): boolean {
  return v.accountType === "CUSTOMER" && v.membershipStatus === "ACTIVE";
}

export function canSearchRegistry(v: ViewerFacts): boolean {
  return v.accountType === "CUSTOMER" || v.accountType === "ADMIN";
}

/** Направлять запросы может только заказчик, чьи полномочия проверены. */
export function canSendRequests(v: ViewerFacts): boolean {
  return isActiveCustomer(v);
}

/**
 * Многофакторная аутентификация обязательна для администраторов и для
 * пользователей государственного сегмента — по заявленной роли, независимо
 * от того, завершена ли проверка.
 */
export function mfaRequired(v: ViewerFacts): boolean {
  if (v.accountType === "ADMIN") return true;
  return v.accountType === "CUSTOMER" && isStateRole(v.role);
}

/** Тайм-аут неактивной сессии в минутах. */
export function idleTimeoutMinutes(v: ViewerFacts): number {
  if (mfaRequired(v)) return 30;
  return 12 * 60;
}

/** Абсолютный срок жизни сессии в часах. */
export function sessionLifetimeHours(v: ViewerFacts): number {
  return v.accountType === "ADMIN" ? 12 : 7 * 24;
}

/** Уровни раскрытия, доступные пользователю в отношении конкретного профиля. */
export function visibleLevels(v: ViewerFacts, hasEngagement: boolean): Set<Visibility> {
  const levels = new Set<Visibility>(["PUBLIC"]);
  if (v.accountType === "ADMIN") {
    levels.add("VERIFIED_CUSTOMERS");
    levels.add("STATE_ONLY");
    return levels;
  }
  if (!isActiveCustomer(v)) return levels;
  levels.add("VERIFIED_CUSTOMERS");
  if (v.organizationType && STATE_ORGS.includes(v.organizationType)) levels.add("STATE_ONLY");
  if (hasEngagement) levels.add("ENGAGEMENT");
  return levels;
}

export function fieldVisibility(stored: unknown, field: ConfigurableField): Visibility {
  const map = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const value = map[field];
  const allowed: Visibility[] = ["PUBLIC", "VERIFIED_CUSTOMERS", "STATE_ONLY", "ENGAGEMENT", "PRIVATE"];
  return allowed.includes(value as Visibility) ? (value as Visibility) : CONFIGURABLE_FIELDS[field].default;
}

/**
 * Возвращает копию профиля, в которой скрытые от пользователя поля заменены на null.
 * Владелец профиля видит все поля.
 */
export function maskProfile<T extends Record<string, unknown> & { visibility: unknown }>(
  profile: T,
  levels: Set<Visibility>,
  isOwner = false,
): T & { hidden: ConfigurableField[] } {
  const result: Record<string, unknown> = { ...profile };
  const hidden: ConfigurableField[] = [];
  if (!isOwner) {
    for (const field of Object.keys(CONFIGURABLE_FIELDS) as ConfigurableField[]) {
      if (!levels.has(fieldVisibility(profile.visibility, field))) {
        if (field in result) result[field] = Array.isArray(result[field]) ? [] : null;
        hidden.push(field);
      }
    }
  }
  return { ...(result as T), hidden };
}

export type CheckStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export interface VerificationFacts {
  identityStatus: CheckStatus;
  documentsStatus: CheckStatus;
  qualificationStatus: CheckStatus;
  restricted: boolean;
}

/** Итоговый статус подтверждения профиля для отображения в карточке. */
export function verificationLabel(p: VerificationFacts): { label: string; tone: "neutral" | "good" | "warn" } {
  if (p.restricted) return { label: "Профиль временно ограничен", tone: "warn" };
  if (p.qualificationStatus === "VERIFIED")
    return { label: "Квалификация подтверждена в установленном порядке", tone: "good" };
  if (p.documentsStatus === "VERIFIED") return { label: "Документы проверены", tone: "good" };
  if (p.identityStatus === "VERIFIED") return { label: "Личность подтверждена", tone: "good" };
  return { label: "Профиль не проверен", tone: "neutral" };
}
