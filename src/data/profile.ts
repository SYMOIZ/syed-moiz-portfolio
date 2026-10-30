// Profile content. Every entry comes from Syed's own profile, LinkedIn/GitHub as recorded in
// Picture/PORTFOLIO_CONTENT_AUDIT.md, or his repositories. Do not add roles, metrics or credentials
// that are not verified there. Links are rendered only when present.

import certificationData from './certifications.json';

export const profile = {
  name: 'Syed Moiz',
  role: 'DevOps & Platform Engineer',
  roles: ['DevOps Engineering', 'Platform Engineering', 'Site Reliability', 'Cloud Infrastructure'],
  valueLine:
    'I build and operate AWS infrastructure, deployment pipelines and the automation that keeps production calm.',
  location: 'Karachi, Pakistan',
  email: 'symoiz.dev@gmail.com',
  linkedin: 'https://www.linkedin.com/in/symoiz',
  github: 'https://github.com/SYMOIZ',
  // Set to this portfolio's public repository URL once it exists.
  portfolioRepo: 'https://github.com/SYMOIZ/syed-moiz-portfolio',
  // Path of the résumé PDF placed in public/ (for example '/Syed-Moiz-Resume.pdf'). Empty hides "Download CV".
  resume: '',
  now: 'DevOps Engineer, Infrastructure at Keenu, working on infrastructure operations, production systems and service reliability.',
};

export const about = [
  'I am a DevOps and Infrastructure Engineer at Keenu, where I work on infrastructure operations, production systems and reliability.',
  'Before that I built and maintained cloud infrastructure and deployment pipelines across AWS and Azure as a Cloud Data Engineer at SEBKO Solution, and supported Git workflows, CI/CD and governance on an agentic AI project at Omdena.',
  'Outside work I build small, honest tools around the problems on-call engineers actually hit: failed queue messages, noisy logs, broken CI runs and risky network paths. Each project below says plainly whether it is a prototype, a hackathon build or a learning exercise.',
];

export const principles = [
  { title: 'Safe by default', text: 'Dry runs first, explicit flags to mutate, and a human in the loop for anything destructive.' },
  { title: 'Evidence over vibes', text: 'Deterministic checks before AI suggestions, and real metrics instead of made-up numbers.' },
  { title: 'Narrow doors', text: 'Least-privilege IAM, one security group per role, and no SSH from the internet.' },
  { title: 'Cost is a feature', text: 'Pay for the expensive path only when the cheap one is unsure.' },
];

// Capability areas with honest evidence. `projects` lists project ids that back each area.
export const capabilities = [
  { area: 'Automated incident response', projects: ['dlq-judge', 'incidentlens', 'errorsaathi'] },
  { area: 'CI/CD and deployment controls', projects: ['infrapilot-ai', 'errorsaathi', 'core-auth'] },
  { area: 'Infrastructure as Code', projects: ['dlq-judge', 'aws-resourcelens', 'accessforge'] },
  { area: 'Networking and access', projects: ['aws-3tier-architecture', 'accessforge'] },
  { area: 'Cloud security and IAM', projects: ['dlq-judge', 'accessforge', 'aws-resourcelens', 'infrapilot-ai'] },
  { area: 'Observability', projects: ['incidentlens', 'supportflow-ai'] },
  { area: 'Cost and governance', projects: ['aws-resourcelens', 'dlq-judge', 'infrapilot-ai'] },
  { area: 'Containers', projects: ['incidentlens', 'docker-devops-workshop', 'infrapulse'] },
  // Areas with no public project yet. Listed so the gap is visible, never filled with claims.
  { area: 'Kubernetes / EKS and GitOps', projects: [] },
  { area: 'Progressive delivery and SLOs', projects: [] },
];

export const skillGroups = [
  { name: 'Cloud', skills: ['AWS', 'Microsoft Azure', 'IAM', 'VPC networking', 'CloudWatch'] },
  { name: 'Automation', skills: ['CI/CD', 'GitHub Actions', 'Azure DevOps', 'Git', 'Terraform', 'CloudFormation', 'AWS CDK'] },
  { name: 'Containers', skills: ['Docker', 'Docker Compose', 'Kubernetes'] },
  { name: 'Systems', skills: ['Linux', 'Networking', 'Virtualization', 'Bash'] },
  { name: 'Languages', skills: ['Python', 'SQL', 'TypeScript'] },
  { name: 'Data platforms', skills: ['Snowflake', 'Kafka', 'Azure Databricks', 'Microsoft Fabric'] },
];

export const experience = [
  {
    role: 'DevOps Engineer – Infrastructure',
    org: 'Keenu',
    period: 'Aug 2026 – Present',
    points: [
      'Support infrastructure operations, production systems and service reliability.',
      'Assist with monitoring, troubleshooting, automation and infrastructure management.',
      'Collaborate with engineering teams to improve operational workflows.',
    ],
  },
  {
    role: 'Infrastructure & ML Engineer II',
    org: 'Omdena',
    period: 'Apr 2026 – Aug 2026',
    points: [
      'Contributed to an agentic AI framework for smart tourism operations in Bhutan, in the Foundations & Governance team.',
      'Supported Git workflows, CI/CD, technical documentation, governance and cross-team collaboration.',
    ],
  },
  {
    role: 'Cloud Data Engineer',
    org: 'SEBKO Solution',
    period: 'Jul 2024 – Aug 2026',
    points: [
      'Built and maintained cloud infrastructure and deployment pipelines across AWS and Azure.',
      'Automated infrastructure and deployments, improving processing and deployment time.',
      'Supported monitoring, security, reliability and cloud modernisation.',
    ],
  },
];

// Certifications are edited in the /lock admin (Keystatic) and stored in certifications.json.
// Every credential was checked on the issuer's site; `verify` renders a Verify button when present.
export type Certification = {
  name: string;
  code?: string;
  issuer: string;
  level: string;
  date: string;
  expires?: string;
  verify?: string | null;
};

export const certifications: Certification[] = certificationData.items;

export const community = [
  {
    title: 'Microsoft Student Ambassador',
    period: 'Oct 2026 – Present',
    text: 'Hosting workshops and technical events on cloud development, AI services and GitHub for students.',
    url: 'https://mvp.microsoft.com/studentambassadors/certificate/466332c4-a43e-4f99-b343-770dc7b712c5',
  },
  {
    title: 'IEEE Research Group – Volunteer Host',
    period: 'Jan 2026 – Present',
    text: 'Hosting and managing research events, attendee coordination and session facilitation.',
  },
  {
    title: 'Hacktoberfest 2026 · Karachi Hack Day',
    period: 'Oct 2026',
    text: 'Built ErrorSaathi in the Harness track.',
  },
];

// IEEE links are stored but hidden until verified (see audit).
export const publications = [
  {
    title: 'Security and Threat Detection through Cloud-Based Wazuh Deployment',
    venue: 'IEEE',
    date: 'April 2024',
    url: '',
  },
  {
    title: 'Unveiling the Arsenal of User Data Protection Tools and Practices',
    venue: 'IEEE',
    date: 'April 2024',
    url: '',
  },
];

export const education = [
  { degree: 'BS Computer Science', school: 'Iqra University' },
  { degree: 'Diploma in Networking', school: 'Institute of Business Administration (IBA)' },
];
