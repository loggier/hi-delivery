
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
