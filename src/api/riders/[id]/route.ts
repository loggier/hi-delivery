'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, riderId: string, fileName: string): Promise<string> {
    const filePath = `riders/${riderId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from("hidelivery")
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error(`Upload Error for ${fileName}:`, uploadError);
        throw new Error(`Failed to upload ${fileName}. Details: ${uploadError.message}`);
    }

    const { data } = supabaseAdmin.storage.from("hidelivery").getPublicUrl(filePath);
    return data.publicUrl;
}


export async function POST(request: Request, { params }: { params: { id: string } }) {
  const riderId = params.id;
  
  if (!riderId) {
      return NextResponse.json({ message: 'Rider ID es requerido.' }, { status: 400 });
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
  const dateFields = ['birth_date', 'license_valid_until', 'policy_valid_until'];

  try {
    const { data: existingRiderData, error: fetchError } = await supabaseAdmin.from('riders').select('status, moto_photos').eq('id', riderId).single();
    
    if(fetchError) {
      console.error('Error fetching existing rider for update:', fetchError);
      return NextResponse.json({ message: 'No se pudo encontrar el repartidor para actualizar.' }, { status: 404 });
    }

    let motoPhotos: string[] = existingRiderData.moto_photos || [];

    // Procesar archivos
    for (const [key, value] of formData.entries()) {
        if (value instanceof File && value.size > 0) {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (key.startsWith('motoPhoto')) {
                const url = await uploadFileAndGetUrl(supabaseAdmin, value, riderId, key);
                if (!motoPhotos.includes(url)) {
                    motoPhotos.push(url);
                }
            } else {
                 updateData[dbKey] = await uploadFileAndGetUrl(supabaseAdmin, value, riderId, key);
            }
        }
    }
    
    if (motoPhotos.length > 0) {
        updateData['moto_photos'] = motoPhotos;
    }

    // Procesar otros campos
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if(key === 'hasHelmet' || key === 'hasUniform' || key === 'hasBox') {
            updateData[dbKey] = value === 'true';
        } else if (dateFields.includes(dbKey)) {
            updateData[dbKey] = new Date(value as string).toISOString();
        } else if (key !== 'brandOther') {
            updateData[dbKey] = value;
        }
      }
    }
    
    if (formData.get('brand') === 'Otra' && formData.get('brandOther')) {
        updateData['brand'] = formData.get('brandOther');
    }
    
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No hay datos para actualizar.' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();
    
    if (existingRiderData && existingRiderData.status === 'incomplete' && Object.keys(updateData).length > 1) { 
        updateData.status = 'pending_review';
    } else if (formData.has('status')) {
        updateData.status = formData.get('status');
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
    console.error('Unexpected error in POST rider API (update mode):', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
