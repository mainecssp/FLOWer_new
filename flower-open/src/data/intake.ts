export type IntakeStatus =
  | "requested"
  | "received"
  | "verified"
  | "waived"
  | "not_applicable";

export interface IntakeDocTemplate {
  key: string;
  label: string;
  required: boolean;
  when: "Stage1"; // reserved for future stages
  description?: string;
}

/**
 * Stage 1 (Intake) document set.
 * These mirror common intake artifacts and the structure suggested by your Flower repo
 * (checklists/forms + lifecycle task definitions).
 */
export const INTAKE_TEMPLATES: IntakeDocTemplate[] = [
  {
    key: "referral",
    label: "Referral / Application",
    required: true,
    when: "Stage1",
    description: "Initial referral or application (email/web/manual).",
  },
  {
    key: "authorization_release",
    label: "Authorization to Release Information (Consent)",
    required: true,
    when: "Stage1",
    description: "Signed release to obtain/share records (FERPA-style).",
  },
  {
    key: "communication_consent",
    label: "Communication Consent (SMS/Email)",
    required: true,
    when: "Stage1",
    description: "Opt-in/out and preferred channels.",
  },
  {
    key: "privacy_ack",
    label: "Data Privacy / Rights Acknowledgement",
    required: true,
    when: "Stage1",
    description: "Program privacy/rights acknowledgement.",
  },
  {
    key: "identity",
    label: "Identity Verification",
    required: true,
    when: "Stage1",
    description: "Gov’t ID, student ID, or equivalent.",
  },
  {
    key: "residency",
    label: "Proof of Residency",
    required: false,
    when: "Stage1",
    description: "Lease, bill, or equivalent if required by program.",
  },
  {
    key: "transcript",
    label: "Transcript / School Records",
    required: true,
    when: "Stage1",
    description: "Unofficial acceptable at intake; official may follow.",
  },
  {
    key: "attendance",
    label: "Attendance / Discipline Summary",
    required: false,
    when: "Stage1",
    description: "Snapshot if relevant to case planning.",
  },
  {
    key: "iep_504",
    label: "IEP / 504 Plan (if applicable)",
    required: false,
    when: "Stage1",
    description: "Latest plan or status confirmation.",
  },
  {
    key: "ell_status",
    label: "Language / ELL Status",
    required: false,
    when: "Stage1",
    description: "Home language survey or equivalent.",
  },
  {
    key: "immunizations",
    label: "Immunization Record",
    required: false,
    when: "Stage1",
    description: "As required by district/partner.",
  },
  {
    key: "intake_assessment",
    label: "Intake Assessment",
    required: true,
    when: "Stage1",
    description: "Initial needs/strengths/risk assessment.",
  },
  {
    key: "initial_plan",
    label: "Initial Support Plan (Draft)",
    required: false,
    when: "Stage1",
    description: "Early goals or plan outline created at intake.",
  },
];

/** Stored per student for each intake item. */
export interface IntakeItemState {
  key: string;
  label: string;
  required: boolean;
  status: IntakeStatus;
  requestedOn?: string;
  receivedOn?: string;
  verifiedOn?: string;
  notes?: string;
  /** Optional link to the actual artifact (SharePoint/OneDrive/URL). */
  linkUrl?: string;
  linkLabel?: string;
}
