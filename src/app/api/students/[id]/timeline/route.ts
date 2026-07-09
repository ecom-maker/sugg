import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireStudentAccess } from "@/lib/student-scope";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const access = await requireStudentAccess(user, id, "read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: 403 });

  const cursor = request.nextUrl.searchParams.get("cursor");
  const limit = 30;

  const [messages, notes, followups, statusHistory, applications] = await Promise.all([
    prisma.whatsappMessage.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { fullName: true } } },
    }),
    prisma.leadNote.findMany({
      where: { lead: { studentId: id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { fullName: true } } },
    }),
    prisma.leadFollowup.findMany({
      where: { lead: { studentId: id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { fullName: true } } },
    }),
    prisma.applicationStatusHistory.findMany({
      where: { application: { studentId: id } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.application.findMany({
      where: { studentId: id },
      select: { id: true, status: true, createdAt: true, college: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  type TimelineItem = {
    id: string;
    type: string;
    title: string;
    description?: string;
    actor?: string;
    createdAt: string;
  };

  const items: TimelineItem[] = [
    ...messages.map((m) => ({
      id: `wa-${m.id}`,
      type: "whatsapp",
      title: m.direction === "INBOUND" ? "WhatsApp received" : "WhatsApp sent",
      description: m.content ?? undefined,
      actor: m.sender?.fullName,
      createdAt: m.createdAt.toISOString(),
    })),
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      type: "note",
      title: "Note added",
      description: n.content,
      actor: n.user.fullName,
      createdAt: n.createdAt.toISOString(),
    })),
    ...followups.map((f) => ({
      id: `fu-${f.id}`,
      type: "followup",
      title: f.title,
      description: f.status,
      actor: f.user.fullName,
      createdAt: f.createdAt.toISOString(),
    })),
    ...statusHistory.map((s) => ({
      id: `ash-${s.id}`,
      type: "application_status",
      title: `Application → ${s.status}`,
      description: s.notes ?? undefined,
      createdAt: s.createdAt.toISOString(),
    })),
  ];

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const page = items.slice(0, limit);
  const nextCursor = messages.length === limit ? messages[messages.length - 1]?.id : null;

  return NextResponse.json({ items: page, nextCursor, applications });
}
