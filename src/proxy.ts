import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/colleges",
  // Public college self-registration flow (pre-auth: the account isn't active
  // until a Super Admin approves it). Listed as specific paths so the protected
  // /college dashboard stays gated.
  "/college/register",
  "/college/verify",
  "/college/pending",
  // Public agency self-registration flow (same pattern; /agency dashboard stays
  // gated).
  "/agency/register",
  "/agency/verify",
  "/agency/pending",
  // Auth callback (email OTP / recovery / OAuth). Must run for unauthenticated
  // users — it's what establishes the session (e.g. password-reset links).
  "/auth/callback",
  "/",
];
const authRoutes = ["/login", "/register"];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname === route);
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // API webhook routes - always allow
  if (pathname.startsWith("/api/whatsapp/webhook")) {
    return supabaseResponse;
  }

  // Authenticated user trying to access auth routes → redirect to dashboard
  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Unauthenticated user trying to access protected routes → redirect to login
  if (!user && !isPublicRoute(pathname) && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Rate limiting headers
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
