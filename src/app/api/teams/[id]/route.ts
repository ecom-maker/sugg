import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { canManageTeams } from "@/lib/hierarchy-scope";
import { archiveTeam } from "@/actions/teams";
import { getNodeMetrics } from "@/lib/hierarchy-metrics";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      branch: {
        include: {
          geoDistrict: { include: { state: { include: { country: true } } } },
          agency: { select: { name: true } },
        },
      },
      district: { include: { state: { include: { country: true } } } },
      teamLead: { include: { user: { select: { id: true, fullName: true, email: true } } } },
      members: {
        where: { status: "ACTIVE" },
        include: {
          counselor: {
            include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
          },
        },
      },
      createdBy: { select: { fullName: true } },
    },
  });

  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberMetrics = await Promise.all(
    team.members.map(async (m) => ({
      counselorId: m.counselorId,
      userId: m.counselor.user.id,
      name: m.counselor.user.fullName,
      metrics: await getNodeMetrics("counselor", m.counselor.user.id),
    }))
  );

  const teamMetrics = await getNodeMetrics("team", id);

  return NextResponse.json({ team, metrics: teamMetrics, memberMetrics });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.team.update({
    where: { id },
    data: {
      ...(body.teamName && { teamName: body.teamName }),
      ...(body.status && { status: body.status }),
    },
  });

  if (body.teamName) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TEAM_UPDATED",
        resource: "Team",
        resourceId: id,
        newValue: { teamName: body.teamName },
      },
    });
  }

  return NextResponse.json({ team: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || !canManageTeams(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await archiveTeam(id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ message: "Team archived" });
}
