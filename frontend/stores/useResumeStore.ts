import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  Resume, PersonalDetails, ExperienceEntry, EducationEntry,
  ProjectEntry, SkillGroup, CertificationEntry, AchievementEntry,
  ReferenceEntry, ReferencesMode, ResumeSource,
} from "@/types/resume";

interface ResumeState {
  resume: Resume;
  dirty: boolean;
  sectionValidation: Record<string, string[]>;
  setResume: (resume: Resume) => void;
  updatePersonalDetails: (details: Partial<PersonalDetails>) => void;
  setProfessionalSummary: (summary: string | undefined) => void;
  addExperience: () => void;
  updateExperience: (id: string, data: Partial<ExperienceEntry>) => void;
  removeExperience: (id: string) => void;
  reorderExperience: (fromIndex: number, toIndex: number) => void;
  addEducation: () => void;
  updateEducation: (id: string, data: Partial<EducationEntry>) => void;
  removeEducation: (id: string) => void;
  addProject: () => void;
  updateProject: (id: string, data: Partial<ProjectEntry>) => void;
  removeProject: (id: string) => void;
  addSkillGroup: () => void;
  updateSkillGroup: (index: number, data: Partial<SkillGroup>) => void;
  removeSkillGroup: (index: number) => void;
  addCertification: () => void;
  updateCertification: (id: string, data: Partial<CertificationEntry>) => void;
  removeCertification: (id: string) => void;
  addAchievement: () => void;
  updateAchievement: (id: string, data: Partial<AchievementEntry>) => void;
  removeAchievement: (id: string) => void;
  setReferences: (refs: ReferenceEntry[] | ReferencesMode | undefined) => void;
  resetResume: () => void;
  loadParsedResume: (resume: Resume) => void;
}

function createEmptyResume(source: ResumeSource = "created"): Resume {
  return {
    personal_details: { full_name: "" },
    meta: {
      source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

export const useResumeStore = create<ResumeState>((set) => ({
  resume: createEmptyResume(),
  dirty: false,
  sectionValidation: {},

  setResume: (resume) => set({ resume, dirty: false }),

  updatePersonalDetails: (details) =>
    set((state) => ({
      resume: {
        ...state.resume,
        personal_details: { ...state.resume.personal_details, ...details },
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  setProfessionalSummary: (summary) =>
    set((state) => ({
      resume: {
        ...state.resume,
        professional_summary: summary,
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  addExperience: () =>
    set((state) => {
      const existing = state.resume.experience || [];
      return {
        resume: {
          ...state.resume,
          experience: [
            ...existing,
            {
              id: uuidv4(),
              company_name: "",
              job_title: "",
              start_date: "",
              end_date: "present",
              description_bullets: [],
              order_index: existing.length,
            },
          ],
          meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
        },
        dirty: true,
      };
    }),

  updateExperience: (id, data) =>
    set((state) => ({
      resume: {
        ...state.resume,
        experience: (state.resume.experience || []).map((e) =>
          e.id === id ? { ...e, ...data } : e
        ),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  removeExperience: (id) =>
    set((state) => ({
      resume: {
        ...state.resume,
        experience: (state.resume.experience || [])
          .filter((e) => e.id !== id)
          .map((e, i) => ({ ...e, order_index: i })),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  reorderExperience: (fromIndex, toIndex) =>
    set((state) => {
      const entries = [...(state.resume.experience || [])];
      const [moved] = entries.splice(fromIndex, 1);
      entries.splice(toIndex, 0, moved);
      return {
        resume: {
          ...state.resume,
          experience: entries.map((e, i) => ({ ...e, order_index: i })),
          meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
        },
        dirty: true,
      };
    }),

  addEducation: () =>
    set((state) => {
      const existing = state.resume.education || [];
      return {
        resume: {
          ...state.resume,
          education: [
            ...existing,
            { id: uuidv4(), institution_name: "", degree: "", order_index: existing.length },
          ],
          meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
        },
        dirty: true,
      };
    }),

  updateEducation: (id, data) =>
    set((state) => ({
      resume: {
        ...state.resume,
        education: (state.resume.education || []).map((e) =>
          e.id === id ? { ...e, ...data } : e
        ),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  removeEducation: (id) =>
    set((state) => ({
      resume: {
        ...state.resume,
        education: (state.resume.education || [])
          .filter((e) => e.id !== id)
          .map((e, i) => ({ ...e, order_index: i })),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  addProject: () =>
    set((state) => {
      const existing = state.resume.projects || [];
      return {
        resume: {
          ...state.resume,
          projects: [
            ...existing,
            { id: uuidv4(), project_name: "", description_bullets: [], order_index: existing.length },
          ],
          meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
        },
        dirty: true,
      };
    }),

  updateProject: (id, data) =>
    set((state) => ({
      resume: {
        ...state.resume,
        projects: (state.resume.projects || []).map((p) =>
          p.id === id ? { ...p, ...data } : p
        ),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  removeProject: (id) =>
    set((state) => ({
      resume: {
        ...state.resume,
        projects: (state.resume.projects || [])
          .filter((p) => p.id !== id)
          .map((p, i) => ({ ...p, order_index: i })),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  addSkillGroup: () =>
    set((state) => ({
      resume: {
        ...state.resume,
        skills: [...(state.resume.skills || []), { skills: [] }],
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  updateSkillGroup: (index, data) =>
    set((state) => ({
      resume: {
        ...state.resume,
        skills: (state.resume.skills || []).map((sg, i) =>
          i === index ? { ...sg, ...data } : sg
        ),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  removeSkillGroup: (index) =>
    set((state) => ({
      resume: {
        ...state.resume,
        skills: (state.resume.skills || []).filter((_, i) => i !== index),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  addCertification: () =>
    set((state) => ({
      resume: {
        ...state.resume,
        certifications: [
          ...(state.resume.certifications || []),
          { id: uuidv4(), certification_name: "" },
        ],
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  updateCertification: (id, data) =>
    set((state) => ({
      resume: {
        ...state.resume,
        certifications: (state.resume.certifications || []).map((c) =>
          c.id === id ? { ...c, ...data } : c
        ),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  removeCertification: (id) =>
    set((state) => ({
      resume: {
        ...state.resume,
        certifications: (state.resume.certifications || []).filter((c) => c.id !== id),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  addAchievement: () =>
    set((state) => {
      const existing = state.resume.achievements || [];
      return {
        resume: {
          ...state.resume,
          achievements: [
            ...existing,
            { id: uuidv4(), statement: "", order_index: existing.length },
          ],
          meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
        },
        dirty: true,
      };
    }),

  updateAchievement: (id, data) =>
    set((state) => ({
      resume: {
        ...state.resume,
        achievements: (state.resume.achievements || []).map((a) =>
          a.id === id ? { ...a, ...data } : a
        ),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  removeAchievement: (id) =>
    set((state) => ({
      resume: {
        ...state.resume,
        achievements: (state.resume.achievements || [])
          .filter((a) => a.id !== id)
          .map((a, i) => ({ ...a, order_index: i })),
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  setReferences: (refs) =>
    set((state) => ({
      resume: {
        ...state.resume,
        references: refs,
        meta: { ...state.resume.meta, updated_at: new Date().toISOString() },
      },
      dirty: true,
    })),

  resetResume: () => set({ resume: createEmptyResume(), dirty: false }),

  loadParsedResume: (resume) => set({ resume, dirty: false }),
}));
