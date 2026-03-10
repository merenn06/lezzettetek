'use client';

import { useState } from 'react';
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
  const [selectedType, setSelectedType] = useState<"cash" | "card">(initialPaymentType || "card");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSave = async (newType: "cash" | "card") => {
    if (newType === initialPaymentType) {
      setSelectedType(newType);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/shipping-payment-type`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shipping_payment_type: newType }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Tahsilat tipi güncellenirken bir hata oluştu');
      }

      setSelectedType(newType);
      setMessage({
        type: 'success',
        text: newType === "card" ? 'Tahsilat tipi Kapıda Kart olarak ayarlandı.' : 'Tahsilat tipi Kapıda Nakit olarak ayarlandı.',
      });
      
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
          value={selectedType}
          onChange={(e) => handleSave(e.target.value as "cash" | "card")}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800"
        >
          <option value="cash">Kapıda Nakit</option>
          <option value="card">Kapıda Kart (POS)</option>
        </select>
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

