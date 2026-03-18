'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { businessAccountCreationSchema, businessSchema } from '@/lib/schemas';
import { faker } from '@faker-js/faker';
import { hashPassword } from '@/lib/auth-utils';
import type { Business, User } from '@/types';

async function uploadFileAndGetUrl(supabaseAdmin: any, file: File, businessId: string, fileName: string): Promise<string> {
    const filePath = `store/${businessId}/${fileName}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).upload(filePath, file);
    if (uploadError) throw new Error(`Error al subir ${fileName}: ${uploadError.message}`);
    const { data } = supabaseAdmin.storage.from(process.env.SUPABASE_BUCKET!).getPublicUrl(filePath);
    return data.publicUrl;
}

async function parseBusinessFormData(
  formData: FormData,
  supabaseAdmin: any,
  businessId: string,
) {
  const parsedData: Record<string, any> = {};
  const fileFields = [
    'logo_url',
    'business_photo_facade_url',
    'business_photo_interior_url',
    'digital_menu_url',
    'owner_ine_front_url',
    'owner_ine_back_url',
    'tax_situation_proof_url',
  ];
  const numericFields = [
    'latitude',
    'longitude',
    'delivery_time_min',
    'delivery_time_max',
    'average_ticket',
  ];
  const booleanFields = ['has_delivery_service'];

  for (const fieldName of fileFields) {
    const value = formData.get(fieldName);
    if (value instanceof File && value.size > 0) {
      parsedData[fieldName] = await uploadFileAndGetUrl(
        supabaseAdmin,
        value,
        businessId,
        fieldName,
      );
    } else if (typeof value === 'string' && value.length > 0) {
      parsedData[fieldName] = value;
    }
  }

  for (const [key, value] of formData.entries()) {
    if (fileFields.includes(key) || value instanceof File) {
      continue;
    }
    if (booleanFields.includes(key)) {
      parsedData[key] = value === 'true';
      continue;
    }
    if (numericFields.includes(key)) {
      if (value !== '' && value !== 'undefined' && value !== 'null') {
        parsedData[key] = Number(value);
      }
      continue;
    }
    if (
      key === 'phone_whatsapp' &&
      typeof value === 'string' &&
      value.length >= 10 &&
      !value.startsWith('+52')
    ) {
      parsedData[key] = `+52${value}`;
      continue;
    }
    if (value !== '' && value !== 'undefined' && value !== 'null') {
      parsedData[key] = value;
    }
  }

  return parsedData;
}

async function handleCreateBusiness(request: Request, supabaseAdmin: any) {
  const formData = await request.formData();
  
  const rawData: Record<string, any> = {};
  for(const [key, value] of formData.entries()) {
      rawData[key] = value;
  }
  
  // Para la creación de la cuenta, solo validamos los campos necesarios
  const validatedAccount = businessAccountCreationSchema.safeParse(rawData);

  if (!validatedAccount.success) {
    console.error("Validation errors:", validatedAccount.error.flatten().fieldErrors);
    return NextResponse.json({ message: "Datos de creación de cuenta inválidos.", errors: validatedAccount.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = validatedAccount.data;
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

    const parsedBusinessData = await parseBusinessFormData(
      formData,
      supabaseAdmin,
      businessId,
    );
    const validatedBusiness = businessSchema.safeParse({
      ...parsedBusinessData,
      id: businessId,
      owner_name: data.owner_name,
      email: data.email,
    });

    if (!validatedBusiness.success) {
      if (createdUserId) {
        await supabaseAdmin.from('users').delete().eq('id', createdUserId);
      }
      return NextResponse.json(
        {
          message: 'Datos del negocio inválidos.',
          errors: validatedBusiness.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const businessDataToInsert: Partial<Business> = {
      ...validatedBusiness.data,
      id: businessId,
      user_id: createdUser.id,
      status: validatedBusiness.data.status || 'PENDING_REVIEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdBusiness, error: insertError } = await supabaseAdmin
      .from('businesses')
      .insert(businessDataToInsert)
      .select('id')
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
