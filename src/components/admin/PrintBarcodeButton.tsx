'use client';

import { useState } from 'react';
import { Order } from '@/types/orders';
import { canCreateShipment } from '@/lib/shipping/canCreateShipment';

interface PrintBarcodeButtonProps {
  orderId: string;
  hasTrackingNumber: boolean;
  hasReferenceNumber: boolean;
  order?: Order | null;
}

export default function PrintBarcodeButton({
  orderId,
  hasTrackingNumber,
  hasReferenceNumber,
  order,
}: PrintBarcodeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'warning' | 'error'; text: string } | null>(null);

  const handlePrintBarcode = async () => {
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
      const response = await fetch(`/api/shipping/yurtici/label?orderId=${orderId}`);
      const contentType = response.headers.get('content-type');

      // Check if response is JSON (error)
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        
        // JSON response means error
        setMessage({
          type: 'error',
          text: data.error || 'Barkod yazdırılırken bir hata oluştu',
        });
        return;
      }

      // If response is PDF, open it
      if (contentType?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        // Open PDF in a new tab; DO NOT auto-trigger print.
        // Auto print can force browser default paper size (often A4) and scale/center the label.
        window.open(url, '_blank', 'noopener,noreferrer');
        // Show success message
        setMessage({
          type: 'info',
          text: hasTrackingNumber
            ? 'Barkod PDF açıldı. Yazdırırken %100 / Actual size seçin (A4 fit kapalı).'
            : 'Barkod PDF açıldı. Yazdırırken %100 / Actual size seçin (A4 fit kapalı).',
        });
        // Clean up after a delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
        return;
      }

      // Fallback: try to open as PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setMessage({
        type: 'info',
        text: hasTrackingNumber 
          ? 'Barkod hazır. ORDER_SEQ ile basıldı.' 
          : 'Barkod hazır. Kargo anahtarı ile basıldı.',
      });
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Barkod yazdırılırken bir hata oluştu',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasReferenceNumber) {
    return null;
  }

  // Check if shipment can be created (for barcode printing, we need shipment to exist or be creatable)
  const canCreate = order ? (hasReferenceNumber || canCreateShipment(order)) : hasReferenceNumber;

  // ORDER_SEQ is not required - LT (cargoKey) can be used for barcode printing
  // Show active button if reference exists or shipment can be created
  return (
    <div className="mt-3">
      <button
        onClick={handlePrintBarcode}
        disabled={loading || !canCreate}
        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={!canCreate ? 'Bu sipariş için barkod yazdırılamaz. Önce kargo oluşturulmalı.' : undefined}
      >
        {loading ? 'Yükleniyor...' : 'Barkodu Yazdır'}
      </button>
      {message && (
        <div
          className={`mt-2 px-4 py-2 rounded-lg text-sm ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : message.type === 'warning'
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

