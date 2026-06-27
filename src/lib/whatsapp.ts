// Meta WhatsApp Business Cloud API Integration

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const API_TOKEN = process.env.WHATSAPP_API_TOKEN!;

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "document" | "audio" | "video" | "sticker";
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type: string };
  document?: { id: string; filename: string; mime_type: string };
}

export interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export async function sendTextMessage(
  to: string,
  message: string
): Promise<{ messageId: string } | null> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to.replace(/\D/g, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp send error:", error);
      return null;
    }

    const data = await response.json();
    return { messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp API error:", error);
    return null;
  }
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = "en",
  components?: object[]
): Promise<{ messageId: string } | null> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp template send error:", error);
      return null;
    }

    const data = await response.json();
    return { messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp API error:", error);
    return null;
  }
}

export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string
): string | null {
  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return challenge;
  }
  return null;
}

export function parseInboundMessage(payload: WebhookPayload) {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (!value?.messages?.length) return null;

  const message = value.messages[0];
  const contact = value.contacts?.[0];

  return {
    from: message.from,
    messageId: message.id,
    timestamp: new Date(parseInt(message.timestamp) * 1000),
    type: message.type,
    content: message.text?.body ?? null,
    contactName: contact?.profile?.name ?? null,
  };
}

export function normalizePhone(phone: string): string {
  // Remove all non-digits
  let normalized = phone.replace(/\D/g, "");
  // Add India country code if missing
  if (normalized.length === 10) {
    normalized = "91" + normalized;
  }
  return normalized;
}
