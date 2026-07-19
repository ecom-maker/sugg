"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, DollarSign, Info, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { upsertCourse, deleteCourse } from "@/actions/college-courses";
import { CourseCatalogPicker } from "@/components/college/course-catalog-picker";
import type { DegreeType } from "@/types";
import { getCurrencySymbol, type SlabRule } from "@/lib/commission-calculator";

const slabRuleSchema = z.object({
  min: z.coerce.number().min(1),
  max: z.coerce.number().min(1),
  amount: z.coerce.number().min(0),
});

const schema = z.object({
  name: z.string().min(2, "Course name required"),
  degreeType: z.enum(["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATE", "OTHER"]),
  duration: z.string().min(1, "Duration required"),
  durationMonths: z.coerce.number({ invalid_type_error: "Duration in months required" }).int().min(1, "Duration in months required"),
  eligibility: z.string().min(1, "Eligibility required"),
  totalSeats: z.coerce.number({ invalid_type_error: "Total seats required" }).int().min(1, "Total seats required"),
  availableSeats: z.coerce.number().int().min(0).optional(),
  annualFee: z.coerce.number({ invalid_type_error: "Annual fee required" }).min(1, "Annual fee required"),
  totalFee: z.coerce.number({ invalid_type_error: "Total fee required" }).min(1, "Total fee required"),
  description: z.string().min(1, "Description required"),
  isActive: z.boolean().default(true),
  // Commission — "None" is a valid choice, so the type stays optional. When a
  // paying commission type is picked, its value becomes required (refine below).
  commissionType: z.enum(["FIXED", "PERCENTAGE", "SLAB", ""]).optional(),
  commissionValue: z.coerce.number().min(0).optional(),
  commissionCurrency: z.string().min(1).default("INR"),
}).refine(
  (d) => !(d.commissionType === "FIXED" || d.commissionType === "PERCENTAGE") || (d.commissionValue != null && d.commissionValue > 0),
  { message: "Commission value required", path: ["commissionValue"] }
);

type FormData = z.infer<typeof schema>;

interface CourseData {
  id: string;
  name: string;
  degreeType: DegreeType;
  duration: string;
  durationMonths: number | null;
  eligibility: string | null;
  totalSeats: number | null;
  availableSeats: number | null;
  annualFee: { toString(): string } | null;
  totalFee: { toString(): string } | null;
  description: string | null;
  isActive: boolean;
  commissionType: string | null;
  commissionValue: { toString(): string } | null;
  commissionCurrency: string;
  commissionRules: unknown;
}

const DEGREE_TYPES = ["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATE", "OTHER"] as const;
const CURRENCIES = ["INR", "AED", "USD", "GBP", "EUR", "SGD", "AUD", "CAD"];

