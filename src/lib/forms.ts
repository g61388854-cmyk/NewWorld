import { redirect } from "next/navigation";
import type { ZodError } from "zod";

/** Возврат на страницу с сообщением об ошибке или результате. */
export function back(path: string, message: string, kind: "error" | "ok" = "error"): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

export function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? "Проверьте правильность заполнения формы";
}

export function str(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function bool(form: FormData, name: string): boolean {
  return form.get(name) === "on" || form.get(name) === "true";
}

export function list(form: FormData, name: string): string[] {
  return form.getAll(name).filter((v): v is string => typeof v === "string" && v !== "");
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" });
}

/** Значение datetime-local трактуется как московское время. */
export function parseMoscowLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseMoscowDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
