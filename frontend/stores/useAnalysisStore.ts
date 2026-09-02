import { create } from "zustand";
import type { ATSScoreResult } from "@/types/analysis";

interface AnalysisState {
  scoreResult: ATSScoreResult | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
  setScoreResult: (result: ATSScoreResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markStale: () => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  scoreResult: null,
  isLoading: false,
  error: null,
  isStale: false,

  setScoreResult: (result) =>
    set({ scoreResult: result, isLoading: false, error: null, isStale: false }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  markStale: () => set({ isStale: true }),

  reset: () =>
    set({ scoreResult: null, isLoading: false, error: null, isStale: false }),
}));
