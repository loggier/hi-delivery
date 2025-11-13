
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { riderApplicationSchema } from '@/lib/schemas';

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


export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const riderId = params.id;
  if (!riderId) {
    return NextResponse.json({ message: 'ID de repartidor no proporcionado.' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! }
      }
    );

    const updateData: Record<string, any> = {};
    const fileUploadPromises: { key: string, promise: Promise<string> }[] = [];

    // Map form fields to database columns and handle file uploads
    const fieldMapping: Record<string, string> = {
        motherLastName: 'mother_last_name',
        birthDate: 'birth_date',
        zone_id: 'zone_id',
        address: 'address',
        ownership: 'ownership',
        brand: 'brand',
        brandOther: 'brand_other',
        year: 'year',
        model: 'model',
        color: 'color',
        plate: 'plate',
        licenseValidUntil: 'license_valid_until',
        insurer: 'insurer',
        policyNumber: 'policy_number',
        policyValidUntil: 'policy_valid_until',
        hasHelmet: 'has_helmet',
        hasUniform: 'has_uniform',
        hasBox: 'has_box',
        status: 'status',
    };

    const fileFields = [
        'ineFrontUrl', 'ineBackUrl', 'proofOfAddressUrl',
        'licenseFrontUrl', 'licenseBackUrl', 
        'circulationCardFrontUrl', 'circulationCardBackUrl',
        'motoPhotoFront', 'motoPhotoBack', 'motoPhotoLeft', 'motoPhotoRight',
        'policyFirstPageUrl', 'avatar1x1Url'
    ];

    const dbFileFieldMapping: Record<string, string> = {
        ineFrontUrl: 'ine_front_url',
        ineBackUrl: 'ine_back_url',
        proofOfAddressUrl: 'proof_of_address_url',
        licenseFrontUrl: 'license_front_url',
        licenseBackUrl: 'license_back_url',
        circulationCardFrontUrl: 'circulation_card_front_url',
        circulationCardBackUrl: 'circulation_card_back_url',
        policyFirstPageUrl: 'policy_first_page_url',
        avatar1x1Url: 'avatar_1x1_url',
        motoPhotoFront: 'moto_photos.0',
        motoPhotoBack: 'moto_photos.1',
        motoPhotoLeft: 'moto_photos.2',
        motoPhotoRight: 'moto_photos.3',
    };

    for (const [key, value] of formData.entries()) {
      if (key in fieldMapping) {
        const dbKey = fieldMapping[key];
        if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
            updateData[dbKey] = value.toLowerCase() === 'true';
        } else {
            updateData[dbKey] = value;
        }
      } else if (fileFields.includes(key) && value instanceof File) {
        const promise = uploadFileAndGetUrl(supabaseAdmin, value, riderId, key);
        fileUploadPromises.push({ key, promise });
      }
    }
    
    // Fetch existing moto_photos if they exist to merge with new ones
    if (fileUploadPromises.some(p => p.key.startsWith('motoPhoto'))) {
        const { data: existingRider } = await supabaseAdmin.from('riders').select('moto_photos').eq('id', riderId).single();
        updateData.moto_photos = existingRider?.moto_photos || [];
    }


    // Wait for all file uploads to complete
    const uploadedFiles = await Promise.all(fileUploadPromises.map(p => p.promise));
    uploadedFiles.forEach((url, index) => {
        const { key } = fileUploadPromises[index];
        const dbKey = dbFileFieldMapping[key];
        if (dbKey.includes('.')) { // Handle moto_photos array
            const [mainKey, arrayIndexStr] = dbKey.split('.');
            const arrayIndex = parseInt(arrayIndexStr);
            if (!updateData[mainKey]) updateData[mainKey] = [];
            // Ensure array is large enough
            while(updateData[mainKey].length <= arrayIndex) {
                updateData[mainKey].push(null);
            }
            updateData[mainKey][arrayIndex] = url;
        } else {
            updateData[dbKey] = url;
        }
    });
    
    if (updateData.brand === 'Otra' && updateData.brandOther) {
        updateData.brand = updateData.brandOther;
    }
    delete updateData.brandOther;

    if (Object.keys(updateData).length > 0) {
        const { data, error } = await supabaseAdmin
            .from('riders')
            .update(updateData)
            .eq('id', riderId)
            .select()
            .single();

        if (error) {
            // PGRST116: "JSON object requested, multiple (or no) rows returned"
            // This can happen if the ID doesn't exist. Instead of throwing, we'll treat it as "nothing to update".
            if (error.code === 'PGRST116') {
                 const { data: currentRider } = await supabaseAdmin.from('riders').select('*').eq('id', riderId).single();
                 return NextResponse.json({ message: 'El repartidor no fue encontrado, no se aplicaron cambios.', rider: currentRider }, { status: 404 });
            }
            throw error;
        };

        return NextResponse.json({ message: 'Datos actualizados con éxito', rider: data }, { status: 200 });
    }

    // If only status was updated (or nothing), fetch the current rider data to return
     const { data: currentRider, error: currentRiderError } = await supabaseAdmin.from('riders').select('*').eq('id', riderId).single();
     if(currentRiderError) {
         return NextResponse.json({ message: 'No se pudo encontrar el repartidor para devolver el estado actual.', error: currentRiderError.message }, { status: 404 });
     }

    return NextResponse.json({ message: 'No hay datos nuevos que actualizar', rider: currentRider }, { status: 200 });

  } catch (error) {
    console.error('Update Rider Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
