import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const token = params?.token;

  if (!token) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Bağlantı geçersiz</h1>
            <p className="text-gray-600">
              Abonelik iptal bağlantısı bulunamadı. Lütfen e-postadaki linki kontrol edin.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Hata</h1>
            <p className="text-gray-600">Sunucu yapılandırması eksik. Lütfen daha sonra tekrar deneyin.</p>
          </div>
        </div>
      </main>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("email_subscriptions")
    .update({ enabled: false })
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  const success = !!data && !error;

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {success ? "Abonelik iptal edildi" : "Abonelik bulunamadı"}
          </h1>
          <p className="text-gray-600">
            {success
              ? "E-posta bildirimleri artık kapalı. İstediğiniz zaman hesabınızdan tekrar açabilirsiniz."
              : "Bu abonelik zaten iptal edilmiş olabilir veya geçersiz bir bağlantı kullanılmıştır."}
          </p>
        </div>
      </div>
    </main>
  );
}
