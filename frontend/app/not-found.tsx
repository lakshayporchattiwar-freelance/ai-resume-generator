import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="typography-display text-neutral-900 mb-4">404</h1>
        <p className="typography-body-lg text-neutral-500 mb-8">
          This page could not be found. It may have been moved or deleted.
        </p>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
