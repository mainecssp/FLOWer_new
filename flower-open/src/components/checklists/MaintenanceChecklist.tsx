import * as React from "react";
import { GenericChecklist } from "@/components/checklists/GenericChecklist";
import { MAINTENANCE_TEMPLATES } from "@/data/maintenance";

export default function MaintenanceChecklist({ studentId }: { studentId: string }) {
  return (
    <GenericChecklist
      studentId={studentId}
      storageKeyPrefix="maintenance"
      title="Maintenance"
      templates={MAINTENANCE_TEMPLATES}
    />
  );
}
