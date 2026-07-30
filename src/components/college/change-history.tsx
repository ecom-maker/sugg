import { History, User2 } from "lucide-react";

export interface ChangeLogEntry {
  id: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
  user: { fullName: string | null; email: string | null } | null;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  website: "Website",
  contactPhone: "Contact Phone",
  contactPersonName: "Contact Person",
  contactPersonDesig: "Contact Person Designation",
  contactPersonPhone: "Contact Person Phone",
  address: "Address",
  city: "City",
  state: "State",
  country: "Country",
  pincode: "Pincode",
  description: "Description",
  establishedYear: "Established Year",
  universityId: "University",
  status: "Status",
  reason: "Reason",
};

function titleFor(action: string): string {
  if (action === "COLLEGE_UPDATED") return "Details updated";
  if (action === "UNIVERSITY_LINKED_TO_COLLEGE") return "University linked";
  const m = action.match(/^COLLEGE_(APPROVED|REJECTED|SUSPENDED|ARCHIVED|PENDING)$/);
  if (m) {
    const s = m[1];
    return `Status changed to ${s.charAt(0)}${s.slice(1).toLowerCase()}`;
  }
  return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const s = String(v);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function CollegeChangeHistory({ entries }: { entries: ChangeLogEntry[] }) {
  return (
    <div>
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        Change History ({entries.length})
      </h2>
      <div className="rounded-lg border bg-card">
        {entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No changes recorded yet. Edits made here will appear with who made them and what changed.
          </p>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => {
              const oldObj = asObject(e.oldValue);
              const newObj = asObject(e.newValue);
              // Fields to show as before → after rows (status is conveyed in the title).
              const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).filter(
                (k) => k !== "status"
              );
              const who = e.user?.fullName ?? e.user?.email ?? "System";
              return (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-xs">
                        {titleFor(e.action)}
                      </span>
                      <span className="text-muted-foreground inline-flex items-center gap-1 font-normal">
                        <User2 className="w-3.5 h-3.5" />
                        {who}
                      </span>
                    </div>
                    <time className="text-xs text-muted-foreground" dateTime={new Date(e.createdAt).toISOString()}>
                      {new Date(e.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </div>
                  {keys.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {keys.map((k) => {
                        const hasOld = k in oldObj;
                        return (
                          <li key={k} className="text-sm">
                            <span className="text-muted-foreground">{FIELD_LABELS[k] ?? k}: </span>
                            {hasOld && (
                              <>
                                <span className="line-through text-muted-foreground">{fmt(oldObj[k])}</span>
                                <span className="text-muted-foreground mx-1">→</span>
                              </>
                            )}
                            <span className="font-medium">{fmt(newObj[k])}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
