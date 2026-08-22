import { History, User2 } from "lucide-react";

export interface AgencyLogEntry {
  id: string;
  action: string;
  newValue: unknown;
  createdAt: Date;
  user: { fullName: string | null; email: string | null } | null;
}

function titleFor(action: string): string {
  switch (action) {
    case "APPROVE_AGENCY":
      return "Approved";
    case "REJECT_AGENCY":
      return "Rejected";
    case "SUSPEND_AGENCY":
      return "Suspended";
    case "TERMS_ACCEPTED":
      return "Terms & Conditions accepted";
    default:
      return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}

function reasonOf(v: unknown): string | null {
  if (v && typeof v === "object" && "reason" in v) {
    const r = (v as Record<string, unknown>).reason;
    return typeof r === "string" && r.trim() ? r : null;
  }
  return null;
}

const dotColor: Record<string, string> = {
  APPROVE_AGENCY: "bg-green-500",
  REJECT_AGENCY: "bg-red-500",
  SUSPEND_AGENCY: "bg-orange-500",
  TERMS_ACCEPTED: "bg-blue-500",
  REGISTERED: "bg-muted-foreground",
};

/**
 * Chronological activity timeline for an agency — registration, approvals,
 * suspensions/reactivations (with reasons), rejections and T&C acceptance.
 * Built from the audit log plus the agency's own registration timestamp.
 */
export function AgencyActivityHistory({
  registeredAt,
  onboardingSource,
  entries,
}: {
  registeredAt: Date;
  onboardingSource: string;
  entries: AgencyLogEntry[];
}) {
  type Ev = { id: string; when: Date; kind: string; title: string; actor: string; reason: string | null };

  const events: Ev[] = entries.map((e) => ({
    id: e.id,
    when: new Date(e.createdAt),
    kind: e.action,
    title: titleFor(e.action),
    actor: e.user?.fullName ?? e.user?.email ?? "System",
    reason: reasonOf(e.newValue),
  }));
  events.push({
    id: "registered",
    when: new Date(registeredAt),
    kind: "REGISTERED",
    title: "Registered",
    actor: onboardingSource === "SELF_REGISTERED" ? "Self-registered" : "Created by admin",
    reason: null,
  });
  events.sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold">Activity History</h2>
        <span className="text-xs text-muted-foreground">({events.length})</span>
      </div>
      <ol className="relative border-l ml-1 pl-5 space-y-4">
        {events.map((ev) => (
          <li key={ev.id} className="relative">
            <span
              className={`absolute -left-[1.45rem] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-card ${dotColor[ev.kind] ?? "bg-muted-foreground"}`}
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-medium">{ev.title}</p>
              <time className="text-xs text-muted-foreground" dateTime={ev.when.toISOString()}>
                {ev.when.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <User2 className="w-3 h-3" /> by <span className="font-medium text-foreground">{ev.actor}</span>
            </p>
            {ev.reason && (
              <p className="text-sm mt-1">
                <span className="text-muted-foreground">Reason: </span>
                {ev.reason}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
