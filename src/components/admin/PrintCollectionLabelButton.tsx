'use client';

import { useState } from 'react';
import { Order } from '@/types/orders';

interface PrintCollectionLabelButtonProps {
  orderId: string;
  order?: Order | null;
}

export default function PrintCollectionLabelButton({
  orderId,
  order,
}: PrintCollectionLabelButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'warning' | 'error'; text: string } | null>(null);

  // Check if order is COD
  const isCOD = order ? (order.payment_method === 'cod' || order.payment_method === 'kapida') : false;
  const hasReferenceNumber = order ? !!order.shipping_reference_number : false;

  const handlePrintCollectionLabel = async () => {
    if (!isCOD) {
      setMessage({
        type: 'error',
        text: 'Bu sipariş kapıda ödeme değil.',
      });
      return;
    }

    if (!hasReferenceNumber) {
      setMessage({
        type: 'error',
        text: 'Kargo kaydı bulunamadı. Lütfen önce kargo oluşturun.',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/shipping/yurtici/collection-label?orderId=${orderId}`);
      const contentType = response.headers.get('content-type');

      // Check if response is JSON (error)
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        
        setMessage({
          type: 'error',
          text: data.error || 'Tahsilat etiketi yazdırılırken bir hata oluştu',
        });
        return;
      }

      // If response is PDF, open it
      if (contentType?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const windowRef = window.open(url, '_blank');
        if (windowRef) {
          windowRef.onload = () => {
            windowRef.print();
          };
        }
        setMessage({
          type: 'info',
          text: 'Tahsilat etiketi hazır.',
        });
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
        return;
      }

      // If redirect (Yurtiçi label URL)
      if (response.redirected || response.status === 302 || response.status === 301) {
        const url = response.url;
        window.open(url, '_blank');
        setMessage({
          type: 'info',
          text: 'Yurtiçi tahsilat etiketi açıldı.',
        });
        return;
      }

      // Fallback
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setMessage({
        type: 'info',
        text: 'Tahsilat etiketi hazır.',
      });
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Tahsilat etiketi yazdırılırken bir hata oluştu',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show for COD orders with shipment
  if (!isCOD || !hasReferenceNumber) {
    return null;
  }

  return (
    <div className="mt-3">
      <button
        onClick={handlePrintCollectionLabel}
        disabled={loading}
        className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Kapıda ödeme siparişleri için tahsilat etiketi yazdır"
      >
        {loading ? 'Yükleniyor...' : 'Tahsilat Barkodu Yazdır'}
      </button>
      {message && (
        <div
          className={`mt-2 px-4 py-2 rounded-lg text-sm ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : message.type === 'warning'
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-purple-50 border border-purple-200 text-purple-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}



