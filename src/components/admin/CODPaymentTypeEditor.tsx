'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CODPaymentTypeEditorProps {
  orderId: string;
  initialPaymentType: "cash" | "card" | null;
}

export default function CODPaymentTypeEditor({
  orderId,
  initialPaymentType,
}: CODPaymentTypeEditorProps) {
  const router = useRouter();
  // Always "card" - contract requires credit card collection only
  const [selectedType] = useState<"card">("card");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Auto-save to "card" if not already set
  useEffect(() => {
    if (initialPaymentType !== "card") {
      handleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (initialPaymentType === "card") {
      return; // Already set
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/shipping-payment-type`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shipping_payment_type: "card" }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Tahsilat tipi güncellenirken bir hata oluştu');
      }

      setMessage({ type: 'success', text: 'Tahsilat tipi kredi kartı olarak ayarlandı (kontrat gereği)' });
      
      // Refresh server data
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Tahsilat tipi güncellenirken bir hata oluştu',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-center">
        <select
          value="card"
          disabled={true}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
        >
          <option value="card">Kredi Kartı (Kontrat gereği)</option>
        </select>
        {initialPaymentType !== "card" && (
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Kaydediliyor...' : 'Kredi Kartına Güncelle'}
          </button>
        )}
      </div>
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

