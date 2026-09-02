"use client";

import { useEffect, useRef } from "react";
import { useResumeStore } from "@/stores/useResumeStore";
import { useAuth } from "@/lib/auth";
import { saveResumeToSupabase, updateResumeInSupabase } from "@/lib/supabase/data";

export function useAutoSave() {
  const resume = useResumeStore((s) => s.resume);
  const dirty = useResumeStore((s) => s.dirty);
  const { user } = useAuth();
  const resumeIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!user || !dirty || savingRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;

      try {
        if (resumeIdRef.current) {
          const ok = await updateResumeInSupabase(resumeIdRef.current, resume);
          if (!ok) {
            resumeIdRef.current = null;
          }
        } else {
          const id = await saveResumeToSupabase(resume);
          if (id) {
            resumeIdRef.current = id;
          }
        }
      } catch (e) {
        console.error("Auto-save failed:", e);
      } finally {
        savingRef.current = false;
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resume, dirty, user]);
}
