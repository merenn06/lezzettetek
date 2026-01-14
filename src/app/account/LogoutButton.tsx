'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/actions';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    const result = await signOut();
    
    if (result?.success) {
      // Toast göster
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Auth state'i güncelle
      router.refresh();
      
      // Header'daki auth state'i de güncellemek için event dispatch
      window.dispatchEvent(new CustomEvent('auth-state-changed'));
      
      // Ana sayfaya yönlendir
      router.push('/');
    }
    
    setIsLoading(false);
  };

  return (
    <>
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Çıkış yapıldı</span>
        </div>
      )}
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
      </button>
    </>
  );
}
