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
    
    // Ahora insertamos un negocio con datos mínimos, ya que el resto se completará en los siguientes pasos
    const businessDataToInsert: Partial<Business> = {
      id: businessId,
      user_id: createdUser.id,
      owner_name: data.owner_name,
      email: data.email,
      status: 'INCOMPLETE' as const,
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
