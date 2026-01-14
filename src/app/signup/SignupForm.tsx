'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp } from '@/lib/auth/actions';

export default function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Şifre kontrolü
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(email, password, fullName);

      if (!result.success) {
        setError(result.error || 'Kayıt yapılamadı. Lütfen tekrar deneyin.');
        setIsLoading(false);
        return;
      }

      // User null gelirse (nadir durum) login ekranına yönlendir
      if (!result.user) {
        setError('Kullanıcı oluşturulamadı. Lütfen giriş yapmayı deneyin.');
        setIsLoading(false);
        return;
      }

      // Session varsa direkt giriş yapılmış (email confirmation kapalı)
      if (result.session) {
        // Başarılı kayıt ve giriş - redirect
        const redirectTo = next || searchParams.get('next') || '/account';
        router.push(redirectTo);
        router.refresh();
        return;
      }

      // Session yoksa (email confirmation açık olabilir) login ekranına yönlendir
      setError('Kayıt başarılı ancak giriş yapılamadı. Lütfen giriş yapmayı deneyin.');
      setIsLoading(false);
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm font-medium">{successMessage}</p>
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
          Ad Soyad
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
          placeholder="Adınız ve soyadınız"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
          E-posta
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
          placeholder="ornek@email.com"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
          Şifre
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
          placeholder="En az 6 karakter"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
          Şifre Tekrar
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
          placeholder="Şifrenizi tekrar girin"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Kayıt yapılıyor...' : 'Kaydol'}
      </button>

      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-gray-600 text-sm">
          Zaten hesabın var mı?{' '}
          <Link
            href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-green-700 font-semibold hover:text-green-800 transition-colors"
          >
            Giriş Yap
          </Link>
        </p>
      </div>
    </form>
  );
}
