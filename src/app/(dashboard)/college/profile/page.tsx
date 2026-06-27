import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, Globe, Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = { title: "College Profile" };

export default async function CollegeProfilePage() {
  const user = await requireRole(["COLLEGE_ADMIN"]);

  const college = await prisma.college.findFirst({
    where: { admin: { supabaseId: user.supabaseId } },
  });

  if (!college) {
    return (
      <div className="p-6 text-center py-16 text-muted-foreground">
        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No college profile found. Contact admin.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">College Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your institution details</p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{college.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${college.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
              {college.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4 border-t">
          {college.officialEmail && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{college.officialEmail}</span>
            </div>
          )}
          {college.contactPhone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{college.contactPhone}</span>
            </div>
          )}
          {college.website && (
            <div className="flex items-center gap-3 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <a href={college.website} target="_blank" className="text-primary hover:underline">{college.website}</a>
            </div>
          )}
          {(college.city ?? college.state ?? college.country) && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{[college.city, college.state, college.country].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>

        {college.description && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-1">About</p>
            <p className="text-sm text-muted-foreground">{college.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
