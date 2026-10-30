// All site text is edited in the /lock admin (Keystatic) and stored as JSON next to this file:
// profile.json (hero, contact, about), skills.json, resume.json, certifications.json,
// workflow.json ("How I work") and sections.json (section headings). This module only adds types.
// Keep claims verifiable: no roles, metrics or credentials that are not backed by a source.

import profileData from './profile.json';
import skillsData from './skills.json';
import resumeData from './resume.json';
import certificationData from './certifications.json';
import workflowData from './workflow.json';
import sectionsData from './sections.json';

// The admin saves empty optional fields as "" or null; templates treat both as absent.
type Optional = string | null | undefined;

export type Certification = {
  name: string;
  code?: Optional;
  issuer: string;
  level: string;
  date: string;
  expires?: Optional;
  verify?: Optional;
};

export const profile: {
  name: string;
  role: string;
  roles: string[];
  valueLine: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
  portfolioRepo?: Optional;
  resume?: Optional;
  now: string;
} = profileData;
export const about: string[] = profileData.about;
export const principles: { title: string; text: string }[] = profileData.principles;

export const skillGroups: { name: string; skills: string[] }[] = skillsData.skillGroups;
// Capability areas with honest evidence. `projects` lists project ids; an empty list shows the gap.
export const capabilities: { area: string; projects: string[] }[] = skillsData.capabilities;

export const experience: { role: string; org: string; period: string; points: string[] }[] = resumeData.experience;
export const education: { degree: string; school: string }[] = resumeData.education;
export const community: { title: string; period: string; text: string; url?: Optional }[] = resumeData.community;
export const publications: { title: string; venue: string; date: string; url?: Optional }[] = resumeData.publications;

export const certifications: Certification[] = certificationData.items;

export const workflow: {
  id: string;
  label: string;
  text: string;
  evidence: { label: string; href?: Optional }[];
}[] = workflowData.stages;

export const sections = sectionsData;
