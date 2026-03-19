import type { ChecklistTemplate } from "@/components/checklists/GenericChecklist";

export const MAINTENANCE_TEMPLATES: ChecklistTemplate[] = [
  { key: "monthly_checkin", label: "Monthly Check-in Logged", required: true, description: "CM/student monthly touchpoint recorded." },
  { key: "attendance_review", label: "Attendance Review (Weekly/Monthly)", required: true, description: "Monitor attendance & intervene as needed." },
  { key: "progress_review", label: "Academic Progress Review (Term)", required: true, description: "Report cards/progress updates gathered & reviewed." },
  { key: "plan_review", label: "Plan Review / Goal Update (Quarterly)", required: true, description: "Update goals & services; share with student/family." },
  { key: "service_logs", label: "Service / Intervention Logs", required: true, description: "Counseling/tutoring/mentoring sessions logged." },
  { key: "incident_reports", label: "Incident Reports (if any)", required: false, description: "Record and follow-up actions." },
  { key: "contact_updates", label: "Contact Info Updates (Quarterly)", required: false, description: "Verify phones/emails/addresses." },
  { key: "consent_renewal", label: "Consent/Release Renewal (Annual)", required: false, description: "Renew expiring releases and permissions." },
  { key: "device_audit", label: "Device Audit / Return (Annual or Exit)", required: false, description: "Verify device in good standing; collect at exit." },
  { key: "referral_status", label: "Referral Outcomes Tracked", required: false, description: "Close the loop on external/internal referrals." },
  { key: "exit_transition", label: "Exit / Transition Plan", required: false, description: "Graduation/transfer documentation & handoff." },
];
