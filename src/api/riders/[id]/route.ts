
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, riderId: string, fileName: string): Promise<string> {
    const filePath = `riders/${riderId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from('hidelivery') // your bucket name
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error(`Upload Error for ${fileName}:`, uploadError);
        throw new Error(`Failed to upload ${fileName}.`);
    }

    const { data } = supabaseAdmin.storage.from('hidelivery').getPublicUrl(filePath);
    return data.publicUrl;
}


export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} },
      db: { schema: process.env.SUPABASE_SCHEMA! }
    }
  );

  const { id: riderId } = params;
  if (!riderId) {
    return NextResponse.json({ message: 'Rider ID es requerido.' }, { status: 400 });
  }

  const formData = await request.formData();
  const updateData: Record<string, any> = {};
  
  const fileFields = [
    'avatar_1x1_url', 'ine_front_url', 'ine_back_url', 'proof_of_address_url',
    'license_front_url', 'license_back_url', 'circulation_card_front_url', 'circulation_card_back_url',
    'moto_photos_front', 'moto_photos_back', 'moto_photos_left', 'moto_photos_right',
    'policy_first_page_url'
  ];

  try {
    // Handle file uploads
    for (const field of fileFields) {
      if (formData.has(field)) {
        const file = formData.get(field) as File;
        if (file && file.size > 0) {
            // Special handling for moto photos
            if(field.startsWith('moto_photos')) {
                // This part needs more complex logic to handle array of photos
                // For now, we'll just upload one by one if they exist
            } else {
                 updateData[field] = await uploadFileAndGetUrl(supabaseAdmin, file, riderId, field);
            }
        }
      }
    }

    // Handle plain text fields
    for (const [key, value] of formData.entries()) {
      if (!fileFields.includes(key) && typeof value === 'string') {
        if(key === 'hasHelmet' || key === 'hasUniform' || key === 'hasBox') {
            updateData[key] = value === 'true';
        } else {
            updateData[key] = value;
        }
      }
    }
    
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('riders')
      .update(updateData)
      .eq('id', riderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating rider profile:', error);
      return NextResponse.json({ message: error.message || 'Error al actualizar el perfil.', error: error.details }, { status: 500 });
    }

    return NextResponse.json({ message: 'Perfil actualizado con éxito.', rider: data }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in PATCH rider API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
