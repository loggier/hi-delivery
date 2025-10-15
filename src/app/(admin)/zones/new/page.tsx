import { ZoneForm } from "../zone-form";
import { PageHeader } from "@/components/page-header";

export default function NewZonePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nueva Zona" />
      <ZoneForm />
    </div>
  );
}
