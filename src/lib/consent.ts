export const CONSENT_TEXT_VERSION = "2026-01-v1";

export const WHATSAPP_CONSENT_MESSAGE = `Welcome to Sugg! By continuing this conversation, you consent to Sugg processing your data and contacting you via WhatsApp for admission counseling purposes. Reply STOP to withdraw consent.`;

export const CONSENT_LABELS: Record<string, string> = {
  DATA_PROCESSING: "Data Processing",
  CONTACT_WHATSAPP: "WhatsApp Contact",
  CONTACT_CALL: "Phone Contact",
  CONTACT_EMAIL: "Email Contact",
  SHARE_WITH_COLLEGES: "Share with Colleges",
  SHARE_WITH_AGENCIES: "Share with Agencies",
};

export function hasActiveConsent(
  consents: Array<{ consentType: string; consentGiven: boolean; withdrawnAt: Date | null }>,
  type: string
): boolean {
  const c = consents.find((x) => x.consentType === type);
  return !!c?.consentGiven && !c?.withdrawnAt;
}
