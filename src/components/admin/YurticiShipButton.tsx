'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface YurticiShipButtonProps {
  orderId: string;
  existingTracking?: string | null;
}

export default function YurticiShipButton({
  orderId,
  existingTracking,
}: YurticiShipButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [trackingNumber, setTrackingNumber] = useState<string | null>(
    existingTracking || null
  );

  const handleCreateShipment = async () => {
    if (trackingNumber) {
      // Already has tracking number
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/shipping/yurtici/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Kargo oluşturulurken bir hata oluştu');
      }

      setTrackingNumber(result.trackingNumber);
      setMessage({
        type: 'success',
        text: result.reused
          ? `Kargo zaten sistemde mevcut. Takip No: ${result.trackingNumber}`
          : `Kargo başarıyla oluşturuldu! Takip No: ${result.trackingNumber}`,
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
        text: error instanceof Error ? error.message : 'Kargo oluşturulurken bir hata oluştu',
      });
    } finally {
      setLoading(false);
    }
  };

  if (trackingNumber) {
    return (
      <div className="space-y-2">
        <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <span className="font-semibold">Kargo Takip No:</span> {trackingNumber}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCreateShipment}
        disabled={loading}
        className="px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Kargo Oluşturuluyor...' : 'Kargoya Ver'}
      </button>
      {message && (
        <div
          className={`px-4 py-2 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
