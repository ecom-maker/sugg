"use client";

import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChecklistItem } from "@/lib/document-checklist";

interface DocumentChecklistProps {
  items: ChecklistItem[];
  showOverride?: boolean;
  overrideReason?: string;
  onOverrideReasonChange?: (reason: string) => void;
}

export function DocumentChecklist({
  items,
  showOverride,
  overrideReason,
  onOverrideReasonChange,
}: DocumentChecklistProps) {
  const missing = items.filter((i) => i.required && !i.uploaded);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Document Checklist</h4>
        <Badge variant={missing.length === 0 ? "success" : "warning"}>
          {items.filter((i) => i.uploaded).length}/{items.length} uploaded
        </Badge>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.documentType} className="flex items-center gap-2 text-sm">
            {item.verified ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : item.uploaded ? (
              <Clock className="w-4 h-4 text-amber-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={!item.uploaded && item.required ? "text-red-700" : ""}>{item.label}</span>
            {item.expiryDate && (
              <span className="text-xs text-amber-600">exp. {new Date(item.expiryDate).toLocaleDateString()}</span>
            )}
          </li>
        ))}
      </ul>

      {missing.length > 0 && showOverride && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
          <p className="text-xs text-amber-800">{missing.length} required document(s) missing. Provide a reason to override:</p>
          <textarea
            className="w-full text-sm border rounded p-2"
            placeholder="Override reason (required)"
            value={overrideReason ?? ""}
            onChange={(e) => onOverrideReasonChange?.(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
