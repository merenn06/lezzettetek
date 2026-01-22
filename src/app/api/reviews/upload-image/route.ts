export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : "";
  const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;

  const normalized = nameWithoutExt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const sanitized = normalized
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  const finalName = sanitized || "file";
  return `${finalName}${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Supabase env değişkenleri eksik" },
        { status: 500 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `Dosya boyutu en fazla ${MAX_FILE_SIZE_MB}MB olmalıdır.` },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Bu dosya formatı desteklenmiyor. Lütfen JPG veya PNG yükleyin." },
        { status: 400 }
      );
    }

    const storageClient = createClient(supabaseUrl, supabaseServiceKey);
    const timestamp = Date.now();
    const sanitizedName = sanitizeFileName(file.name);
    const filePath = `reviews/${user.id}/${timestamp}-${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await storageClient.storage
      .from("review-images")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("[reviews-upload] Image upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = storageClient.storage
      .from("review-images")
      .getPublicUrl(filePath);

    const imageUrl = data.publicUrl;
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "Public URL alınamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, imageUrl },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("API /reviews/upload-image POST hata:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
