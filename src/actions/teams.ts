"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { canManageTeams } from "@/lib/hierarchy-scope";

const createTeamSchema = z.object({
  teamName: z.string().min(2).max(100),
  branchId: z.string().min(1),
  teamLeadId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

async function logTeamAction(
  userId: string,
  action: string,
  teamId: string,
  oldValue?: Prisma.InputJsonValue,
  newValue?: Prisma.InputJsonValue
) {
  await prisma.auditLog.create({
    data: { userId, action, resource: "Team", resourceId: teamId, oldValue, newValue },
  });
}

async function assertTeamAccess(userId: string, role: string, branchId: string) {
  if (role === "SUPER_ADMIN") return;

  const branch = await prisma.agencyBranch.findUnique({
    where: { id: branchId },
    include: { agency: { include: { owner: true } } },
  });
  if (!branch) throw new Error("Branch not found");

  if (role === "AGENCY_OWNER") {
    if (branch.agency.owner?.id !== userId) throw new Error("Access denied");
    return;
  }

  if (role === "AGENCY_ADMIN") {
    const au = await prisma.agencyUser.findUnique({ where: { userId } });
    if (!au || au.agencyId !== branch.agencyId) throw new Error("Access denied");
    return;
  }

  if (role === "BRANCH_MANAGER") {
    const managed = await prisma.agencyBranch.findFirst({
      where: { id: branchId, managerId: userId },
    });
    if (!managed) throw new Error("Access denied");
    return;
  }

  throw new Error("Unauthorized");
}

async function validateCounselorsInBranch(counselorIds: string[], branchId: string, agencyId: string) {
  for (const cid of counselorIds) {
    const counselor = await prisma.agencyUser.findUnique({
      where: { id: cid },
      include: { teamMemberships: { where: { status: "ACTIVE" } } },
    });
    if (!counselor) throw new Error("Counselor not found");
    if (counselor.branchId !== branchId) {
      throw new Error("Counselor must belong to the same branch as the team");
    }
    if (counselor.agencyId !== agencyId) throw new Error("Counselor agency mismatch");
    if (counselor.teamMemberships.some((m) => m.status === "ACTIVE")) {
      throw new Error("Counselor is already on an active team");
    }
  }
}

export async function createTeam(data: z.infer<typeof createTeamSchema>) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) return { error: "Unauthorized" };

  const parsed = createTeamSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const branch = await prisma.agencyBranch.findUnique({ where: { id: parsed.data.branchId } });
  if (!branch) return { error: "Branch not found" };
  if (!branch.districtId) return { error: "Branch must have a district assigned before creating a team" };

  try {
    await assertTeamAccess(user.id, user.role, branch.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Access denied" };
  }

  const memberIds = parsed.data.memberIds ?? [];
  if (parsed.data.teamLeadId && !memberIds.includes(parsed.data.teamLeadId)) {
    memberIds.push(parsed.data.teamLeadId);
  }

  try {
    await validateCounselorsInBranch(memberIds, branch.id, branch.agencyId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Validation failed" };
  }

  const team = await prisma.team.create({
    data: {
      teamName: parsed.data.teamName,
      districtId: branch.districtId,
      branchId: branch.id,
      teamLeadId: parsed.data.teamLeadId ?? null,
      createdById: user.id,
      members: memberIds.length
        ? {
            create: memberIds.map((counselorId) => ({
              counselorId,
              status: "ACTIVE",
            })),
          }
        : undefined,
    },
  });

  await logTeamAction(user.id, "TEAM_CREATED", team.id, undefined, {
    teamName: team.teamName,
    branchId: branch.id,
    districtId: branch.districtId,
  });

  revalidatePath("/agency/teams");
  revalidatePath("/branch/teams");
  revalidatePath("/admin/hierarchy");
  return { success: true, teamId: team.id };
}

export async function archiveTeam(teamId: string) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) return { error: "Unauthorized" };

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Team not found" };

  try {
    await assertTeamAccess(user.id, user.role, team.branchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Access denied" };
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { status: "ARCHIVED" },
  });

  await prisma.teamMember.updateMany({
    where: { teamId, status: "ACTIVE" },
    data: { status: "REMOVED" },
  });

  await logTeamAction(user.id, "TEAM_ARCHIVED", teamId, { status: team.status }, { status: "ARCHIVED" });

  revalidatePath("/agency/teams");
  revalidatePath(`/agency/teams/${teamId}`);
  return { success: true };
}

export async function addTeamMember(teamId: string, counselorId: string) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) return { error: "Unauthorized" };

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { branch: true },
  });
  if (!team || team.status === "ARCHIVED") return { error: "Team not found or archived" };

  try {
    await assertTeamAccess(user.id, user.role, team.branchId);
    await validateCounselorsInBranch([counselorId], team.branchId, team.branch.agencyId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Validation failed" };
  }

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_counselorId: { teamId, counselorId } },
  });

  if (existing?.status === "ACTIVE") return { error: "Already a member" };

  if (existing) {
    await prisma.teamMember.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", joinedAt: new Date() },
    });
  } else {
    await prisma.teamMember.create({
      data: { teamId, counselorId, status: "ACTIVE" },
    });
  }

  await logTeamAction(user.id, "COUNSELOR_ADDED_TO_TEAM", teamId, undefined, { counselorId });
  revalidatePath(`/agency/teams/${teamId}`);
  return { success: true };
}

export async function removeTeamMember(teamId: string, counselorId: string) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) return { error: "Unauthorized" };

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Team not found" };

  try {
    await assertTeamAccess(user.id, user.role, team.branchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Access denied" };
  }

  await prisma.teamMember.updateMany({
    where: { teamId, counselorId, status: "ACTIVE" },
    data: { status: "REMOVED" },
  });

  if (team.teamLeadId === counselorId) {
    await prisma.team.update({ where: { id: teamId }, data: { teamLeadId: null } });
  }

  await logTeamAction(user.id, "COUNSELOR_REMOVED_FROM_TEAM", teamId, { counselorId });
  revalidatePath(`/agency/teams/${teamId}`);
  return { success: true };
}

export async function changeTeamLead(teamId: string, counselorId: string) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) return { error: "Unauthorized" };

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Team not found" };

  const member = await prisma.teamMember.findFirst({
    where: { teamId, counselorId, status: "ACTIVE" },
  });
  if (!member) return { error: "Team lead must be an active team member" };

  try {
    await assertTeamAccess(user.id, user.role, team.branchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Access denied" };
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { teamLeadId: counselorId },
  });

  await logTeamAction(user.id, "TEAM_LEAD_CHANGED", teamId, { teamLeadId: team.teamLeadId }, { teamLeadId: counselorId });
  revalidatePath(`/agency/teams/${teamId}`);
  return { success: true };
}
