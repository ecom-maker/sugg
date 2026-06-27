import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <ShieldX className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You don&apos;t have permission to access this page. Contact your administrator if you think this is a mistake.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
