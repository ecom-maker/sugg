"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Archive, UserPlus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricsBadge } from "@/components/hierarchy/metrics-badge";
import { archiveTeam, addTeamMember, removeTeamMember, changeTeamLead } from "@/actions/teams";
import { toast } from "@/hooks/use-toast";
import type { HierarchyMetrics } from "@/lib/hierarchy-metrics";

interface TeamDetailProps {
  teamId: string;
  canManage: boolean;
}

export function TeamDetailView({ teamId, canManage }: TeamDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<{
    team: {
      id: string;
      teamName: string;
      status: string;
      needsReview: boolean;
      branch: { branchName: string; agency: { name: string } };
      district: { districtName: string; state: { stateName: string; country: { countryName: string } } };
      teamLead: { id: string; user: { fullName: string } } | null;
      members: { counselorId: string; counselor: { user: { id: string; fullName: string } } }[];
    };
    metrics: HierarchyMetrics;
    memberMetrics: { counselorId: string; userId: string; name: string; metrics: HierarchyMetrics }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    fetch(`/api/teams/${teamId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  };

  useEffect(() => { load(); }, [teamId]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { team, metrics, memberMetrics } = data;

  const handleArchive = async () => {
    if (!window.confirm(`Archive "${team.teamName}"?`)) return;
    setActionLoading(true);
    const result = await archiveTeam(teamId);
    if (result.error) toast({ title: "Error", description: result.error, variant: "destructive" });
    else { toast({ title: "Team archived" }); router.push("/agency/teams"); }
    setActionLoading(false);
  };

  const handleRemove = async (counselorId: string) => {
    setActionLoading(true);
    const result = await removeTeamMember(teamId, counselorId);
    if (result.error) toast({ title: "Error", description: result.error, variant: "destructive" });
    else { toast({ title: "Member removed" }); load(); }
    setActionLoading(false);
  };

  const handleSetLead = async (counselorId: string) => {
    setActionLoading(true);
    const result = await changeTeamLead(teamId, counselorId);
    if (result.error) toast({ title: "Error", description: result.error, variant: "destructive" });
    else { toast({ title: "Team lead updated" }); load(); }
    setActionLoading(false);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/agency/teams"><ArrowLeft className="w-4 h-4 mr-2" />Back to Teams</Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{team.teamName}</h1>
            <Badge variant={team.status === "ACTIVE" ? "success" : "secondary"}>{team.status}</Badge>
            {team.needsReview && <Badge variant="warning">Needs Review</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {team.branch.branchName} · {team.district.districtName}, {team.district.state.stateName}, {team.district.state.country.countryName}
          </p>
          {team.teamLead && <p className="text-sm mt-1">Team Lead: <strong>{team.teamLead.user.fullName}</strong></p>}
        </div>
        {canManage && team.status !== "ARCHIVED" && (
          <Button variant="outline" className="gap-2" onClick={handleArchive} disabled={actionLoading}>
            <Archive className="w-4 h-4" />Archive
          </Button>
        )}
      </div>

      <div className="border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-3">Team Metrics</h3>
        <MetricsBadge metrics={metrics} />
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 font-semibold text-sm">Members ({team.members.length})</div>
        {team.members.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No members yet</p>
        ) : (
          <div className="divide-y">
            {memberMetrics.map((m) => (
              <div key={m.counselorId} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <MetricsBadge metrics={m.metrics} compact />
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    {team.teamLead?.id !== m.counselorId && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleSetLead(m.counselorId)} disabled={actionLoading}>
                        <Crown className="w-3 h-3" />Set Lead
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleRemove(m.counselorId)} disabled={actionLoading}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
