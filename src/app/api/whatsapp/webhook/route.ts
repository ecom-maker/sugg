import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhook,
  parseInboundMessage,
  normalizePhone,
  type WebhookPayload,
} from "@/lib/whatsapp";
import { assignLeadToNextCounselor } from "@/lib/lead-assignment";
import { createNotification } from "@/lib/notifications";

// GET: Webhook verification challenge
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (!mode || !token || !challenge) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const result = verifyWebhook(mode, token, challenge);

  if (result) {
    return new NextResponse(result, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST: Incoming messages
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const secret = request.headers.get("x-hub-signature-256");
    // In production, verify HMAC signature here

    const body: WebhookPayload = await request.json();

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ok" });
    }

    // Process each message
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        // Handle message status updates
        if (change.value.statuses?.length) {
          await handleStatusUpdates(change.value.statuses);
          continue;
        }

        // Handle incoming messages
        if (!change.value.messages?.length) continue;

        const parsed = parseInboundMessage({
          object: body.object,
          entry: [{ id: entry.id, changes: [change] }],
        });

        if (!parsed) continue;

        await handleInboundMessage(parsed);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "ok" }); // Always return 200 to WhatsApp
  }
}

async function handleInboundMessage(parsed: {
  from: string;
  messageId: string;
  timestamp: Date;
  type: string;
  content: string | null;
  contactName: string | null;
}) {
  const normalizedPhone = normalizePhone(parsed.from);

  // Find or create student
  let existingStudent = await prisma.student.findFirst({
    where: {
      OR: [
        { mobile: parsed.from },
        { mobile: normalizedPhone },
        { whatsappId: parsed.from },
      ],
    },
    include: { lead: true },
  });

  if (!existingStudent) {
    // Create new student from WhatsApp
    existingStudent = await prisma.student.create({
      data: {
        name: parsed.contactName ?? `WA ${parsed.from.slice(-4)}`,
        mobile: normalizedPhone,
        whatsappId: parsed.from,
        source: "WHATSAPP",
      },
      include: { lead: true },
    });
  }

  const student = existingStudent;

  // Store WhatsApp message
  await prisma.whatsappMessage.create({
    data: {
      studentId: student.id,
      direction: "INBOUND",
      messageId: parsed.messageId,
      type: parsed.type,
      content: parsed.content,
      status: "DELIVERED",
      sentAt: parsed.timestamp,
    },
  });

  // Create lead if not exists
  if (!student.lead) {
    const lead = await prisma.lead.create({
      data: {
        studentId: student.id,
        source: "WHATSAPP",
        status: "NEW",
        score: 10,
      },
    });

    // Auto-assign counselor
    const assignedCounselorId = await assignLeadToNextCounselor(
      lead.id,
      student.interestedCourse ?? undefined
    );

    if (assignedCounselorId) {
      await createNotification({
        userId: assignedCounselorId,
        type: "NEW_LEAD_ASSIGNED",
        title: "New Lead Assigned",
        message: `New WhatsApp lead: ${student.name} (${student.mobile})`,
        resourceId: lead.id,
      });
    }
  } else {
    // Update existing lead's last contacted date
    await prisma.lead.update({
      where: { id: student.lead.id },
      data: { lastContactedAt: new Date() },
    });
  }
}

async function handleStatusUpdates(
  statuses: Array<{
    id: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string;
    recipient_id: string;
  }>
) {
  for (const statusUpdate of statuses) {
    const updateData: Record<string, unknown> = {
      status: statusUpdate.status.toUpperCase(),
    };

    if (statusUpdate.status === "delivered") {
      updateData.deliveredAt = new Date(parseInt(statusUpdate.timestamp) * 1000);
    } else if (statusUpdate.status === "read") {
      updateData.readAt = new Date(parseInt(statusUpdate.timestamp) * 1000);
    }

    await prisma.whatsappMessage
      .update({
        where: { messageId: statusUpdate.id },
        data: updateData,
      })
      .catch(() => {}); // Ignore if message not found
  }
}
