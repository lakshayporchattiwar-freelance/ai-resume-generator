import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        response = NextResponse.next({ request });
      },
    },
  });

  await supabase.auth.getUser();

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const protectedRoutes = ["/dashboard", "/build", "/upload", "/job-description", "/analysis", "/preview"];
  const authRoutes = ["/login"];

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (authRoutes.some((route) => pathname.startsWith(route)) && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/build/:path*", "/upload/:path*", "/job-description/:path*", "/analysis/:path*", "/preview/:path*", "/login"],
};
