import { create } from "zustand";
import type { JobDescriptionAnalysis, JobDescriptionInput } from "@/types/job_description";

interface JobDescriptionState {
  input: JobDescriptionInput;
  analysis: JobDescriptionAnalysis | null;
  isLoading: boolean;
  error: string | null;
  setInput: (input: Partial<JobDescriptionInput>) => void;
  setAnalysis: (analysis: JobDescriptionAnalysis) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useJobDescriptionStore = create<JobDescriptionState>((set) => ({
  input: { source_type: "pasted_text" },
  analysis: null,
  isLoading: false,
  error: null,

  setInput: (input) =>
    set((state) => ({ input: { ...state.input, ...input } })),

  setAnalysis: (analysis) =>
    set({ analysis, isLoading: false, error: null }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),

  reset: () =>
    set({ input: { source_type: "pasted_text" }, analysis: null, isLoading: false, error: null }),
}));
