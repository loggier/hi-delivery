import { BusinessCategoryForm } from "../business-category-form";
import { PageHeader } from "@/components/page-header";

export default function NewBusinessCategoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nueva Categoría de Negocio" />
      <BusinessCategoryForm />
    </div>
  );
}
