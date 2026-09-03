"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) {
            console.error("Code exchange error:", error.message);
            router.replace("/login?error=auth_failed");
            return;
          }
        } else {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            console.error("Session error:", error?.message);
            router.replace("/login?error=auth_failed");
            return;
          }
        }

        router.replace("/build");
      } catch (err) {
        console.error("Callback exception:", err);
        router.replace("/login?error=auth_failed");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-accent-600" />
        <p className="typography-body-md text-neutral-500">Signing you in...</p>
      </div>
    </div>
  );
}
