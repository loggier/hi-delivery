import { UserForm } from "../user-form";
import { PageHeader } from "@/components/page-header";

export default function NewUserPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nuevo Usuario" />
      <UserForm />
    </div>
  );
}
