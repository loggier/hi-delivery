'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { riderApplicationSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';
import { hashPassword } from '@/lib/auth-utils';

// Helper function to upload a file and return its public URL
async function uploadFile(supabaseAdmin: any, file: File, riderId: string, fileName: string): Promise<string> {
    const filePath = `riders/${riderId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    
    const { error: uploadError } = await supabaseAdmin.storage
        .from('hidelivery')
        .upload(filePath, file);

    if (uploadError) {
        console.error(`Error uploading ${fileName}:`, uploadError);
        throw new Error(`No se pudo subir el archivo: ${fileName}.`);
    }

    const { data: urlData } = supabaseAdmin.storage
        .from('hidelivery')
        .getPublicUrl(filePath);

    if (!urlData) {
        throw new Error(`No se pudo obtener la URL pública para: ${fileName}.`);
    }
    
    return urlData.publicUrl;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: 'grupohubs' }
      }
    );
    
    const rawData = Object.fromEntries(formData.entries());
    
    // Convert date strings back to Date objects for validation
    if (rawData.birthDate) rawData.birthDate = new Date(rawData.birthDate as string);
    if (rawData.licenseValidUntil) rawData.licenseValidUntil = new Date(rawData.licenseValidUntil as string);
    if (rawData.policyValidUntil) rawData.policyValidUntil = new Date(rawData.policyValidUntil as string);

    // Convert checkbox 'on' to boolean
    rawData.hasHelmet = rawData.hasHelmet === 'true';
    rawData.hasUniform = rawData.hasUniform === 'true';
    rawData.hasBox = rawData.hasBox === 'true';

    // Handle FileList for motoPhotos
    const motoPhotosFiles: File[] = [];
    for (const [key, value] of formData.entries()) {
        if (key.startsWith('motoPhotos')) {
            motoPhotosFiles.push(value as File);
        }
    }
    
    const validated = riderApplicationSchema.safeParse(rawData);

    if (!validated.success) {
      console.error("Validation errors:", validated.error.flatten().fieldErrors);
      return NextResponse.json({ message: "Datos de formulario inválidos.", errors: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const riderId = `rider-${faker.string.uuid()}`;
    const data = validated.data;
    
    // Upload files and get URLs
    const fileUploads = [
      { key: 'ineFrontUrl', file: data.ineFrontUrl[0], name: 'ine-front' },
      { key: 'ineBackUrl', file: data.ineBackUrl[0], name: 'ine-back' },
      { key: 'proofOfAddressUrl', file: data.proofOfAddressUrl[0], name: 'proof-of-address' },
      { key: 'licenseFrontUrl', file: data.licenseFrontUrl[0], name: 'license-front' },
      { key: 'licenseBackUrl', file: data.licenseBackUrl[0], name: 'license-back' },
      { key: 'circulationCardFrontUrl', file: data.circulationCardFrontUrl[0], name: 'circulation-card-front' },
      { key: 'circulationCardBackUrl', file: data.circulationCardBackUrl[0], name: 'circulation-card-back' },
      { key: 'policyFirstPageUrl', file: data.policyFirstPageUrl[0], name: 'policy-first-page' },
      { key: 'avatar1x1Url', file: data.avatar1x1Url[0], name: 'avatar' },
    ];
    
    const motoPhotosPromises = motoPhotosFiles.map((file, index) => 
        uploadFile(supabaseAdmin, file, riderId, `moto-photo-${index + 1}`)
    );

    const filePromises = fileUploads.map(f => uploadFile(supabaseAdmin, f.file, riderId, f.name));
    
    const [motoPhotoUrls, ...otherFileUrls] = await Promise.all([Promise.all(motoPhotosPromises), ...filePromises]);

    const urls: Record<string, string> = {};
    fileUploads.forEach((f, index) => {
        urls[f.key] = otherFileUrls[index];
    });
    
    const hashedPassword = await hashPassword(data.password);

    const newRiderForDb = {
      id: riderId,
      first_name: data.firstName,
      last_name: data.lastName,
      mother_last_name: data.motherLastName,
      email: data.email,
      birth_date: data.birthDate.toISOString(),
      rider_type: 'Asociado',
      zone_id: data.zone_id,
      address: data.address,
      ine_front_url: urls.ineFrontUrl,
      ine_back_url: urls.ineBackUrl,
      proof_of_address_url: urls.proofOfAddressUrl,
      license_front_url: urls.licenseFrontUrl,
      license_back_url: urls.licenseBackUrl,
      vehicle_type: 'Moto',
      ownership: data.ownership,
      brand: data.brand === 'Otra' ? data.brandOther : data.brand,
      year: Number(data.year),
      model: data.model,
      color: data.color,
      plate: data.plate,
      license_valid_until: data.licenseValidUntil.toISOString(),
      moto_photos: motoPhotoUrls,
      circulation_card_front_url: urls.circulationCardFrontUrl,
      circulation_card_back_url: urls.circulationCardBackUrl,
      insurer: data.insurer,
      policy_number: data.policyNumber,
      policy_valid_until: data.policyValidUntil.toISOString(),
      policy_first_page_url: urls.policyFirstPageUrl,
      has_helmet: data.hasHelmet,
      has_uniform: data.hasUniform,
      has_box: data.hasBox,
      phone_e164: data.phoneE164,
      password_hash: hashedPassword,
      avatar_1x1_url: urls.avatar1x1Url,
      status: 'pending_review',
    };

    const { error: insertError } = await supabaseAdmin
      .from('riders')
      .insert(newRiderForDb);

    if (insertError) {
      console.error("Error inserting rider:", insertError);
      return NextResponse.json({ message: 'Error al guardar la solicitud en la base de datos.', error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Solicitud recibida con éxito", riderId: newRiderForDb.id }, { status: 201 });

  } catch (error) {
    console.error('Error inesperado en la API de registro de repartidores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
