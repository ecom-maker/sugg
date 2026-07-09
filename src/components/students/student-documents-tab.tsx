"use client";

import { useState, useEffect } from "react";
import { Loader2, Upload, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const DOC_TYPES = [
  "PASSPORT", "TENTH_MARKSHEET", "TWELFTH_MARKSHEET", "BACHELOR_DEGREE",
  "IELTS_SCORE", "SOP", "PHOTO", "RESUME", "OTHER",
];

export function StudentDocumentsTab({ studentId }: { studentId: string }) {
  const [docs, setDocs] = useState<Array<{
    id: string; documentType: string; documentName: string;
    verificationStatus: string; expiryDate: string | null; fileSize: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("PASSPORT");
  const [expiryDate, setExpiryDate] = useState("");

  const load = () => {
    fetch(`/api/students/${studentId}/documents`)
      .then((r) => r.json())
      .then((d) => { setDocs(d.documents ?? []); setLoading(false); });
  };

  useEffect(() => { load(); }, [studentId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentType", docType);
    fd.append("documentName", file.name);
    if (expiryDate) fd.append("expiryDate", expiryDate);
    await fetch(`/api/students/${studentId}/documents`, { method: "POST", body: fd });
    setUploading(false);
    load();
  };

  const verify = async (docId: string, status: string) => {
    await fetch(`/api/students/${studentId}/documents/${docId}/verify`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const viewDoc = async (docId: string) => {
    const res = await fetch(`/api/students/${studentId}/documents/${docId}`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  const statusIcon = (s: string) => {
    if (s === "VERIFIED") return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (s === "REJECTED") return <XCircle className="w-4 h-4 text-red-600" />;
    if (s === "EXPIRED") return <Clock className="w-4 h-4 text-amber-600" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Document Type</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Expiry (optional)</label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-40" />
          </div>
          <label>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={handleUpload} />
            <Button variant="outline" disabled={uploading} asChild>
              <span><Upload className="w-4 h-4 mr-1" />{uploading ? "Uploading..." : "Upload"}</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{d.documentName}</p>
                    <p className="text-xs text-muted-foreground">{d.documentType.replace(/_/g, " ")} · {(d.fileSize / 1024).toFixed(0)} KB</p>
                    {d.expiryDate && <p className="text-xs text-amber-600">Expires: {new Date(d.expiryDate).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon(d.verificationStatus)}
                  <Badge variant="outline">{d.verificationStatus}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => viewDoc(d.id)}>View</Button>
                  {d.verificationStatus === "PENDING" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => verify(d.id, "VERIFIED")}>Verify</Button>
                      <Button size="sm" variant="outline" onClick={() => verify(d.id, "REJECTED")}>Reject</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
