'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { businessAccountCreationSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';
import { hashPassword } from '@/lib/auth-utils';
import type { User } from '@/types';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, businessId: string, fileName: string): Promise<string> {
    const filePath = `store/${businessId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).upload(filePath, file);
    if (uploadError) throw new Error(`Error al subir ${fileName}: ${uploadError.message}`);
    const { data } = supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).getPublicUrl(filePath);
    return data.publicUrl;
}

async function handleCreateBusiness(request: Request, supabaseAdmin: any) {
  const formData = await request.formData();
  
  const rawData: Record<string, any> = {};
  for(const [key, value] of formData.entries()) {
      rawData[key] = value;
  }

  const validated = businessAccountCreationSchema.safeParse(rawData);

  if (!validated.success) {
    console.error("Validation errors:", validated.error.flatten().fieldErrors);
    return NextResponse.json({ message: "Datos de creación de cuenta inválidos.", errors: validated.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = validated.data;
  let createdUserId: string | null = null;
  
  try {
    const { data: roleData, error: roleError } = await supabaseAdmin.from('roles').select('id').eq('name', 'Dueño de Negocio').single();
    if (roleError || !roleData) throw new Error("No se pudo encontrar el rol 'Dueño de Negocio'.");
    
    const ownerRoleId = roleData.id;
    const userId = `user-${faker.string.uuid()}`;
    const hashedPassword = await hashPassword(data.password);
    
    const userToCreate = {
      id: userId,
      name: data.owner_name,
      email: data.email,
      password: hashedPassword,
      role_id: ownerRoleId,
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
    };

    const { data: createdUser, error: userError } = await supabaseAdmin.from('users').insert(userToCreate).select().single();
    
    if (userError) {
      if (userError.code === '23505') {
          return NextResponse.json({ message: 'El correo electrónico ya está registrado.' }, { status: 409 });
      }
      throw new Error(userError.message || 'Error al crear la cuenta de usuario.');
    }
    
    createdUserId = createdUser.id;

    const businessId = `biz-${faker.string.uuid()}`;
    const businessDataToInsert: Record<string, any> = {
      id: businessId,
      user_id: createdUser.id,
      name: data.name,
      type: data.type,
      category_id: data.category_id,
      owner_name: data.owner_name,
      email: data.email,
      phone_whatsapp: data.phone_whatsapp,
      address_line: data.address_line,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code,
      latitude: data.latitude,
      longitude: data.longitude,
      status: 'INCOMPLETE' as const,
      delivery_time_min: data.delivery_time_min,
      delivery_time_max: data.delivery_time_max,
      has_delivery_service: data.has_delivery_service,
      average_ticket: data.average_ticket,
      weekly_demand: data.weekly_demand,
      notes: data.notes,
      tax_id: data.tax_id,
      website: data.website,
      instagram: data.instagram,
    };

    // Handle file uploads
    const fileFields = ['logo_url', 'business_photo_facade_url', 'business_photo_interior_url', 'digital_menu_url', 'owner_ine_front_url', 'owner_ine_back_url', 'tax_situation_proof_url'];
    for (const field of fileFields) {
        const file = formData.get(field) as File | null;
        if (file) {
            businessDataToInsert[field] = await uploadFileAndGetUrl(supabaseAdmin, file, businessId, field);
        }
    }

    const { data: createdBusiness, error: insertError } = await supabaseAdmin
      .from('businesses')
      .insert(businessDataToInsert)
      .select()
      .single();

    if (insertError) {
        if (createdUserId) await supabaseAdmin.from('users').delete().eq('id', createdUserId);
        throw new Error(insertError.message || 'Error al crear el perfil del negocio.');
    }
    
    const userForSession: User = {
        id: createdUser.id, name: createdUser.name, email: createdUser.email,
        created_at: createdUser.created_at, role_id: createdUser.role_id, status: createdUser.status,
    };

    return NextResponse.json({ message: "Cuenta creada con éxito. Ahora completa el perfil de tu negocio.", user: userForSession, businessId: createdBusiness.id }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in business registration API (create mode):', error);
    if (createdUserId) await supabaseAdmin.from('users').delete().eq('id', createdUserId);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
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

  return handleCreateBusiness(request, supabaseAdmin);
}
