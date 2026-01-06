'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order } from '@/types/orders';
import { canCreateShipment } from '@/lib/shipping/canCreateShipment';

interface YurticiShipButtonProps {
  orderId: string;
  existingTracking?: string | null;
  order?: Order | null;
}

export default function YurticiShipButton({
  orderId,
  existingTracking,
  order,
}: YurticiShipButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [trackingNumber, setTrackingNumber] = useState<string | null>(
    existingTracking || null
  );

  // Update tracking number when order prop changes (e.g., after refresh)
  useEffect(() => {
    const currentTracking = order?.shipping_tracking_number || existingTracking || null;
    if (currentTracking && currentTracking !== trackingNumber) {
      setTrackingNumber(currentTracking);
    }
  }, [order?.shipping_tracking_number, existingTracking, trackingNumber]);

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
        // Special handling for error code 82512
        if (result.errorCode === 82512 || result.errorType === 'contract_restriction') {
          throw new Error('Kontratınız kredi kartı tahsilat olarak tanımlı, nakit seçilemez');
        }
        throw new Error(result.error || 'Kargo oluşturulurken bir hata oluştu');
      }

      // Update tracking number if available
      if (result.trackingNumber) {
        setTrackingNumber(result.trackingNumber);
      }

      // Build success message based on tracking number availability
      let successMessage: string;
      if (result.trackingNumber) {
        successMessage = result.reused
          ? `Kargo zaten sistemde mevcut. Takip No: ${result.trackingNumber}`
          : `Kargo başarıyla oluşturuldu! Takip No: ${result.trackingNumber}`;
      } else {
        successMessage = result.reused
          ? `Kargo zaten sistemde mevcut. Takip No: (Barkod yenile sonrası oluşacak)`
          : `Kargo başarıyla oluşturuldu! Takip No: (Barkod yenile sonrası oluşacak)`;
      }

      setMessage({
        type: 'success',
        text: successMessage,
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

  // Check if shipment can be created
  const canCreate = order ? canCreateShipment(order) : true; // Default to true if order not provided (for backward compatibility)

  return (
    <div className="space-y-2">
      <button
        onClick={handleCreateShipment}
        disabled={loading || !canCreate}
        className="px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={!canCreate ? 'Bu sipariş için kargo oluşturulamaz. Ödeme durumu veya sipariş durumu uygun değil.' : undefined}
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

