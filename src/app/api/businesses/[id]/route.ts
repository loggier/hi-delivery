'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, businessId: string, fileName: string): Promise<string> {
    const filePath = `store/${businessId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from(process.env.SUPABASE_BUCKET!)
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error(`Upload Error for ${fileName}:`, uploadError);
        throw new Error(`Failed to upload ${fileName}. Details: ${uploadError.message}`);
    }

    const { data } = supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).getPublicUrl(filePath);
    return data.publicUrl;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const businessId = params.id;
  if (!businessId) {
      return NextResponse.json({ message: 'Business ID es requerido.' }, { status: 400 });
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

  const fileFields = [
    'logo_url', 'business_photo_facade_url', 'business_photo_interior_url',
    'digital_menu_url', 'owner_ine_front_url', 'owner_ine_back_url', 'tax_situation_proof_url'
  ];

  try {
    // Process files first
    for (const fieldName of fileFields) {
        if (formData.has(fieldName)) {
            const file = formData.get(fieldName) as File;
            if (file && file.size > 0) {
                 updateData[fieldName] = await uploadFileAndGetUrl(supabaseAdmin, file, businessId, fieldName);
            }
        }
    }
    
    // Process other fields
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File) && key !== 'final_submission') {
        const numericFields = ['latitude', 'longitude', 'delivery_time_min', 'delivery_time_max', 'average_ticket'];
        const booleanFields = ['has_delivery_service'];

        if (numericFields.includes(key)) {
             updateData[key] = parseFloat(value as string);
        } else if (booleanFields.includes(key)) {
            updateData[key] = value === 'true';
        }
        else if (key === 'phone_whatsapp' && typeof value === 'string' && !value.startsWith('+52')) {
            updateData[key] = `+52${value}`;
        } else if (value !== undefined) { // Allow null and empty strings to be processed
            updateData[key] = value;
        }
      }
    }
    
    if (Object.keys(updateData).length === 0 && !formData.has('final_submission')) {
        return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();
    
    if (formData.has('final_submission')) {
        updateData.status = 'PENDING_REVIEW';
    }

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error updating business profile:', error);
      return NextResponse.json({ message: error.message || 'Error al actualizar el perfil.', error: error.details }, { status: 500 });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito.', business: data }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in POST business API (update mode):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
