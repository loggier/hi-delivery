import { RoleForm } from "../role-form";
import { PageHeader } from "@/components/page-header";

export default function NewRolePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nuevo Rol" />
      <RoleForm />
    </div>
  );
}
