"use client";

import { useState, useEffect } from "react";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONSENT_LABELS } from "@/lib/consent";

const CONSENT_TYPES = [
  "DATA_PROCESSING", "CONTACT_WHATSAPP", "CONTACT_CALL",
  "CONTACT_EMAIL", "SHARE_WITH_COLLEGES", "SHARE_WITH_AGENCIES",
];

export function StudentConsentTab({ studentId }: { studentId: string }) {
  const [consents, setConsents] = useState<Array<{
    id: string; consentType: string; consentGiven: boolean;
    consentSource: string; capturedAt: string; withdrawnAt: string | null;
    capturedBy: { fullName: string } | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/students/${studentId}/consents`)
      .then((r) => r.json())
      .then((d) => { setConsents(d.consents ?? []); setLoading(false); });
  };

  useEffect(() => { load(); }, [studentId]);

  const capture = async (consentType: string) => {
    await fetch(`/api/students/${studentId}/consents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentType, consentGiven: true, consentSource: "MANUAL" }),
    });
    load();
  };

  const withdraw = async (consentId: string) => {
    await fetch(`/api/students/${studentId}/consents/${consentId}/withdraw`, { method: "PUT" });
    load();
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  const consentMap = new Map(consents.map((c) => [c.consentType, c]));

  return (
    <div className="space-y-3">
      {CONSENT_TYPES.map((type) => {
        const c = consentMap.get(type);
        const active = c?.consentGiven && !c?.withdrawnAt;
        return (
          <Card key={type}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${active ? "text-green-600" : "text-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium">{CONSENT_LABELS[type] ?? type}</p>
                  {c && (
                    <p className="text-xs text-muted-foreground">
                      {c.consentSource} · {new Date(c.capturedAt).toLocaleDateString()}
                      {c.capturedBy && ` · ${c.capturedBy.fullName}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Not given"}</Badge>
                {!active && <Button size="sm" variant="outline" onClick={() => capture(type)}>Capture</Button>}
                {active && c && <Button size="sm" variant="ghost" onClick={() => withdraw(c.id)}>Withdraw</Button>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
