'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { productSchema } from '@/lib/schemas';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, productId: string): Promise<string> {
    const filePath = `products/${productId}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_BUCKET!)
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error(`Upload Error for product image:`, uploadError);
        throw new Error(`Failed to upload image. Details: ${uploadError.message}`);
    }

    const { data } = supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).getPublicUrl(filePath);
    return data.publicUrl;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  if (!productId) {
      return NextResponse.json({ message: 'Product ID es requerido.' }, { status: 400 });
  }

  const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
    );

  const formData = await request.formData();
  const updateData: Record<string, any> = {};

  try {
    const imageFile = formData.get('image_url') as File | null;
    if (imageFile && imageFile.size > 0) {
        updateData['image_url'] = await uploadFileAndGetUrl(supabaseAdmin, imageFile, productId);
    }
    
    for (const [key, value] of formData.entries()) {
      if (key !== 'image_url') {
        if (key === 'price') {
             updateData[key] = parseFloat(value as string);
        } else if (value !== null && value !== undefined && value !== '') {
            updateData[key] = value;
        }
      }
    }
    
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 400 });
    }

    // Validate with Zod before saving
    const parsed = productSchema.partial().safeParse({
        ...updateData,
        price: updateData.price ? Number(updateData.price) : undefined, // Ensure price is a number for Zod
    });

    if (!parsed.success) {
      console.error("Validation errors on update:", parsed.error.flatten().fieldErrors);
      return NextResponse.json({ message: "Datos de producto inválidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(parsed.data)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json({ message: error.message || 'Error al actualizar el producto.', error: error.details }, { status: 500 });
    }

    return NextResponse.json({ message: 'Producto actualizado con éxito.', product: data }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in POST product API (update mode):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
