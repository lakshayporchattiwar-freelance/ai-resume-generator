"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSignupSuccess(false);
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await signInWithEmail(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          router.push(redirectTo);
        }
      } else {
        const result = await signUpWithEmail(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          setSignupSuccess(true);
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    await signInWithGoogle();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="h-8 w-8 text-accent-600" />
            <span className="typography-display text-neutral-900">ResumeForge</span>
          </Link>
          <h1 className="typography-heading-xl text-neutral-900 mb-2">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="typography-body-lg text-neutral-500">
            {mode === "login"
              ? "Sign in to save your resumes and analysis results"
              : "Sign up with your email or Google account"}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
          <Button
            variant="secondary"
            className="w-full h-11 gap-3 mb-4"
            onClick={handleGoogleLogin}
            disabled={authLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-neutral-0 px-3 text-neutral-400 uppercase tracking-wider">or</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            <div>
              <label className="typography-label text-neutral-700 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full h-10 rounded-lg border border-neutral-300 bg-neutral-0 pl-10 pr-3 typography-body-md text-neutral-900 placeholder:text-neutral-400 focus:border-accent-600 focus:outline-none focus:ring-[3px] focus:ring-accent-100"
                />
              </div>
            </div>
            <div>
              <label className="typography-label text-neutral-700 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full h-10 rounded-lg border border-neutral-300 bg-neutral-0 pl-10 pr-3 typography-body-md text-neutral-900 placeholder:text-neutral-400 focus:border-accent-600 focus:outline-none focus:ring-[3px] focus:ring-accent-100"
                />
              </div>
            </div>

            {(error || callbackError) && (
              <div className="flex items-center gap-2 text-error-600 bg-error-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="typography-body-md">{error || (callbackError === "auth_failed" ? "Authentication failed. Please try again." : callbackError === "no_code" ? "OAuth code missing. Please try again." : callbackError?.startsWith("oauth_") ? `OAuth error: ${callbackError.replace("oauth_", "")}` : "Authentication failed. Please try again.")}</p>
              </div>
            )}

            {signupSuccess && (
              <div className="flex items-center gap-2 text-success-600 bg-success-50 rounded-lg px-3 py-2">
                <p className="typography-body-md">Account created! Check your email to verify, then sign in.</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading} disabled={authLoading}>
              {mode === "login" ? "Sign In" : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="typography-body-md text-center text-neutral-500 mt-4">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setSignupSuccess(false); }}
              className="text-accent-600 hover:text-accent-700 font-medium"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="typography-caption text-center text-neutral-400 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-accent-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
