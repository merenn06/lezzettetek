import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sanitize file name for Supabase storage (removes invalid characters)
function sanitizeFileName(fileName: string): string {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
  const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;

  // Normalize Turkish characters and convert to lowercase
  const normalized = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim();

  // Replace spaces and invalid characters with hyphens
  const sanitized = normalized
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9\-_]/g, '-') // Replace invalid chars with hyphens
    .replace(/\-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens

  // Ensure we have a valid name (fallback to 'file' if empty)
  const finalName = sanitized || 'file';

  return `${finalName}${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase env değişkenleri eksik' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Dosya bulunamadı' },
        { status: 400 }
      );
    }

    // Validate file type - only allow browser-friendly image formats
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    // Check if file type is allowed
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      // Check for HEIC/HEIF specifically
      if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        return NextResponse.json(
          { success: false, error: 'Bu dosya formatı desteklenmiyor. Lütfen JPG veya PNG yükleyin.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Bu dosya formatı desteklenmiyor. Lütfen JPG veya PNG yükleyin.' },
        { status: 400 }
      );
    }

    // Sanitize file name
    const timestamp = Date.now();
    const sanitizedName = sanitizeFileName(file.name);
    const fileName = `${timestamp}-${sanitizedName}`;
    const filePath = `products/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Image upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    const imageUrl = data.publicUrl;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Public URL alınamadı' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, imageUrl },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('API /admin/upload-image POST hata:', err);
    return NextResponse.json(
      { success: false, error: err.message ?? 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

