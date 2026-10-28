// Жизненный цикл запроса на привлечение переводчика (docs/04-engagement-requests.md, 4.3).

export type RequestStatus =
  | "DRAFT"
  | "SENT"
  | "AWAITING_RESPONSE"
  | "CLARIFICATION_REQUESTED"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED";

export type Side = "customer" | "translator";

export type RequestAction =
  | "send"
  | "open"
  | "confirm"
  | "decline"
  | "clarify"
  | "answer"
  | "cancel"
  | "complete";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: "Черновик",
  SENT: "Отправлен",
  AWAITING_RESPONSE: "Ожидает ответа",
  CLARIFICATION_REQUESTED: "Запрошены уточнения",
  CONFIRMED: "Специалист подтвердил возможность участия",
  DECLINED: "Отклонён",
  CANCELLED: "Отменён",
  COMPLETED: "Завершён",
};

const TRANSITIONS: Record<RequestAction, { side: Side; from: RequestStatus[]; to: RequestStatus }> = {
  send: { side: "customer", from: ["DRAFT"], to: "SENT" },
  open: { side: "translator", from: ["SENT"], to: "AWAITING_RESPONSE" },
  confirm: { side: "translator", from: ["SENT", "AWAITING_RESPONSE"], to: "CONFIRMED" },
  decline: { side: "translator", from: ["SENT", "AWAITING_RESPONSE", "CLARIFICATION_REQUESTED"], to: "DECLINED" },
  clarify: { side: "translator", from: ["SENT", "AWAITING_RESPONSE"], to: "CLARIFICATION_REQUESTED" },
  answer: { side: "customer", from: ["CLARIFICATION_REQUESTED"], to: "AWAITING_RESPONSE" },
  cancel: {
    side: "customer",
    from: ["DRAFT", "SENT", "AWAITING_RESPONSE", "CLARIFICATION_REQUESTED", "CONFIRMED"],
    to: "CANCELLED",
  },
  complete: { side: "customer", from: ["CONFIRMED"], to: "COMPLETED" },
};

export function nextStatus(current: RequestStatus, action: RequestAction, side: Side): RequestStatus | null {
  const t = TRANSITIONS[action];
  if (t.side !== side || !t.from.includes(current)) return null;
  return t.to;
}

export function availableActions(current: RequestStatus, side: Side): RequestAction[] {
  return (Object.keys(TRANSITIONS) as RequestAction[]).filter(
    (a) => a !== "open" && nextStatus(current, a, side) !== null,
  );
}

/** Статусы, в которых запрос ещё требует действий. */
export const OPEN_STATUSES: RequestStatus[] = ["SENT", "AWAITING_RESPONSE", "CLARIFICATION_REQUESTED"];

/** Переводчик видит адрес мероприятия и служебные контакты только после подтверждения участия. */
export function translatorSeesEngagementDetails(status: RequestStatus): boolean {
  return status === "CONFIRMED" || status === "COMPLETED";
}

/** Черновики переводчику не видны. */
export function translatorCanSee(status: RequestStatus): boolean {
  return status !== "DRAFT";
}
