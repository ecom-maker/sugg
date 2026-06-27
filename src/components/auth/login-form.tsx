"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const emailOtpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const phoneSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid phone number with country code"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof emailOtpSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;

type Step = "input" | "otp";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("input");
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [pendingEmail, setPendingEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(emailOtpSchema),
  });

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        if (error.message.includes("Signups not allowed")) {
          toast({
            title: "Account not found",
            description: "No account exists with this email. Contact your administrator.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
        return;
      }

      setPendingEmail(data.email);
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: `A 6-digit code has been sent to ${data.email}`,
      });
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (data: OtpFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: data.otp,
        type: "email",
      });

      if (error) {
        toast({ title: "Invalid OTP", description: "The code is incorrect or expired. Please try again.", variant: "destructive" });
        return;
      }

      toast({ title: "Signed in successfully" });
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (data: PhoneFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: data.phone,
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      toast({
        title: "OTP Sent",
        description: `A verification code has been sent to ${data.phone}`,
      });
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We sent a 6-digit code to <strong>{pendingEmail}</strong>
          </p>
        </div>

        <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14"
              {...otpForm.register("otp")}
            />
            {otpForm.formState.errors.otp && (
              <p className="text-xs text-destructive">{otpForm.formState.errors.otp.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verify & Sign In
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setStep("input")}
            className="text-sm text-primary hover:underline"
          >
            ← Use a different email
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive the code?{" "}
            <button
              onClick={() => handleEmailSubmit({ email: pendingEmail })}
              disabled={isLoading}
              className="text-primary hover:underline disabled:opacity-50"
            >
              Resend OTP
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "phone")}>
      <TabsList className="w-full mb-6">
        <TabsTrigger value="email" className="flex-1">
          <Mail className="w-4 h-4 mr-2" />
          Email OTP
        </TabsTrigger>
        <TabsTrigger value="phone" className="flex-1">
          <Phone className="w-4 h-4 mr-2" />
          Phone OTP
        </TabsTrigger>
      </TabsList>

      <TabsContent value="email">
        <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@sugg.in"
              className="h-11"
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email && (
              <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send OTP
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="phone">
        <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9876543210"
              className="h-11"
              {...phoneForm.register("phone")}
            />
            {phoneForm.formState.errors.phone && (
              <p className="text-xs text-destructive">{phoneForm.formState.errors.phone.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Include country code (e.g. +91 for India)</p>
          </div>

          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send OTP
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
