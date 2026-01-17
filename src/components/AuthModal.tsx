'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPassword, signUpWithPassword } from '@/lib/auth/actions';
import PhoneOtpForm from '@/components/PhoneOtpForm';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
  onAuthSuccess?: () => void;
};

export default function AuthModal({ isOpen, onClose, initialTab = 'login', onAuthSuccess }: AuthModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const modalRef = useRef<HTMLDivElement>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // ESC ile kapat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Modal açıldığında tab'ı güncelle
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          aria-label="Kapat"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'login'
                ? 'text-green-700 border-b-2 border-green-700 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signup')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'signup'
                ? 'text-green-700 border-b-2 border-green-700 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Kaydol
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'login' ? (
            <LoginForm onSuccess={() => {
              onClose();
              onAuthSuccess?.();
            }} />
          ) : (
            <SignupForm onSuccess={() => {
              onClose();
              onAuthSuccess?.();
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

// Login Form Component
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
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

      const result = await signInWithPassword(email.trim(), password);

      if (!result.success) {
        setError(result.error || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
        setIsLoading(false);
        return;
      }

      // Başarılı giriş
      router.refresh();
      onSuccess();
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
            <label htmlFor="modal-email" className="block text-sm font-semibold text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              id="modal-email"
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
            <label htmlFor="modal-password" className="block text-sm font-semibold text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              id="modal-password"
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
        <PhoneOtpForm
          mode="login"
          onSuccess={() => {
            router.refresh();
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

// Signup Form Component
function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
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

    // Validasyon
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
      const result = await signUpWithPassword(email, password, fullName);

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
        // Başarılı kayıt ve giriş
        router.refresh();
        onSuccess();
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

          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium">{successMessage}</p>
            </div>
          )}

          <div>
            <label htmlFor="modal-fullname" className="block text-sm font-semibold text-gray-700 mb-2">
              Ad Soyad
            </label>
            <input
              type="text"
              id="modal-fullname"
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
            <label htmlFor="modal-signup-email" className="block text-sm font-semibold text-gray-700 mb-2">
              E-posta
            </label>
            <input
              type="email"
              id="modal-signup-email"
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
            <label htmlFor="modal-signup-password" className="block text-sm font-semibold text-gray-700 mb-2">
              Şifre
            </label>
            <input
              type="password"
              id="modal-signup-password"
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
            <label htmlFor="modal-signup-confirm" className="block text-sm font-semibold text-gray-700 mb-2">
              Şifre Tekrar
            </label>
            <input
              type="password"
              id="modal-signup-confirm"
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
        </form>
      ) : (
        <div className="space-y-6">
          <div>
            <label htmlFor="modal-phone-fullname" className="block text-sm font-semibold text-gray-700 mb-2">
              Ad Soyad
            </label>
            <input
              type="text"
              id="modal-phone-fullname"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="Adınız ve soyadınız"
              disabled={isLoading}
            />
          </div>
          <PhoneOtpForm
            mode="signup"
            fullName={fullName}
            onSuccess={() => {
              router.refresh();
              onSuccess();
            }}
          />
        </div>
      )}
    </div>
  );
}
