import * as React from "react";
import { GenericChecklist } from "@/components/checklists/GenericChecklist";
import { ENROLLMENT_TEMPLATES } from "@/data/enrollment";

export default function EnrollmentChecklist({ studentId }: { studentId: string }) {
  return (
    <GenericChecklist
      studentId={studentId}
      storageKeyPrefix="enrollment"
      title="Enrollment"
      templates={ENROLLMENT_TEMPLATES}
    />
  );
}
