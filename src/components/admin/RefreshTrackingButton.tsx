'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RefreshTrackingButtonProps {
  orderId: string;
}

export default function RefreshTrackingButton({ orderId }: RefreshTrackingButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(
    null
  );

  const handleRefreshTracking = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/shipping/yurtici/refresh-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      // Handle 202 (pending) status
      if (response.status === 202 && result.status === 'pending') {
        setMessage({
          type: 'warning',
          text: result.message || 'ORDER_SEQ henüz oluşmadı, birazdan tekrar deneyin',
        });
        // Clear warning message after 8 seconds
        setTimeout(() => {
          setMessage(null);
        }, 8000);
        setLoading(false);
        return;
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Takip numarası yenilenirken bir hata oluştu');
      }

      setMessage({
        type: 'success',
        text: result.message || `Takip numarası güncellendi: ${result.trackingNumber}`,
      });

      // Refresh server data
      router.refresh();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setMessage(null);
      }, 5000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Takip numarası yenilenirken bir hata oluştu',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleRefreshTracking}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Yenileniyor...' : 'Barkodu Yenile'}
      </button>
      {message && (
        <div
          className={`text-sm p-2 rounded ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.type === 'warning'
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}


