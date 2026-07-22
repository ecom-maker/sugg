"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createBranch, updateBranch } from "@/actions/branches";

const schema = z.object({
  branchName: z.string().min(2, "Branch name required"),
  branchCode: z.string().min(2, "Branch code required").max(10, "Max 10 characters").toUpperCase(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export interface BranchData {
  id: string;
  branchName: string;
  branchCode: string;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export function CreateBranchForm({ branch }: { branch?: BranchData }) {
  const router = useRouter();
  const isEdit = Boolean(branch?.id);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: branch
      ? {
          branchName: branch.branchName,
          branchCode: branch.branchCode,
          city: branch.city ?? "",
          state: branch.state ?? "",
          country: branch.country ?? "",
          postalCode: branch.postalCode ?? "",
          phone: branch.phone ?? "",
          email: branch.email ?? "",
          address: branch.address ?? "",
        }
      : { branchCode: "" },
  });

  const handleSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = isEdit ? await updateBranch(branch!.id, data) : await createBranch(data);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: isEdit ? "Branch updated" : "Branch created successfully!" });
      router.push("/agency/branches");
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Info</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Branch Name *</Label>
            <Input placeholder="e.g. Mumbai Central Branch" {...form.register("branchName")} />
            {form.formState.errors.branchName && <p className="text-xs text-destructive">{form.formState.errors.branchName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Branch Code *</Label>
            <Input placeholder="e.g. MUM-01" {...form.register("branchCode")} className="uppercase" readOnly={isEdit} disabled={isEdit} />
            {isEdit ? (
              <p className="text-xs text-muted-foreground">Branch code can&apos;t be changed.</p>
            ) : (
              form.formState.errors.branchCode && <p className="text-xs text-destructive">{form.formState.errors.branchCode.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input placeholder="+91 9876543210" {...form.register("phone")} />
          </div>

          <div className="space-y-1.5 col-span-2">
            <Label>Email</Label>
            <Input type="email" placeholder="branch@agency.com" {...form.register("email")} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Location</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Address</Label>
            <Input placeholder="Street address" {...form.register("address")} />
          </div>

          <div className="space-y-1.5">
            <Label>City</Label>
            <Input placeholder="Mumbai" {...form.register("city")} />
          </div>

          <div className="space-y-1.5">
            <Label>State</Label>
            <Input placeholder="Maharashtra" {...form.register("state")} />
          </div>

          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input placeholder="India" {...form.register("country")} defaultValue="India" />
          </div>

          <div className="space-y-1.5">
            <Label>Postal Code</Label>
            <Input placeholder="400001" {...form.register("postalCode")} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Save changes" : "Create Branch"}
        </Button>
      </div>
    </form>
  );
}
