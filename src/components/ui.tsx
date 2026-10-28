import type { RequestStatus } from "@/lib/request-flow";
import { STATUS_LABELS } from "@/lib/request-flow";

type Params = Record<string, string | string[] | undefined>;

export function Flash({ params }: { params: Params }) {
  const error = typeof params.error === "string" ? params.error : null;
  const ok = typeof params.ok === "string" ? params.ok : null;
  if (!error && !ok) return null;
  return <div className={`flash ${error ? "error" : "ok"}`}>{error ?? ok}</div>;
}

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="page-head row between">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const STATUS_TONE: Record<RequestStatus, string> = {
  DRAFT: "",
  SENT: "accent",
  AWAITING_RESPONSE: "accent",
  CLARIFICATION_REQUESTED: "warn",
  CONFIRMED: "good",
  DECLINED: "bad",
  CANCELLED: "",
  COMPLETED: "good",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`badge ${STATUS_TONE[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return <div className={`avatar${large ? " large" : ""}`} aria-hidden>{initials}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="muted">{children}</p>;
}

export function Options({ dict, placeholder }: { dict: Record<string, string>; placeholder?: string }) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {Object.entries(dict).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </>
  );
}