export function CourseForm({ course }: { course?: CourseData }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [slabRules, setSlabRules] = useState<SlabRule[]>(
    Array.isArray(course?.commissionRules) ? (course.commissionRules as SlabRule[]) : []
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: course
      ? {
          name: course.name,
          degreeType: course.degreeType,
          duration: course.duration,
          durationMonths: course.durationMonths ?? undefined,
          eligibility: course.eligibility ?? "",
          totalSeats: course.totalSeats ?? undefined,
          availableSeats: course.availableSeats ?? undefined,
          annualFee: course.annualFee ? Number(course.annualFee.toString()) : undefined,
          totalFee: course.totalFee ? Number(course.totalFee.toString()) : undefined,
          description: course.description ?? "",
          isActive: course.isActive,
          commissionType: (course.commissionType as FormData["commissionType"]) ?? "",
          commissionValue: course.commissionValue ? Number(course.commissionValue.toString()) : undefined,
          commissionCurrency: course.commissionCurrency ?? "INR",
        }
      : { isActive: true, degreeType: "BACHELOR", commissionCurrency: "INR", commissionType: "" },
  });

  const watchedType = useWatch({ control: form.control, name: "commissionType" });
  const watchedValue = useWatch({ control: form.control, name: "commissionValue" });
  const watchedFee = useWatch({ control: form.control, name: "annualFee" });
  const watchedCurrency = useWatch({ control: form.control, name: "commissionCurrency" }) ?? "INR";

  // Live commission preview
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!watchedType) { setPreview(null); return; }
    const tuition = Number(watchedFee ?? 0);
    const sym = getCurrencySymbol(watchedCurrency);
    if (watchedType === "FIXED") {
      const amt = Number(watchedValue ?? 0);
      setPreview(`Agency earns ${sym}${amt.toLocaleString()} per successful admission`);
    } else if (watchedType === "PERCENTAGE") {
      const pct = Number(watchedValue ?? 0);
      if (tuition > 0) {
        const est = (tuition * pct) / 100;
        setPreview(`Agency earns ${pct}% = ${sym}${est.toLocaleString()} per admission (based on annual fee)`);
      } else {
        setPreview(`Agency earns ${pct}% of tuition paid`);
      }
    } else if (watchedType === "SLAB") {
      if (slabRules.length === 0) {
        setPreview("Add slab tiers to configure commission");
      } else {
        const tiers = slabRules
          .map((r) => `apps ${r.min}–${r.max}: ${sym}${Number(r.amount).toLocaleString("en-IN")}`)
          .join(" · ");
        setPreview(`Fixed commission per admission — ${tiers}`);
      }
    }
  }, [watchedType, watchedValue, watchedFee, watchedCurrency, slabRules]);

  const addSlab = () =>
    setSlabRules((prev) => {
      const lastMax = prev.length ? prev[prev.length - 1].max : 0;
      return [...prev, { min: lastMax + 1, max: lastMax + 10, amount: 20000 }];
    });
  const removeSlab = (i: number) => setSlabRules(prev => prev.filter((_, idx) => idx !== i));
  const updateSlab = (i: number, field: keyof SlabRule, val: string) => {
    setSlabRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: Number(val) } : r));
  };

  const handleSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await upsertCourse(course?.id, {
        ...data,
        commissionType: data.commissionType || undefined,
        commissionRules: data.commissionType === "SLAB" ? slabRules : undefined,
      });
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: course ? "Course updated" : "Course created" });
      router.push("/college/courses");
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!course || !window.confirm(`Delete "${course.name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const result = await deleteCourse(course.id);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Course deleted" });
      router.push("/college/courses");
      router.refresh();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 rounded-md bg-muted/40 border p-3">
            <CourseCatalogPicker
              onSelect={(c) => {
                form.setValue("name", c.name, { shouldValidate: true });
                form.setValue("degreeType", c.degreeType as FormData["degreeType"], { shouldValidate: true });
                if (c.duration) form.setValue("duration", c.duration, { shouldValidate: true });
              }}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Course Name *</Label>
            <Input placeholder="e.g. Bachelor of Technology (Computer Science)" required {...form.register("name")} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Degree Type *</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required {...form.register("degreeType")}>
              {DEGREE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Duration *</Label>
            <Input placeholder="e.g. 4 years" required {...form.register("duration")} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (months) *</Label>
            <Input type="number" placeholder="48" required {...form.register("durationMonths")} />
            {form.formState.errors.durationMonths && <p className="text-xs text-destructive">{form.formState.errors.durationMonths.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Total Seats *</Label>
            <Input type="number" placeholder="60" required {...form.register("totalSeats")} />
            {form.formState.errors.totalSeats && <p className="text-xs text-destructive">{form.formState.errors.totalSeats.message}</p>}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Eligibility *</Label>
            <Input placeholder="e.g. 10+2 with PCM min. 60%" required {...form.register("eligibility")} />
            {form.formState.errors.eligibility && <p className="text-xs text-destructive">{form.formState.errors.eligibility.message}</p>}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description *</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              placeholder="Brief course description..."
              required
              {...form.register("description")}
            />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Fee Structure</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Annual Fee *</Label>
            <Input type="number" placeholder="200000" required {...form.register("annualFee")} />
            {form.formState.errors.annualFee && <p className="text-xs text-destructive">{form.formState.errors.annualFee.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Total Fee *</Label>
            <Input type="number" placeholder="800000" required {...form.register("totalFee")} />
            {form.formState.errors.totalFee && <p className="text-xs text-destructive">{form.formState.errors.totalFee.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Agency Commission ── */}
      <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-sm text-emerald-800 uppercase tracking-wide">Agency Commission</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Commission Type</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("commissionType")}
            >
              <option value="">None (no commission)</option>
              <option value="FIXED">Fixed Amount</option>
              <option value="PERCENTAGE">Percentage of Tuition</option>
              <option value="SLAB">Slab Based</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...form.register("commissionCurrency")}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Fixed or Percentage value */}
        {(watchedType === "FIXED" || watchedType === "PERCENTAGE") && (
          <div className="space-y-1.5">
            <Label>{watchedType === "FIXED" ? "Commission Amount *" : "Commission Percentage (%) *"}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {watchedType === "FIXED" ? getCurrencySymbol(watchedCurrency) : "%"}
              </span>
              <Input
                type="number"
                step="0.01"
                placeholder={watchedType === "FIXED" ? "5000" : "10"}
                className="pl-8"
                required
                {...form.register("commissionValue")}
              />
            </div>
            {form.formState.errors.commissionValue && <p className="text-xs text-destructive">{form.formState.errors.commissionValue.message}</p>}
          </div>
        )}

        {/* Slab Rules */}
        {watchedType === "SLAB" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Slab Rules (by application count)</Label>
              <button type="button" onClick={addSlab} className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                <Plus className="w-3 h-3" />Add Slab
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Fixed commission per admission, tiered by how many applications the agency brings.
              e.g. applications 1–10 → {getCurrencySymbol(watchedCurrency)}20,000, 11–20 → {getCurrencySymbol(watchedCurrency)}40,000.
            </p>
            {slabRules.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No slabs yet. Click &ldquo;Add Slab&rdquo; to create a tier.</p>
            )}
            <div className="space-y-2">
              {slabRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Applications from</Label>
                      <Input
                        type="number"
                        value={rule.min}
                        onChange={(e) => updateSlab(i, "min", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">to</Label>
                      <Input
                        type="number"
                        value={rule.max}
                        onChange={(e) => updateSlab(i, "max", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Commission ({getCurrencySymbol(watchedCurrency)})</Label>
                      <Input
                        type="number"
                        value={rule.amount}
                        onChange={(e) => updateSlab(i, "amount", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <button type="button" onClick={() => removeSlab(i)} className="text-red-400 hover:text-red-600 mt-4">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Preview */}
        {preview && (
          <div className="flex items-start gap-2 bg-emerald-100 rounded-lg p-3 text-sm text-emerald-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{preview}</span>
          </div>
        )}

        {!watchedType && (
          <p className="text-xs text-muted-foreground italic">Select a commission type to configure agency earnings for this course.</p>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <input type="checkbox" id="isActive" className="w-4 h-4 rounded" {...form.register("isActive")} />
        <Label htmlFor="isActive">Active (students can apply)</Label>
      </div>

      <div className="flex gap-3">
        {course && (
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {course ? "Save Changes" : "Create Course"}
        </Button>
      </div>
    </form>
  );
}
