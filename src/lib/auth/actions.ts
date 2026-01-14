'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    let message = error.message;
    if (/email.*confirm/i.test(message)) {
      message = 'E-posta adresiniz henüz doğrulanmamış. Lütfen e-posta kutunuzu kontrol edin.';
    }

    return {
      success: false,
      error: message,
    };
  }

  if (!data.session) {
    return {
      success: false,
      error: 'Giriş yapılamadı. Lütfen tekrar deneyin.',
    };
  }

  revalidatePath('/', 'layout');
  return {
    success: true,
    session: data.session,
  };
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // User oluşmadıysa hata
  if (!data.user) {
    return {
      success: false,
      error: 'Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.',
    };
  }

  // User oluştuysa profile ekle (mümkünse hemen)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      full_name: fullName,
    });

  if (profileError) {
    console.error('[signUp] Profile insert error:', profileError);
    // Profil eklenemese bile kullanıcı oluştu, devam et
  }

  // Session varsa direkt giriş yapılmış (email confirmation kapalı)
  // Session yoksa da user oluştu, kullanıcı login ekranına yönlendirilebilir
  // Ama genelde email confirmation kapalıysa session gelir
  revalidatePath('/', 'layout');
  return {
    success: true,
    session: data.session,
    user: data.user,
  };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  // Redirect yapmıyoruz, sayfa aynı kalsın
  return { success: true };
}

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
