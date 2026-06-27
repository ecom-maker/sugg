import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/whatsapp";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId, message } = await request.json();

  if (!studentId || !message?.trim()) {
    return NextResponse.json({ error: "Missing studentId or message" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, mobile: true, name: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const result = await sendTextMessage(student.mobile, message);

  if (!result) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  // Store message in DB
  const savedMessage = await prisma.whatsappMessage.create({
    data: {
      studentId: student.id,
      senderId: user.id,
      direction: "OUTBOUND",
      messageId: result.messageId,
      type: "text",
      content: message,
      status: "SENT",
      sentAt: new Date(),
    },
  });

  // Update lead last contacted
  await prisma.lead.updateMany({
    where: { studentId: student.id },
    data: { lastContactedAt: new Date() },
  });

  return NextResponse.json({ success: true, messageId: savedMessage.id });
}
