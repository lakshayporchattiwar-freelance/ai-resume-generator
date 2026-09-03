"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Code exchange error:", error.message);
            router.replace("/login?error=auth_failed");
            return;
          }
          router.replace("/dashboard");
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          router.replace("/dashboard");
          return;
        }

        if (window.location.hash && window.location.hash.includes("access_token")) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            router.replace("/dashboard");
            return;
          }
        }

        router.replace("/login?error=auth_failed");
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
