import type { ChecklistTemplate } from "@/components/checklists/GenericChecklist";

export const ENROLLMENT_TEMPLATES: ChecklistTemplate[] = [
  { key: "enroll_form", label: "Enrollment / Registration Form", required: true, description: "Signed registration packet or online form." },
  { key: "orientation", label: "Orientation Completed", required: true, description: "Student/family orientation attendance or completion." },
  { key: "schedule", label: "Schedule / Placement Confirmed", required: true, description: "Schedule issued; placement decisions recorded." },
  { key: "handbook_ack", label: "Student Handbook Acknowledgement", required: true, description: "Code of conduct / handbook receipt & acknowledgement." },
  { key: "emergency_contacts", label: "Emergency Contacts Verified", required: true, description: "Primary/secondary contacts, medical alerts." },
  { key: "health_clearance", label: "Health Clearance Verified", required: false, description: "Immunizations/health forms verified by nurse/office." },
  { key: "photo_media", label: "Photo / Media Release", required: false, description: "Media/photo release status." },
  { key: "transportation", label: "Transportation Arranged (if applicable)", required: false, description: "Bus assignment or family transport confirmed." },
  { key: "meal_app", label: "Meal Application (Free/Reduced) / Status", required: false, description: "Application submitted or status confirmed." },
  { key: "tech_agreement", label: "Technology Use Agreement", required: true, description: "AUP signed by student/guardian." },
  { key: "device_receipt", label: "Computer/Device Receipt", required: false, description: "If a device is issued, capture receipt details." },
  { key: "accounts_setup", label: "Accounts Setup (Email/Portals)", required: true, description: "Login issued; portals verified." },
  { key: "iep_504_activation", label: "IEP/504 Accommodations Activated", required: false, description: "Ensure accommodations are in schedule & teachers notified." },
  { key: "service_referrals", label: "Service Referrals Initiated (if any)", required: false, description: "Counseling, tutoring, mentoring, etc." },
  { key: "finalize_initial_plan", label: "Initial Support Plan Finalized", required: false, description: "Formalize plan drafted during Intake." },
];
