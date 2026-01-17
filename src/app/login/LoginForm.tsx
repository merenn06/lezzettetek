'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithPassword, signInWithPhonePassword } from '@/lib/auth/actions';
import { normalizePhoneTR } from '@/lib/phone/normalizePhoneTR';

export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (password.length < 6) {
        setError('Şifre en az 6 karakter olmalıdır.');
        setIsLoading(false);
        return;
      }

      if (authMethod === 'phone') {
        try {
          normalizePhoneTR(phone);
        } catch {
          setError('Geçersiz telefon numarası');
          setIsLoading(false);
          return;
        }
      }

      const result =
        authMethod === 'email'
          ? await signInWithPassword(email.trim(), password)
          : await signInWithPhonePassword(phone, password);

      if (!result.success) {
        setError(result.error || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
        setIsLoading(false);
        return;
      }

      // Başarılı giriş - redirect
      const redirectTo = next || searchParams.get('next') || '/account';
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setAuthMethod('email')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            authMethod === 'email' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600'
          }`}
        >
          E-posta ile
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod('phone')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            authMethod === 'phone' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600'
          }`}
        >
          Telefon ile
        </button>
      </div>

      {authMethod === 'email' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

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
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Telefon
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="05xx xxx xx xx"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="phone-password" className="block text-sm font-semibold text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              id="phone-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      )}

      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-gray-600 text-sm">
          Hesabın yok mu?{' '}
          <Link
            href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-green-700 font-semibold hover:text-green-800 transition-colors"
          >
            Kaydol
          </Link>
        </p>
      </div>
    </div>
  );
}
