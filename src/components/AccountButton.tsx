'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/actions';

type AccountButtonProps = {
  isLoggedIn?: boolean;
  variant?: 'desktop' | 'mobile';
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
};

type VariantProps = {
  isLoggedIn: boolean;
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
};

function MobileAccountButton({ isLoggedIn, onOpenLogin, onOpenSignup }: VariantProps) {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  const handleSignOut = async () => {
    const result = await signOut();
    
    if (result?.success) {
      // Toast göster
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Auth state'i güncelle
      router.refresh();
      
      // Header'daki auth state'i de güncellemek için event dispatch
      window.dispatchEvent(new CustomEvent('auth-state-changed'));
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="space-y-2 pb-3 border-b border-green-200">
        <button
          type="button"
          onClick={onOpenLogin}
          className="block w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold text-center hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          Giriş Yap
        </button>
        <button
          type="button"
          onClick={onOpenSignup}
          className="block w-full px-4 py-2.5 bg-green-700 text-white rounded-lg font-semibold text-center hover:bg-green-800 transition-colors"
        >
          Kaydol
        </button>
      </div>
    );
  }

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
      <div className="space-y-2 pb-3 border-b border-green-200">
        <Link
          href="/account"
          className="block w-full px-4 py-2.5 bg-green-700 text-white rounded-lg font-semibold text-center hover:bg-green-800 transition-colors"
        >
          Hesabım
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="block w-full px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Çıkış
        </button>
      </div>
    </>
  );
}

function DesktopAccountButton({ isLoggedIn, onOpenLogin, onOpenSignup }: VariantProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const [showToast, setShowToast] = useState(false);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    const result = await signOut();
    
    if (result?.success) {
      // Toast göster
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Auth state'i güncelle
      router.refresh();
      
      // Header'daki auth state'i de güncellemek için event dispatch
      window.dispatchEvent(new CustomEvent('auth-state-changed'));
    }
  };

  // Giriş yapılmamışsa: Giriş Yap / Kaydol
  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenLogin}
          className="px-3 py-2 rounded-lg text-gray-700 hover:text-green-700 transition-colors text-sm font-medium"
        >
          Giriş Yap
        </button>
        <button
          type="button"
          onClick={onOpenSignup}
          className="px-4 py-2 bg-green-700 text-white rounded-full font-semibold text-sm hover:bg-green-800 transition-colors shadow-sm"
        >
          Kaydol
        </button>
      </div>
    );
  }

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
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-sm font-medium">Hesap</span>
          <svg
            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <Link
              href="/account"
              onClick={() => setIsDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              Hesabım
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function AccountButton({
  isLoggedIn = false,
  variant = 'desktop',
  onOpenLogin,
  onOpenSignup,
}: AccountButtonProps) {
  if (variant === 'mobile') {
    return <MobileAccountButton isLoggedIn={isLoggedIn} onOpenLogin={onOpenLogin} onOpenSignup={onOpenSignup} />;
  }

  return <DesktopAccountButton isLoggedIn={isLoggedIn} onOpenLogin={onOpenLogin} onOpenSignup={onOpenSignup} />;
}
