import { CategoryForm } from "../category-form";
import { PageHeader } from "@/components/page-header";

export default function NewCategoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nueva Categoría" />
      <CategoryForm />
    </div>
  );
}
