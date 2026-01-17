'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type PhoneOtpFormProps = {
  mode: 'login' | 'signup';
  fullName?: string;
  onSuccess: () => void;
};

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  let normalized = digits;
  if (normalized.startsWith('90')) {
    normalized = normalized;
  } else if (normalized.startsWith('0')) {
    normalized = `90${normalized.slice(1)}`;
  } else if (normalized.length === 10 && normalized.startsWith('5')) {
    normalized = `90${normalized}`;
  }
  return `+${normalized}`;
};

const isValidPhone = (value: string) => /^\+90\d{10}$/.test(value);

export default function PhoneOtpForm({ mode, fullName, onSuccess }: PhoneOtpFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    setError(null);
    setSuccessMessage(null);

    if (mode === 'signup' && (!fullName || !fullName.trim())) {
      setError('Ad Soyad zorunludur.');
      return;
    }

    const formatted = normalizePhone(phone);
    if (!isValidPhone(formatted)) {
      setError('Telefon numarası formatı geçersiz. Örn: +905551112233');
      return;
    }

    setIsSending(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: formatted,
      options: {
        channel: 'sms',
        shouldCreateUser: mode === 'signup',
      },
    });

    if (otpError) {
      setError(otpError.message || 'SMS gönderilemedi. Lütfen tekrar deneyin.');
      setIsSending(false);
      return;
    }

    setNormalizedPhone(formatted);
    setStep('otp');
    setCooldown(60);
    setSuccessMessage('Doğrulama kodu gönderildi.');
    setIsSending(false);
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      setError('Telefon numarası doğrulanamadı. Lütfen yeniden kod gönderin.');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Kod 6 haneli olmalıdır.');
      return;
    }

    setIsVerifying(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otp,
      type: 'sms',
    });

    if (verifyError) {
      setError(verifyError.message || 'Kod doğrulanamadı.');
      setIsVerifying(false);
      return;
    }

    if (mode === 'signup') {
      const userId = data?.session?.user?.id;
      if (userId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              full_name: fullName?.trim() || 'Yeni Kullanıcı',
              phone: normalizedPhone,
              email: data?.session?.user?.email ?? null,
            },
            { onConflict: 'id' }
          );

        if (profileError) {
          console.error('[phone-signup] Profile upsert error:', profileError);
          setError('Profil kaydı oluşturulamadı. Lütfen tekrar deneyin.');
          setIsVerifying(false);
          return;
        }
      }
    }

    setSuccessMessage('Doğrulama başarılı.');
    setIsVerifying(false);
    onSuccess();
  };

  return (
    <div className="space-y-4">
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
          placeholder="+90 5xx xxx xx xx"
          disabled={isSending || isVerifying}
        />
        <p className="mt-2 text-xs text-gray-500">Örnek: +905551112233</p>
      </div>

      {step === 'otp' && (
        <div>
          <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
            SMS doğrulama kodu
          </label>
          <input
            type="text"
            id="otp"
            name="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all tracking-[0.4em] text-center text-lg"
            placeholder="••••••"
            disabled={isVerifying}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSendOtp}
          disabled={isSending || cooldown > 0}
          className="flex-1 px-6 py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSending
            ? 'Kod gönderiliyor...'
            : cooldown > 0
            ? `Tekrar gönder (${cooldown}s)`
            : 'Kodu Gönder'}
        </button>
        <button
          type="button"
          onClick={handleVerifyOtp}
          disabled={isVerifying || step !== 'otp'}
          className="flex-1 px-6 py-3 bg-white text-green-700 border-2 border-green-700 rounded-xl font-semibold hover:bg-green-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Doğrulanıyor...' : 'Kodu Onayla'}
        </button>
      </div>
    </div>
  );
}
