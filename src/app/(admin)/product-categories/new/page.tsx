import { ProductCategoryForm } from "../product-category-form";
import { PageHeader } from "@/components/page-header";

export default function NewProductCategoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nueva Categoría de Producto" />
      <ProductCategoryForm />
    </div>
  );
}
