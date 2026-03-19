import * as React from "react";
import { GenericChecklist } from "@/components/checklists/GenericChecklist";
import { INTAKE_TEMPLATES } from "@/data/intake";

export default function IntakeChecklist({ studentId }: { studentId: string }) {
  return (
    <GenericChecklist
      studentId={studentId}
      storageKeyPrefix="intake"
      title="Intake"
      templates={INTAKE_TEMPLATES}
    />
  );
}
