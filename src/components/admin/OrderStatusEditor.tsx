'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OrderStatusEditorProps {
  orderId: string;
  initialStatus: string | null;
}

const STATUS_OPTIONS = [
  { value: 'yeni', label: 'Yeni' },
  { value: 'hazirlaniyor', label: 'Hazırlanıyor' },
  { value: 'kargoya_verildi', label: 'Kargoya Verildi' },
  { value: 'tamamlandi', label: 'Tamamlandı' },
  { value: 'iptal', label: 'İptal' },
] as const;

export default function OrderStatusEditor({
  orderId,
  initialStatus,
}: OrderStatusEditorProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus || 'yeni');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSave = async () => {
    if (selectedStatus === initialStatus) {
      return; // No change
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: selectedStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Durum güncellenirken bir hata oluştu');
      }

      setMessage({ type: 'success', text: 'Durum başarıyla güncellendi!' });
      
      // Refresh server data
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Durum güncellenirken bir hata oluştu',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-center">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={loading || selectedStatus === initialStatus}
          className="px-4 py-2 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
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
