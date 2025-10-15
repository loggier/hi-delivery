import { PlanForm } from "../plan-form";
import { PageHeader } from "@/components/page-header";

export default function NewPlanPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nuevo Plan" />
      <PlanForm />
    </div>
  );
}
