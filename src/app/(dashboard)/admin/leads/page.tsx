import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Students & Leads" };

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  INTERESTED: "bg-purple-100 text-purple-700",
  APPLIED: "bg-orange-100 text-orange-700",
  ADMISSION_CONFIRMED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  DROPPED: "bg-gray-100 text-gray-700",
};

export default async function AdminLeadsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const leads = await prisma.lead.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { fullName: true, email: true, phone: true } },
      assignedCounselor: { select: { fullName: true } },
      interestedCourse: { select: { name: true } },
      interestedCollege: { select: { name: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students & Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">{leads.length} total leads</p>
        </div>
        <Button asChild>
          <Link href="/admin/leads/new"><Plus className="w-4 h-4 mr-2" />Add Lead</Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search leads..." className="pl-9" />
        </div>
        <Button variant="outline"><Filter className="w-4 h-4 mr-2" />Filter</Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Student</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">College / Course</th>
              <th className="text-left px-4 py-3 font-medium">Counselor</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No leads yet</td></tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{lead.student.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{lead.student.email}</div>
                    <div>{lead.student.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{lead.interestedCollege?.name ?? "—"}</div>
                    <div className="text-muted-foreground text-xs">{lead.interestedCourse?.name ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">{lead.assignedCounselor?.fullName ?? <span className="text-muted-foreground">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {lead.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
