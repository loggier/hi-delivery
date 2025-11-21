'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { productSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, productId: string): Promise<string> {
    const filePath = `products/${productId}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_BUCKET!)
        .upload(filePath, file);

    if (uploadError) {
        console.error(`Upload Error for product image:`, uploadError);
        throw new Error(`Failed to upload image. Details: ${uploadError.message}`);
    }

    const { data } = supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).getPublicUrl(filePath);
    return data.publicUrl;
}

export async function POST(request: Request) {
  const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
  );

  const formData = await request.formData();
  const rawData: Record<string, any> = {};
  for(const [key, value] of formData.entries()) {
      rawData[key] = value;
  }
  
  const dataToValidate = {
    name: rawData.name,
    description: rawData.description,
    sku: rawData.sku,
    price: rawData.price ? Number(rawData.price) : undefined,
    status: rawData.status,
    business_id: rawData.business_id,
    category_id: rawData.category_id,
    image_url: rawData.image_url,
  };

  const validated = productSchema.safeParse(dataToValidate);

  if (!validated.success) {
    console.error("Validation errors:", validated.error.flatten().fieldErrors);
    return NextResponse.json({ message: "Datos de producto inválidos.", errors: validated.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = validated.data;
  
  try {
    const productId = `prod-${faker.string.uuid()}`;
    let imageUrl: string | null = null;

    if (data.image_url instanceof File && data.image_url.size > 0) {
        imageUrl = await uploadFileAndGetUrl(supabaseAdmin, data.image_url, productId);
    }

    const newProductForDb = {
      id: productId,
      name: data.name,
      description: data.description,
      sku: data.sku,
      price: data.price,
      status: data.status,
      business_id: data.business_id,
      category_id: data.category_id,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };

    const { data: createdProduct, error: insertError } = await supabaseAdmin
      .from('products')
      .insert(newProductForDb)
      .select()
      .single();

    if (insertError) {
        console.error('Error creating product:', insertError);
        return NextResponse.json({ message: 'Error al crear el producto.', error: insertError.details || insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Producto creado con éxito.", product: createdProduct }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in product creation API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
