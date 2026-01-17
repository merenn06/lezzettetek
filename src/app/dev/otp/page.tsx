'use client';

import { useEffect, useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  let normalized = digits;
  if (normalized.startsWith('90')) {
    normalized = normalized;
  } else if (normalized.startsWith('0')) {
    normalized = `90${normalized.slice(1)}`;
  } else {
    normalized = `90${normalized}`;
  }
  return `+${normalized}`;
};

export default function DevOtpPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).supabase = supabase;
    }
  }, [supabase]);

  const handleSendOtp = async () => {
    setError('');
    setResult('');
    setIsSending(true);

    const formatted = normalizePhone(phone);
    try {
      const response = await supabase.auth.signInWithOtp({ phone: formatted });
      if (response.error) {
        setError(JSON.stringify(response.error, null, 2));
      } else {
        setResult(JSON.stringify(response.data, null, 2));
      }
    } catch (err) {
      setError(JSON.stringify(err, null, 2));
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setResult('');
    setIsVerifying(true);

    const formatted = normalizePhone(phone);
    try {
      const response = await supabase.auth.verifyOtp({
        phone: formatted,
        token: code,
        type: 'sms',
      });
      if (response.error) {
        setError(JSON.stringify(response.error, null, 2));
      } else {
        setResult(JSON.stringify(response.data, null, 2));
      }
    } catch (err) {
      setError(JSON.stringify(err, null, 2));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6 rounded-2xl bg-white p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Supabase Phone OTP Debug</h1>
          <p className="text-sm text-gray-600">
            Sadece development ortamında çalışır. Telefon numarasını +90 formatında girin.
          </p>
        </div>

        <div className="space-y-3">
          <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
            Telefon
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="+90 5xx xxx xx xx"
          />
        </div>

        <button
          type="button"
          onClick={handleSendOtp}
          disabled={isSending}
          className="w-full rounded-xl bg-green-700 px-4 py-3 text-white font-semibold shadow-md transition-colors hover:bg-green-800 disabled:opacity-60"
        >
          {isSending ? 'Gönderiliyor...' : 'OTP Gönder'}
        </button>

        <div className="space-y-3">
          <label htmlFor="code" className="block text-sm font-semibold text-gray-700">
            6 haneli kod
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="123456"
            inputMode="numeric"
          />
        </div>

        <button
          type="button"
          onClick={handleVerifyOtp}
          disabled={isVerifying}
          className="w-full rounded-xl border-2 border-green-700 px-4 py-3 font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60"
        >
          {isVerifying ? 'Doğrulanıyor...' : 'OTP Doğrula'}
        </button>

        {(result || error) && (
          <pre className="whitespace-pre-wrap rounded-xl bg-gray-900 p-4 text-sm text-gray-100">
            {result || error}
          </pre>
        )}
      </div>
    </main>
  );
}
