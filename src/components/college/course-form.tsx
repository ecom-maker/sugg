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
import {
  calculateCourseCommission,
  getCurrencySymbol,
  type SlabRule,
} from "@/lib/commission-calculator";

const slabRuleSchema = z.object({
  min: z.coerce.number().min(0),
  max: z.coerce.number().min(1),
  percentage: z.coerce.number().min(0.01).max(100),
});

const schema = z.object({
  name: z.string().min(2, "Course name required"),
  degreeType: z.enum(["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "CERTIFICATE", "OTHER"]),
  duration: z.string().min(1, "Duration required"),
  durationMonths: z.coerce.number().int().min(1).optional(),
  eligibility: z.string().optional(),
  totalSeats: z.coerce.number().int().min(1).optional(),
  availableSeats: z.coerce.number().int().min(0).optional(),
  annualFee: z.coerce.number().min(0).optional(),
  totalFee: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  // Commission
  commissionType: z.enum(["FIXED", "PERCENTAGE", "SLAB", ""]).optional(),
  commissionValue: z.coerce.number().min(0).optional(),
  commissionCurrency: z.string().min(1).default("INR"),
});

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
        setPreview("Add slab rules to configure commission");
      } else if (tuition > 0) {
        const result = calculateCourseCommission({ commissionType: "SLAB", commissionValue: 0, commissionRules: slabRules }, tuition, watchedCurrency);
        if (result) setPreview(`Agency earns ${sym}${result.commissionAmount.toLocaleString()} at ${result.appliedRate}% (${sym}${tuition.toLocaleString()} tuition)`);
      } else {
        const rates = slabRules.map(r => `${r.percentage}%`).join(" / ");
        setPreview(`Slab rates: ${rates}`);
      }
    }
  }, [watchedType, watchedValue, watchedFee, watchedCurrency, slabRules]);

  const addSlab = () => setSlabRules(prev => [...prev, { min: 0, max: 100000, percentage: 10 }]);
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
            <Input placeholder="e.g. Bachelor of Technology (Computer Science)" {...form.register("name")} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Degree Type *</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...form.register("degreeType")}>
              {DEGREE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Duration *</Label>
            <Input placeholder="e.g. 4 years" {...form.register("duration")} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (months)</Label>
            <Input type="number" placeholder="48" {...form.register("durationMonths")} />
          </div>
          <div className="space-y-1.5">
            <Label>Total Seats</Label>
            <Input type="number" placeholder="60" {...form.register("totalSeats")} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Eligibility</Label>
            <Input placeholder="e.g. 10+2 with PCM min. 60%" {...form.register("eligibility")} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              placeholder="Brief course description..."
              {...form.register("description")}
            />
          </div>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Fee Structure</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Annual Fee</Label>
            <Input type="number" placeholder="200000" {...form.register("annualFee")} />
          </div>
          <div className="space-y-1.5">
            <Label>Total Fee</Label>
            <Input type="number" placeholder="800000" {...form.register("totalFee")} />
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
            <Label>{watchedType === "FIXED" ? "Commission Amount" : "Commission Percentage (%)"}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {watchedType === "FIXED" ? getCurrencySymbol(watchedCurrency) : "%"}
              </span>
              <Input
                type="number"
                step="0.01"
                placeholder={watchedType === "FIXED" ? "5000" : "10"}
                className="pl-8"
                {...form.register("commissionValue")}
              />
            </div>
          </div>
        )}

        {/* Slab Rules */}
        {watchedType === "SLAB" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Slab Rules</Label>
              <button type="button" onClick={addSlab} className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                <Plus className="w-3 h-3" />Add Slab
              </button>
            </div>
            {slabRules.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No slabs yet. Click &ldquo;Add Slab&rdquo; to create a rule.</p>
            )}
            <div className="space-y-2">
              {slabRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Min ({getCurrencySymbol(watchedCurrency)})</Label>
                      <Input
                        type="number"
                        value={rule.min}
                        onChange={(e) => updateSlab(i, "min", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max ({getCurrencySymbol(watchedCurrency)})</Label>
                      <Input
                        type="number"
                        value={rule.max}
                        onChange={(e) => updateSlab(i, "max", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rule.percentage}
                        onChange={(e) => updateSlab(i, "percentage", e.target.value)}
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
