import { ModuleForm } from "../module-form";
import { PageHeader } from "@/components/page-header";

export default function NewModulePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nuevo Módulo" />
      <ModuleForm />
    </div>
  );
}
