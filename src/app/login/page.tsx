import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/actions';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getUser();

  // Zaten giriş yapmışsa redirect
  if (user) {
    const next = searchParams.next || '/account';
    redirect(next);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 py-12 px-4">
      <div className="container mx-auto max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Giriş Yap
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Hesabınıza giriş yapın
          </p>

          <LoginForm next={searchParams.next} />
        </div>
      </div>
    </div>
  );
}
