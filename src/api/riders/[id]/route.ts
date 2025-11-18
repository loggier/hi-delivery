
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Rider } from '@/types';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, riderId: string, fileName: string): Promise<string> {
    const filePath = `riders/${riderId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
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
  
  const dateFields = ['birth_date', 'license_valid_until', 'policy_valid_until'];

  try {
    const { data: existingRider, error: fetchError } = await supabaseAdmin.from('riders').select('moto_photos, status').eq('id', riderId).single();
    if(fetchError) {
      console.error('Error fetching existing rider for update:', fetchError);
      return NextResponse.json({ message: 'No se pudo encontrar el repartidor para actualizar.' }, { status: 404 });
    }

    let motoPhotos: string[] = existingRider.moto_photos || [];

    // Handle file uploads
    for (const [key, value] of formData.entries()) {
        if (value instanceof File && value.size > 0) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (key.startsWith('motoPhoto')) {
                const url = await uploadFileAndGetUrl(supabaseAdmin, value, riderId, key);
                motoPhotos.push(url);
            } else {
                 updateData[dbKey] = await uploadFileAndGetUrl(supabaseAdmin, value, riderId, key);
            }
        }
    }
    
    if (motoPhotos.length > 0) {
        updateData['moto_photos'] = motoPhotos;
    }

    // Handle plain text fields
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if(key === 'hasHelmet' || key === 'hasUniform' || key === 'hasBox') {
            updateData[dbKey] = value === 'true';
        } else if (dateFields.includes(dbKey)) {
            updateData[dbKey] = new Date(value as string).toISOString();
        } else {
            updateData[dbKey] = value;
        }
      }
    }
    
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();
    
    // Ensure 'status' is updated to 'pending_review' if it's currently 'incomplete' and we're adding more data
    if (existingRider && (existingRider as Rider).status === 'incomplete' && Object.keys(updateData).length > 1) {
        updateData.status = 'pending_review';
    }


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
