"use client";

import { useState } from "react";
import { useResumeStore } from "@/stores/useResumeStore";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useAuth } from "@/lib/auth";
import { TextInput } from "@/components/ui/TextInput";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AISuggestionPanel } from "@/features/ai-analysis/components/AISuggestionPanel";
import { formatDate } from "@/lib/utils/helpers";
import {
  User, FileText, Briefcase, GraduationCap, FolderKanban,
  Wrench, Award, Trophy, UsersRound, Plus, Trash2, ChevronDown, ChevronUp, X,
  Link as LinkIcon, LogOut,
} from "lucide-react";
import Link from "next/link";

const SECTIONS = [
  { id: "personal_details", label: "Personal Details", icon: User, required: true },
  { id: "professional_summary", label: "Summary", icon: FileText, required: false },
  { id: "experience", label: "Experience", icon: Briefcase, required: false },
  { id: "education", label: "Education", icon: GraduationCap, required: false },
  { id: "projects", label: "Projects", icon: FolderKanban, required: false },
  { id: "skills", label: "Skills", icon: Wrench, required: false },
  { id: "certifications", label: "Certifications", icon: Award, required: false },
  { id: "achievements", label: "Achievements", icon: Trophy, required: false },
  { id: "references", label: "References", icon: UsersRound, required: false },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function PersonalDetailsSection() {
  const resume = useResumeStore((s) => s.resume);
  const updatePersonalDetails = useResumeStore((s) => s.updatePersonalDetails);
  const pd = resume.personal_details;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextInput
          label="Full Name"
          required
          value={pd.full_name}
          onChange={(e) => updatePersonalDetails({ full_name: e.target.value })}
          placeholder="John Doe"
        />
        <TextInput
          label="Professional Title"
          value={pd.professional_title || ""}
          onChange={(e) => updatePersonalDetails({ professional_title: e.target.value })}
          placeholder="Senior Software Engineer"
        />
        <TextInput
          label="Email"
          type="email"
          value={pd.email || ""}
          onChange={(e) => updatePersonalDetails({ email: e.target.value })}
          placeholder="john@example.com"
        />
        <TextInput
          label="Phone"
          value={pd.phone || ""}
          onChange={(e) => updatePersonalDetails({ phone: e.target.value })}
          placeholder="+1 555 0123"
        />
        <TextInput
          label="Location"
          value={pd.location || ""}
          onChange={(e) => updatePersonalDetails({ location: e.target.value })}
          placeholder="San Francisco, CA"
          className="md:col-span-2"
        />
      </div>
      {(pd.links || []).map((link, i) => (
        <div key={i} className="flex items-end gap-3">
          <TextInput
            label="Link Label"
            value={link.label}
            onChange={(e) => {
              const links = [...(pd.links || [])];
              links[i] = { ...links[i], label: e.target.value };
              updatePersonalDetails({ links });
            }}
            placeholder="LinkedIn"
          />
          <TextInput
            label="URL"
            value={link.url}
            onChange={(e) => {
              const links = [...(pd.links || [])];
              links[i] = { ...links[i], url: e.target.value };
              updatePersonalDetails({ links });
            }}
            placeholder="https://linkedin.com/in/johndoe"
            className="flex-1"
          />
          <Button variant="ghost" size="sm" onClick={() => {
            const links = (pd.links || []).filter((_, j) => j !== i);
            updatePersonalDetails({ links });
          }}>
            <Trash2 className="h-4 w-4 text-neutral-400" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => {
        const links = [...(pd.links || []), { label: "", url: "" }];
        updatePersonalDetails({ links });
      }}>
        <LinkIcon className="h-4 w-4" />
        Add Link
      </Button>
    </div>
  );
}

function SummarySection() {
  const summary = useResumeStore((s) => s.resume.professional_summary);
  const setSummary = useResumeStore((s) => s.setProfessionalSummary);
  const markStale = useAnalysisStore((s) => s.markStale);

  return (
    <div className="flex flex-col gap-4">
      <TextArea
        label="Professional Summary"
        value={summary || ""}
        onChange={(e) => { setSummary(e.target.value || undefined); markStale(); }}
        placeholder="A brief summary of your professional background and key strengths..."
        helperText={`${(summary || "").length}/800 characters`}
        maxLength={800}
        rows={5}
      />
      <AISuggestionPanel
        actionType={summary ? "rewrite_summary" : "generate_summary"}
        sourceContent={summary}
        onAccept={(content) => { setSummary(content); markStale(); }}
        label={summary ? "Rewrite with AI" : "Generate with AI"}
      />
    </div>
  );
}

function ExperienceSection() {
  const experience = useResumeStore((s) => s.resume.experience) || [];
  const addExperience = useResumeStore((s) => s.addExperience);
  const updateExperience = useResumeStore((s) => s.updateExperience);
  const removeExperience = useResumeStore((s) => s.removeExperience);
  const markStale = useAnalysisStore((s) => s.markStale);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col gap-4">
      {experience.map((exp) => {
        const isExpanded = expanded[exp.id] !== false;
        return (
          <Card key={exp.id}>
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setExpanded((prev) => ({ ...prev, [exp.id]: !isExpanded }))}
            >
              <div>
                <p className="typography-heading-md text-neutral-900">
                  {exp.job_title || "New Position"}
                </p>
                <p className="typography-body-md text-neutral-500">
                  {exp.company_name || "Company"} {exp.start_date && `· ${formatDate(exp.start_date)} — ${formatDate(exp.end_date)}`}
                </p>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
            </button>
            {isExpanded && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="Job Title"
                    required
                    value={exp.job_title}
                    onChange={(e) => updateExperience(exp.id, { job_title: e.target.value })}
                    placeholder="Senior Engineer"
                  />
                  <TextInput
                    label="Company"
                    required
                    value={exp.company_name}
                    onChange={(e) => updateExperience(exp.id, { company_name: e.target.value })}
                    placeholder="Acme Corp"
                  />
                  <TextInput
                    label="Start Date"
                    type="month"
                    value={exp.start_date}
                    onChange={(e) => updateExperience(exp.id, { start_date: e.target.value })}
                  />
                  <TextInput
                    label="End Date"
                    type="month"
                    value={exp.end_date === "present" ? "" : exp.end_date}
                    onChange={(e) => updateExperience(exp.id, { end_date: e.target.value || "present" })}
                    placeholder="Leave empty for present"
                  />
                </div>
                {(exp.description_bullets || []).map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="typography-body-md text-neutral-400 mt-3 shrink-0">•</span>
                    <TextInput
                      value={bullet}
                      onChange={(e) => {
                        const bullets = [...(exp.description_bullets || [])];
                        bullets[i] = e.target.value;
                        updateExperience(exp.id, { description_bullets: bullets });
                        markStale();
                      }}
                      placeholder="Describe a key achievement or responsibility..."
                    />
                    <Button variant="ghost" size="sm" onClick={() => {
                      const bullets = (exp.description_bullets || []).filter((_, j) => j !== i);
                      updateExperience(exp.id, { description_bullets: bullets });
                    }}>
                      <Trash2 className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => {
                  const bullets = [...(exp.description_bullets || []), ""];
                  updateExperience(exp.id, { description_bullets: bullets });
                }}>
                  <Plus className="h-4 w-4" />
                  Add bullet point
                </Button>
                <AISuggestionPanel
                  actionType="rewrite_experience_bullets"
                  sourceBullets={exp.description_bullets}
                  onAcceptBullets={(bullets) => { updateExperience(exp.id, { description_bullets: bullets }); markStale(); }}
                  label="Rewrite bullets with AI"
                />
                <div className="flex justify-end pt-2">
                  <Button variant="ghost" size="sm" onClick={() => removeExperience(exp.id)}>
                    <Trash2 className="h-4 w-4 text-error-600" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
      <Button variant="secondary" size="sm" onClick={addExperience}>
        <Plus className="h-4 w-4" />
        Add Experience
      </Button>
    </div>
  );
}

function EducationSection() {
  const education = useResumeStore((s) => s.resume.education) || [];
  const addEducation = useResumeStore((s) => s.addEducation);
  const updateEducation = useResumeStore((s) => s.updateEducation);
  const removeEducation = useResumeStore((s) => s.removeEducation);

  return (
    <div className="flex flex-col gap-4">
      {education.map((edu) => (
        <Card key={edu.id}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Institution"
                required
                value={edu.institution_name}
                onChange={(e) => updateEducation(edu.id, { institution_name: e.target.value })}
                placeholder="MIT"
              />
              <TextInput
                label="Degree"
                required
                value={edu.degree}
                onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                placeholder="B.S. Computer Science"
              />
              <TextInput
                label="Start Date"
                type="month"
                value={edu.start_date || ""}
                onChange={(e) => updateEducation(edu.id, { start_date: e.target.value })}
              />
              <TextInput
                label="End Date"
                type="month"
                value={edu.end_date || ""}
                onChange={(e) => updateEducation(edu.id, { end_date: e.target.value })}
                placeholder="Expected or present"
              />
            </div>
            <TextInput
              label="Details"
              value={edu.details || ""}
              onChange={(e) => updateEducation(edu.id, { details: e.target.value })}
              placeholder="GPA, honors, relevant coursework..."
            />
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeEducation(edu.id)}>
                <Trash2 className="h-4 w-4 text-error-600" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <Button variant="secondary" size="sm" onClick={addEducation}>
        <Plus className="h-4 w-4" />
        Add Education
      </Button>
    </div>
  );
}

function ProjectsSection() {
  const projects = useResumeStore((s) => s.resume.projects) || [];
  const addProject = useResumeStore((s) => s.addProject);
  const updateProject = useResumeStore((s) => s.updateProject);
  const removeProject = useResumeStore((s) => s.removeProject);
  const markStale = useAnalysisStore((s) => s.markStale);

  return (
    <div className="flex flex-col gap-4">
      {projects.map((proj) => (
        <Card key={proj.id}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Project Name"
                required
                value={proj.project_name}
                onChange={(e) => updateProject(proj.id, { project_name: e.target.value })}
                placeholder="Open Source CRM"
              />
              <TextInput
                label="Link"
                value={proj.link || ""}
                onChange={(e) => updateProject(proj.id, { link: e.target.value })}
                placeholder="https://github.com/..."
              />
              <TextInput
                label="Timeframe"
                value={proj.timeframe || ""}
                onChange={(e) => updateProject(proj.id, { timeframe: e.target.value })}
                placeholder="Jan 2024 – Mar 2024"
              />
            </div>
            {(proj.description_bullets || []).map((bullet, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="typography-body-md text-neutral-400 mt-3 shrink-0">•</span>
                <TextInput
                  value={bullet}
                  onChange={(e) => {
                    const bullets = [...(proj.description_bullets || [])];
                    bullets[i] = e.target.value;
                    updateProject(proj.id, { description_bullets: bullets });
                    markStale();
                  }}
                  placeholder="Describe the project..."
                />
                <Button variant="ghost" size="sm" onClick={() => {
                  const bullets = (proj.description_bullets || []).filter((_, j) => j !== i);
                  updateProject(proj.id, { description_bullets: bullets });
                }}>
                  <Trash2 className="h-4 w-4 text-neutral-400" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => {
              const bullets = [...(proj.description_bullets || []), ""];
              updateProject(proj.id, { description_bullets: bullets });
            }}>
              <Plus className="h-4 w-4" />
              Add bullet point
            </Button>
            <AISuggestionPanel
              actionType="rewrite_project_description"
              sourceBullets={proj.description_bullets}
              onAcceptBullets={(bullets) => { updateProject(proj.id, { description_bullets: bullets }); markStale(); }}
              label="Rewrite with AI"
            />
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeProject(proj.id)}>
                <Trash2 className="h-4 w-4 text-error-600" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <Button variant="secondary" size="sm" onClick={addProject}>
        <Plus className="h-4 w-4" />
        Add Project
      </Button>
    </div>
  );
}

function SkillsSection() {
  const skills = useResumeStore((s) => s.resume.skills) || [];
  const addSkillGroup = useResumeStore((s) => s.addSkillGroup);
  const updateSkillGroup = useResumeStore((s) => s.updateSkillGroup);
  const removeSkillGroup = useResumeStore((s) => s.removeSkillGroup);
  const markStale = useAnalysisStore((s) => s.markStale);

  return (
    <div className="flex flex-col gap-4">
      {skills.map((group, gi) => (
        <Card key={gi}>
          <div className="flex flex-col gap-4">
            <TextInput
              label="Category"
              value={group.category_label || ""}
              onChange={(e) => updateSkillGroup(gi, { category_label: e.target.value })}
              placeholder="Programming Languages"
            />
            <div className="flex flex-wrap gap-2">
              {group.skills.map((skill, si) => (
                <span key={si} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 typography-body-md text-neutral-700">
                  {skill}
                  <button
                    onClick={() => {
                      const updated = group.skills.filter((_, j) => j !== si);
                      updateSkillGroup(gi, { skills: updated });
                      markStale();
                    }}
                    className="text-neutral-400 hover:text-neutral-700 transition-colors duration-150"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const input = form.querySelector("input") as HTMLInputElement;
                if (input?.value.trim()) {
                  updateSkillGroup(gi, { skills: [...group.skills, input.value.trim()] });
                  markStale();
                  input.value = "";
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Add a skill and press Enter"
                className="h-9 flex-1 rounded-lg border border-neutral-300 bg-neutral-0 px-3 typography-body-md text-neutral-900 placeholder:text-neutral-400 focus:border-accent-600 focus:outline-none focus:ring-[3px] focus:ring-accent-100"
              />
            </form>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeSkillGroup(gi)}>
                <Trash2 className="h-4 w-4 text-error-600" />
                Remove Group
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <Button variant="secondary" size="sm" onClick={addSkillGroup}>
        <Plus className="h-4 w-4" />
        Add Skill Group
      </Button>
    </div>
  );
}

function CertificationsSection() {
  const certs = useResumeStore((s) => s.resume.certifications) || [];
  const addCertification = useResumeStore((s) => s.addCertification);
  const updateCertification = useResumeStore((s) => s.updateCertification);
  const removeCertification = useResumeStore((s) => s.removeCertification);

  return (
    <div className="flex flex-col gap-4">
      {certs.map((cert) => (
        <Card key={cert.id}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Certification Name"
                required
                value={cert.certification_name}
                onChange={(e) => updateCertification(cert.id, { certification_name: e.target.value })}
                placeholder="AWS Solutions Architect"
              />
              <TextInput
                label="Issuing Organization"
                value={cert.issuing_organization || ""}
                onChange={(e) => updateCertification(cert.id, { issuing_organization: e.target.value })}
                placeholder="Amazon Web Services"
              />
              <TextInput
                label="Date Obtained"
                type="month"
                value={cert.date_obtained || ""}
                onChange={(e) => updateCertification(cert.id, { date_obtained: e.target.value })}
              />
              <TextInput
                label="Expiration Date"
                type="month"
                value={cert.expiration_date || ""}
                onChange={(e) => updateCertification(cert.id, { expiration_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeCertification(cert.id)}>
                <Trash2 className="h-4 w-4 text-error-600" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <Button variant="secondary" size="sm" onClick={addCertification}>
        <Plus className="h-4 w-4" />
        Add Certification
      </Button>
    </div>
  );
}

function AchievementsSection() {
  const achievements = useResumeStore((s) => s.resume.achievements) || [];
  const addAchievement = useResumeStore((s) => s.addAchievement);
  const updateAchievement = useResumeStore((s) => s.updateAchievement);
  const removeAchievement = useResumeStore((s) => s.removeAchievement);
  const markStale = useAnalysisStore((s) => s.markStale);

  return (
    <div className="flex flex-col gap-4">
      {achievements.map((ach) => (
        <Card key={ach.id}>
          <div className="flex flex-col gap-4">
            <TextArea
              label="Achievement"
              required
              value={ach.statement}
              onChange={(e) => updateAchievement(ach.id, { statement: e.target.value })}
              placeholder="Describe a measurable achievement..."
              maxLength={300}
              rows={2}
            />
            <AISuggestionPanel
              actionType="suggest_achievement_phrasing"
              sourceContent={ach.statement}
              onAccept={(content) => { updateAchievement(ach.id, { statement: content }); markStale(); }}
              label="Rephrase with AI"
            />
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeAchievement(ach.id)}>
                <Trash2 className="h-4 w-4 text-error-600" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <Button variant="secondary" size="sm" onClick={addAchievement}>
        <Plus className="h-4 w-4" />
        Add Achievement
      </Button>
    </div>
  );
}

function ReferencesSection() {
  const refs = useResumeStore((s) => s.resume.references);
  const setReferences = useResumeStore((s) => s.setReferences);
  const isAvailableUponRequest = refs === "available_upon_request";

  if (isAvailableUponRequest) {
    return (
      <div className="flex items-center gap-4">
        <Badge variant="neutral">Available upon request</Badge>
        <Button variant="ghost" size="sm" onClick={() => setReferences(undefined)}>
          Add references instead
        </Button>
      </div>
    );
  }

  const references = Array.isArray(refs) ? refs : [];

  return (
    <div className="flex flex-col gap-4">
      {references.map((ref) => (
        <Card key={ref.id}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Name"
                required
                value={ref.name}
                onChange={(e) => {
                  const updated = references.map((r) => r.id === ref.id ? { ...r, name: e.target.value } : r);
                  setReferences(updated);
                }}
                placeholder="Jane Smith"
              />
              <TextInput
                label="Relationship"
                value={ref.relationship || ""}
                onChange={(e) => {
                  const updated = references.map((r) => r.id === ref.id ? { ...r, relationship: e.target.value } : r);
                  setReferences(updated);
                }}
                placeholder="Former Manager"
              />
              <TextInput
                label="Contact Info"
                value={ref.contact_info || ""}
                onChange={(e) => {
                  const updated = references.map((r) => r.id === ref.id ? { ...r, contact_info: e.target.value } : r);
                  setReferences(updated);
                }}
                placeholder="jane@example.com"
                className="md:col-span-2"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => {
                setReferences(references.filter((r) => r.id !== ref.id));
              }}>
                <Trash2 className="h-4 w-4 text-error-600" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => {
          setReferences([...references, { id: crypto.randomUUID(), name: "" }]);
        }}>
          <Plus className="h-4 w-4" />
          Add Reference
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setReferences("available_upon_request")}>
          Available upon request
        </Button>
      </div>
    </div>
  );
}

const SECTION_COMPONENTS: Record<SectionId, React.ComponentType> = {
  personal_details: PersonalDetailsSection,
  professional_summary: SummarySection,
  experience: ExperienceSection,
  education: EducationSection,
  projects: ProjectsSection,
  skills: SkillsSection,
  certifications: CertificationsSection,
  achievements: AchievementsSection,
  references: ReferencesSection,
};

export default function BuildPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("personal_details");
  const resume = useResumeStore((s) => s.resume);
  const { user, signOut } = useAuth();
  const ActiveComponent = SECTION_COMPONENTS[activeSection];
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  function getSectionStatus(id: SectionId): "complete" | "required" | "optional" {
    if (id === "personal_details") {
      return resume.personal_details?.full_name?.trim() ? "complete" : "required";
    }
    if (id === "professional_summary") {
      return resume.professional_summary?.trim() ? "complete" : "optional";
    }
    const arr = resume[id as keyof typeof resume] as unknown[];
    if (arr && arr.length > 0) return "complete";
    return "optional";
  }

  return (
    <RequireAuth>
      <header className="w-full border-b border-neutral-200 bg-neutral-0">
        <div className="content-container flex h-14 items-center justify-between">
          <Link href="/" className="typography-heading-md text-neutral-900">
            ResumeForge
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
              Dashboard
            </Link>
            <Link href="/job-description" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
              Job Description
            </Link>
            <Link href="/analysis" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
              Analysis
            </Link>
            <Link href="/preview" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
              Preview
            </Link>
            <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
              <span className="typography-label text-neutral-600">{displayName}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 shrink-0 border-r border-neutral-200 bg-neutral-50 overflow-y-auto">
          <div className="p-3">
            <p className="typography-label text-neutral-500 px-3 mb-2">Sections</p>
            <nav className="flex flex-col gap-0.5" aria-label="Resume sections">
              {SECTIONS.map((section) => {
                const status = getSectionStatus(section.id);
                const isActive = activeSection === section.id;
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={[
                      "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ease-out",
                      isActive
                        ? "bg-accent-50 text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-100",
                    ].join(" ")}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-accent-600 rounded-r" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="typography-label flex-1">{section.label}</span>
                    {status === "complete" && (
                      <span className="text-success-600 text-xs">✓</span>
                    )}
                    {status === "required" && section.required && (
                      <Badge variant="error" className="text-[10px] py-0 px-1">Req</Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="content-container max-w-3xl py-12">
            <h1 className="typography-heading-xl text-neutral-900 mb-8">
              {SECTIONS.find((s) => s.id === activeSection)?.label}
            </h1>
            <ActiveComponent />
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
