import { create } from "zustand";

interface TemplateState {
  selectedTemplateId: string;
  zoom: number;
  setTemplate: (templateId: string) => void;
  setZoom: (zoom: number) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  selectedTemplateId: "modern",
  zoom: 100,

  setTemplate: (templateId) => set({ selectedTemplateId: templateId }),
  setZoom: (zoom) => set({ zoom: Math.min(150, Math.max(50, zoom)) }),
}));
