import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform configuration</p>
      </div>

      <div className="space-y-4">
        {[
          { label: "Platform Name", value: "Sugg Admission Management", desc: "Displayed across the platform" },
          { label: "Support Email", value: "support@sugg.in", desc: "Used for system notifications" },
          { label: "Default Currency", value: "INR (₹)", desc: "Used in commission calculations" },
          { label: "Lead Auto-assign", value: "Round Robin", desc: "Algorithm for distributing new leads" },
          { label: "Commission Type", value: "Percentage", desc: "Default commission calculation method" },
        ].map((setting) => (
          <div key={setting.label} className="rounded-lg border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{setting.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{setting.desc}</p>
            </div>
            <span className="text-sm font-medium bg-muted px-3 py-1.5 rounded-md">{setting.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">Full settings management coming soon</p>
      </div>
    </div>
  );
}
