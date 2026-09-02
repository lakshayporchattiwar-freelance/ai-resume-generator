import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ErrorBoundary } from "@/components/auth/ErrorBoundary";

export const metadata: Metadata = {
  title: "ResumeForge — AI Resume Builder & ATS Optimizer",
  description: "Create, refine, and tailor resumes against job descriptions using AI. Get ATS-compatible scores and export professional resumes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          <ErrorBoundary>
            <div className="page-shell flex flex-col min-h-screen">
              {children}
            </div>
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
