import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhook,
  parseInboundMessage,
  sendTextMessage,
  type WebhookPayload,
} from "@/lib/whatsapp";
import { normalizeMobileE164 } from "@/lib/mobile-normalize";
import { assignLeadToNextCounselor } from "@/lib/lead-assignment";
import { createNotification } from "@/lib/notifications";
import { CONSENT_TEXT_VERSION, WHATSAPP_CONSENT_MESSAGE } from "@/lib/consent";
import { flagEmailDuplicate } from "@/lib/student-dedup";

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
  const normalizedPhone = normalizeMobileE164(parsed.from);

  // Dedup: lookup by normalized mobile first
  let existingStudent = await prisma.student.findFirst({
    where: {
      OR: [
        { mobileNumberNormalized: normalizedPhone },
        { mobile: normalizedPhone },
        { whatsappId: parsed.from },
      ],
      isActive: true,
    },
    include: { leads: { where: { isCurrent: true }, take: 1 } },
  });

  if (!existingStudent) {
    existingStudent = await prisma.student.create({
      data: {
        name: parsed.contactName ?? `WA ${parsed.from.slice(-4)}`,
        mobile: normalizedPhone,
        mobileNumberNormalized: normalizedPhone,
        whatsappId: parsed.from,
        source: "WHATSAPP",
      },
      include: { leads: { where: { isCurrent: true }, take: 1 } },
    });

    // Capture WhatsApp consent on new student
    await prisma.studentConsent.createMany({
      data: [
        {
          studentId: existingStudent.id,
          consentType: "DATA_PROCESSING",
          consentGiven: true,
          consentSource: "WHATSAPP",
          consentTextVersion: CONSENT_TEXT_VERSION,
        },
        {
          studentId: existingStudent.id,
          consentType: "CONTACT_WHATSAPP",
          consentGiven: true,
          consentSource: "WHATSAPP",
          consentTextVersion: CONSENT_TEXT_VERSION,
        },
      ],
      skipDuplicates: true,
    });

    // Send consent language in first reply
    await sendTextMessage(parsed.from, WHATSAPP_CONSENT_MESSAGE);
  } else if (!existingStudent.mobileNumberNormalized) {
    await prisma.student.update({
      where: { id: existingStudent.id },
      data: { mobileNumberNormalized: normalizedPhone },
    });
  }

  const student = existingStudent;
  const currentLead = student.leads[0] ?? null;

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

  // Lead handling
  if (!currentLead) {
    const lead = await prisma.lead.create({
      data: {
        studentId: student.id,
        source: "WHATSAPP",
        status: "NEW",
        score: 10,
        isCurrent: true,
      },
    });

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
  } else if (currentLead.status === "LOST") {
    await prisma.lead.update({
      where: { id: currentLead.id },
      data: { isCurrent: false },
    });

    const lead = await prisma.lead.create({
      data: {
        studentId: student.id,
        source: "WHATSAPP",
        status: "NEW",
        score: 10,
        isCurrent: true,
      },
    });

    const assignedCounselorId = await assignLeadToNextCounselor(
      lead.id,
      student.interestedCourse ?? undefined
    );

    if (assignedCounselorId) {
      await createNotification({
        userId: assignedCounselorId,
        type: "NEW_LEAD_ASSIGNED",
        title: "Re-engaged Lead",
        message: `${student.name} messaged again after being marked lost`,
        resourceId: lead.id,
      });
    }
  } else {
    await prisma.lead.update({
      where: { id: currentLead.id },
      data: { lastContactedAt: new Date() },
    });

    if (currentLead.assignedToId) {
      await prisma.leadNote.create({
        data: {
          leadId: currentLead.id,
          userId: currentLead.assignedToId,
          content: `WhatsApp message received: ${parsed.content ?? `[${parsed.type}]`}`,
        },
      });
    }
  }

  // Soft email duplicate check (if email present on future updates)
  if (student.email) {
    await flagEmailDuplicate(student.id, student.email);
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
