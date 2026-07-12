"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTeam } from "@/actions/teams";
import { toast } from "@/hooks/use-toast";

interface BranchOption {
  id: string;
  branchName: string;
  branchCode: string;
  districtId: string | null;
  geoDistrict: { districtName: string } | null;
}

interface CounselorOption {
  id: string;
  user: { fullName: string };
  branchId: string | null;
}

export function TeamForm({ branches }: { branches: BranchOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);

  const selectedBranch = branches.find((b) => b.id === branchId);

  useEffect(() => {
    if (!branchId) { setCounselors([]); return; }
    fetch(`/api/agency/counselors?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => setCounselors(d.counselors ?? []))
      .catch(() => setCounselors([]));
  }, [branchId]);

  const toggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast({ title: "Select a branch", variant: "destructive" });
      return;
    }
    setLoading(true);
    const result = await createTeam({
      teamName,
      branchId,
      teamLeadId: teamLeadId || undefined,
      memberIds,
    });
    if (result.error) {
      toast({ title: "Error", description: String(result.error), variant: "destructive" });
    } else {
      toast({ title: "Team created" });
      router.push("/agency/teams");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agency/teams"><ArrowLeft className="w-4 h-4 mr-2" />Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Team</h1>
          <p className="text-sm text-muted-foreground">Teams are bound to a single district and branch</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border rounded-xl p-6 space-y-5">
        <div>
          <Label>Team Name *</Label>
          <Input className="mt-1" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Delhi Alpha Team" required />
        </div>

        <div>
          <Label>Branch *</Label>
          <Select value={branchId} onValueChange={(v) => { setBranchId(v); setMemberIds([]); setTeamLeadId(""); }}>
            <SelectTrigger className="mt-1" aria-required="true"><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id} disabled={!b.districtId}>
                  {b.branchName} ({b.branchCode}){!b.districtId ? " — no district" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedBranch && (
          <div>
            <Label>District</Label>
            <Input className="mt-1 bg-muted" readOnly value={selectedBranch.geoDistrict?.districtName ?? "Not assigned — update branch geo first"} />
          </div>
        )}

        {counselors.length > 0 && (
          <>
            <div>
              <Label>Team Lead</Label>
              <Select value={teamLeadId} onValueChange={setTeamLeadId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select team lead" /></SelectTrigger>
                <SelectContent>
                  {counselors.filter((c) => memberIds.includes(c.id) || !teamLeadId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.user.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Initial Members</Label>
              <div className="mt-2 space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                {counselors.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={memberIds.includes(c.id)}
                      onChange={() => toggleMember(c.id)}
                      className="rounded"
                    />
                    {c.user.fullName}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Only counselors not already on an active team can be added</p>
            </div>
          </>
        )}

        <Button type="submit" disabled={loading || !selectedBranch?.districtId} className="w-full gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Users className="w-4 h-4" />
          Create Team
        </Button>
      </form>
    </div>
  );
}
