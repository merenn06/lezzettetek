import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/actions';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getUser();

  // Giriş yapılmamışsa login'e yönlendir
  if (!user) {
    redirect('/login?next=/account');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Hesabım</h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                E-posta
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telefon
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900">
                {user.phone || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Kullanıcı ID
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-600 text-sm font-mono">
                {user.id}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
