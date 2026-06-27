"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, DollarSign, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "@/components/shared/stats-card";
import { approveCommission } from "@/actions/commissions";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CommissionStatus, CommissionType } from "@/types";

interface Transaction {
  id: string;
  type: CommissionType;
  tuitionAmount: { toString(): string } | number | string;
  commissionAmount: { toString(): string } | number | string;
  commissionRate: { toString(): string } | number | null;
  status: CommissionStatus;
  createdAt: Date;
  application: {
    student: { name: string; mobile: string };
    course: { name: string };
  };
  agency: { name: string } | null;
  college: { name: string };
}

interface SummaryStat {
  status: CommissionStatus;
  _sum: { commissionAmount: { toNumber(): number } | number | null };
  _count: { id: number };
}

export function CommissionsManagementPage({
  transactions,
  total,
  page,
  limit,
  searchParams,
  summaryStats,
}: {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  searchParams: Record<string, string | undefined>;
  summaryStats: SummaryStat[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getStat = (status: CommissionStatus) => {
    const s = summaryStats.find((st) => st.status === status);
    const rawAmount = s?._sum?.commissionAmount;
    const amount = rawAmount == null ? 0 :
      typeof rawAmount === "object" && "toNumber" in rawAmount
        ? rawAmount.toNumber()
        : Number(rawAmount);
    return { count: s?._count?.id ?? 0, amount };
  };

  const pending = getStat("PENDING");
  const approved = getStat("APPROVED");
  const paid = getStat("PAID");

  const handleApprove = async (transactionId: string) => {
    setLoadingId(transactionId);
    const result = await approveCommission(transactionId);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Commission approved" });
      router.refresh();
    }
    setLoadingId(null);
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams as Record<string, string>);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const statusBadge: Record<CommissionStatus, React.ReactElement> = {
    PENDING: <Badge variant="warning">Pending</Badge>,
    APPROVED: <Badge variant="info">Approved</Badge>,
    PAID: <Badge variant="success">Paid</Badge>,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commission Management</h1>
        <p className="text-muted-foreground mt-1">{total} total transactions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatsCard
          title="Pending Approval"
          value={formatCurrency(pending.amount)}
          icon={Clock}
          description={`${pending.count} transactions`}
          iconClassName="text-yellow-600 bg-yellow-50"
        />
        <StatsCard
          title="Approved"
          value={formatCurrency(approved.amount)}
          icon={CheckCircle}
          description={`${approved.count} transactions`}
          iconClassName="text-blue-600 bg-blue-50"
        />
        <StatsCard
          title="Paid Out"
          value={formatCurrency(paid.amount)}
          icon={DollarSign}
          description={`${paid.count} transactions`}
          iconClassName="text-green-600 bg-green-50"
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={searchParams.status ?? "all"}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">College / Course</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Agency</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tuition</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Commission</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{tx.application.student.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.application.student.mobile}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <p>{tx.college.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.application.course.name}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {tx.agency?.name ?? "Direct"}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(typeof tx.tuitionAmount === "object" ? (tx.tuitionAmount as { toString(): string }).toString() as unknown as number : Number(tx.tuitionAmount))}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(typeof tx.commissionAmount === "object" ? parseFloat((tx.commissionAmount as { toString(): string }).toString()) : Number(tx.commissionAmount))}
                  {tx.commissionRate && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({typeof tx.commissionRate === "object" ? (tx.commissionRate as { toString(): string }).toString() : tx.commissionRate}%)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{statusBadge[tx.status]}</td>
                <td className="px-4 py-3 text-right">
                  {tx.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === tx.id}
                      onClick={() => handleApprove(tx.id)}
                      className="h-7 text-green-700 border-green-200 hover:bg-green-50"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No commission transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
