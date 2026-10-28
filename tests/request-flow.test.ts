import { describe, expect, it } from "vitest";
import { availableActions, nextStatus, translatorCanSee, translatorSeesEngagementDetails } from "@/lib/request-flow";

describe("жизненный цикл запроса", () => {
  it("основной сценарий: черновик → отправлен → ожидает ответа → подтверждён → завершён", () => {
    expect(nextStatus("DRAFT", "send", "customer")).toBe("SENT");
    expect(nextStatus("SENT", "open", "translator")).toBe("AWAITING_RESPONSE");
    expect(nextStatus("AWAITING_RESPONSE", "confirm", "translator")).toBe("CONFIRMED");
    expect(nextStatus("CONFIRMED", "complete", "customer")).toBe("COMPLETED");
  });

  it("уточнения: переводчик запрашивает, заказчик отвечает", () => {
    expect(nextStatus("AWAITING_RESPONSE", "clarify", "translator")).toBe("CLARIFICATION_REQUESTED");
    expect(nextStatus("CLARIFICATION_REQUESTED", "answer", "customer")).toBe("AWAITING_RESPONSE");
    expect(nextStatus("CLARIFICATION_REQUESTED", "confirm", "translator")).toBeNull();
  });

  it("стороны не могут выполнять действия друг друга", () => {
    expect(nextStatus("AWAITING_RESPONSE", "confirm", "customer")).toBeNull();
    expect(nextStatus("DRAFT", "send", "translator")).toBeNull();
    expect(nextStatus("CONFIRMED", "cancel", "translator")).toBeNull();
    expect(nextStatus("CONFIRMED", "complete", "translator")).toBeNull();
  });

  it("закрытые запросы не изменяются", () => {
    for (const s of ["DECLINED", "CANCELLED", "COMPLETED"] as const) {
      expect(availableActions(s, "customer")).toEqual([]);
      expect(availableActions(s, "translator")).toEqual([]);
    }
  });

  it("переводчик не видит черновики, а адрес и контакты — до подтверждения", () => {
    expect(translatorCanSee("DRAFT")).toBe(false);
    expect(translatorSeesEngagementDetails("AWAITING_RESPONSE")).toBe(false);
    expect(translatorSeesEngagementDetails("CONFIRMED")).toBe(true);
  });
});
