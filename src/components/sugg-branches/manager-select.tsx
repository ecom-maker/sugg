"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

const NONE = "__none__";

interface ManagerSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
}

/**
 * Picks the user to assign as Sugg Branch Manager. Assigning promotes the user
 * to the SUGG_BRANCH_MANAGER role server-side.
 */
export function ManagerSelect({ value, onChange, disabled }: ManagerSelectProps) {
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/users?limit=50")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
  }, []);

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a manager" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Unassigned</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.fullName} · {u.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
