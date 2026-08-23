import { History, User2 } from "lucide-react";

export interface ChangeLogEntry {
  id: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
  user: { fullName: string | null; email: string | null } | null;
}

// Human labels for audit field keys seen across modules.
const FIELD_LABELS: Record<string, string> = {
  // lead / student
  maxFees: "Max Fees",
  minFees: "Min Fees",
  interestedCourse: "Interested Course",
  preferredCollege: "Preferred College",
  expectedClosingDate: "Expected Closing Date",
  assignedToId: "Assigned To",
  branchId: "Branch",
  qualification: "Qualification",
  // status / common
  status: "Status",
  isActive: "Active",
  role: "Role",
  email: "Email",
  fullName: "Name",
  name: "Name",
  capabilities: "Capabilities",
  // branch
  managerId: "Manager",
  branchName: "Branch Name",
  // misc
  termsVersion: "Version",
  acceptedBy: "Accepted By",
};

// Human titles for audit action codes.
const ACTION_TITLES: Record<string, string> = {
  CREATE_LEAD: "Lead created",
  CREATE_AGENCY_LEAD: "Lead created",
  UPDATE_LEAD_DETAILS: "Lead details updated",
  UPDATE_LEAD_STATUS: "Status changed",
  REASSIGN_LEAD: "Reassigned",
  REASSIGN_LEAD_CROSS_BRANCH: "Reassigned (cross-branch)",
  UPDATE_STUDENT: "Student updated",
  UPDATE_STUDENT_PROFILE: "Student updated",
  CREATE_APPLICATION: "Application created",
  UPDATE_APPLICATION_STATUS: "Application status changed",
  UPDATE_APPLICATION: "Application updated",
  CREATE_AGENCY_STAFF: "Staff added",
  UPDATE_AGENCY_STAFF: "Staff updated",
  PROVISION_EMPLOYEE_LOGIN: "Login provisioned",
  UPDATE_EMPLOYEE_CAPABILITIES: "Capabilities updated",
  CREATE_EMPLOYEE: "Employee created",
  UPDATE_EMPLOYEE: "Employee updated",
  ASSIGN_SUGG_BRANCH_MANAGER: "Manager assigned",
  CREATE_SUGG_BRANCH: "Branch created",
  UPDATE_SUGG_BRANCH: "Branch updated",
  TERMS_ACCEPTED: "Terms & Conditions accepted",
};

// Keys used only to give an entry a subject/heading, not shown as diff rows.
const SUBJECT_KEYS = ["student", "studentName", "name", "fullName", "collegeName"];

function humanize(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  const s = String(v);
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}

const dotColor: Record<string, string> = {
  UPDATE_LEAD_STATUS: "bg-blue-500",
  UPDATE_APPLICATION_STATUS: "bg-blue-500",
  ASSIGN_SUGG_BRANCH_MANAGER: "bg-purple-500",
  CREATE_LEAD: "bg-green-500",
  CREATE_AGENCY_LEAD: "bg-green-500",
  CREATE_AGENCY_STAFF: "bg-green-500",
  TERMS_ACCEPTED: "bg-blue-500",
};

/**
 * Generic field-level change-history timeline. Renders audit-log entries
 * (who / when / what changed) for any resource. Drop into a detail page and
 * pass the entries queried for that resource + id.
 */
export function ChangeHistory({
  entries,
  title = "Change History",
  emptyHint = "No changes recorded yet.",
}: {
  entries: ChangeLogEntry[];
  title?: string;
  emptyHint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">({entries.length})</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{emptyHint}</p>
      ) : (
        <ol className="relative border-l ml-1 pl-5 space-y-4">
          {entries.map((e) => {
            const oldObj = asObj(e.oldValue);
            const newObj = asObj(e.newValue);
            const subjectKey = SUBJECT_KEYS.find((k) => newObj[k] != null || oldObj[k] != null);
            const subject = subjectKey ? fmt(newObj[subjectKey] ?? oldObj[subjectKey]) : null;
            const reason =
              typeof newObj.reason === "string" && newObj.reason.trim() ? (newObj.reason as string) : null;
            const who = e.user?.fullName ?? e.user?.email ?? "System";
            const heading = ACTION_TITLES[e.action] ?? humanize(e.action);
            const rows = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
              .filter((k) => !SUBJECT_KEYS.includes(k) && k !== "reason")
              // Hide internal creation-metadata ids (documentId, educationId, …)
              // but keep id fields that actually changed (old → new).
              .filter((k) => !(/Id$/.test(k) && !(k in oldObj)));

            return (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -left-[1.45rem] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-card ${dotColor[e.action] ?? "bg-muted-foreground"}`}
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium">
                    {heading}
                    {subject && <span className="text-muted-foreground font-normal"> — {subject}</span>}
                  </p>
                  <time className="text-xs text-muted-foreground" dateTime={new Date(e.createdAt).toISOString()}>
                    {new Date(e.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <User2 className="w-3 h-3" /> by <span className="font-medium text-foreground">{who}</span>
                </p>
                {reason && (
                  <p className="text-sm mt-1">
                    <span className="text-muted-foreground">Reason: </span>
                    {reason}
                  </p>
                )}
                {rows.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {rows.map((k) => {
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
        </ol>
      )}
    </div>
  );
}
