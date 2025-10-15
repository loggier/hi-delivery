import { BusinessForm } from "../business-form";
import { PageHeader } from "@/components/page-header";

export default function NewBusinessPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nuevo Negocio" />
      <BusinessForm />
    </div>
  );
}
