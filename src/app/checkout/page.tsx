'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateShipping } from '@/lib/shipping';

// Helper function to execute scripts from HTML content
function executeScripts(container: HTMLElement) {
  const scripts = container.querySelectorAll('script');
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showIyzicoForm, setShowIyzicoForm] = useState(false);
  const [iyzicoFormContent, setIyzicoFormContent] = useState<string | null>(null);
  const iyzicoContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Contact info
    fullName: '',
    phone: '',
    email: '',
    // Address
    addressTitle: '',
    addressLine: '',
    city: '',
    district: '',
    postalCode: '',
    deliveryNote: '',
    // Corporate invoice
    corporateInvoice: false,
    companyName: '',
    taxNumber: '',
    taxOffice: '',
    // Shipping
    shippingMethod: 'yurtici-kargo',
    // Payment
    paymentMethod: 'kapida-odeme',
    codPaymentType: 'card' as 'cash' | 'card', // COD tahsilat tipi - kontrat gereği her zaman "card"
    // Confirmation
    termsAccepted: false,
    privacyAccepted: false,
  });

  // Format price helper
  const formatPrice = (price: number) => {
    return price.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const subtotal = getTotalPrice();
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  // Render iyzico form content when available
  useEffect(() => {
    if (showIyzicoForm && iyzicoFormContent && iyzicoContainerRef.current) {
      iyzicoContainerRef.current.innerHTML = iyzicoFormContent;
      executeScripts(iyzicoContainerRef.current);
    }
  }, [showIyzicoForm, iyzicoFormContent]);


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const normalizedValue =
      name === 'taxNumber' ? value.replace(/\D/g, '') : value;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : normalizedValue,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Contact info validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Ad Soyad gereklidir';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon numarası gereklidir';
    }
    // Email is optional, but if provided, it must be valid
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    // Address validation
    if (!formData.addressLine.trim()) {
      newErrors.addressLine = 'Adres satırı gereklidir';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'İl gereklidir';
    }
    if (!formData.district.trim()) {
      newErrors.district = 'İlçe gereklidir';
    }

    // Corporate invoice validation
    if (formData.corporateInvoice) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Firma adı gereklidir';
      }
      if (!formData.taxOffice.trim()) {
        newErrors.taxOffice = 'Vergi dairesi gereklidir';
      }
      const taxNumber = formData.taxNumber.trim();
      if (!taxNumber) {
        newErrors.taxNumber = 'Vergi numarası gereklidir';
      } else if (!(taxNumber.length === 10 || taxNumber.length === 11)) {
        newErrors.taxNumber = 'Vergi numarası 10 (VKN) veya 11 (TCKN) haneli olmalıdır.';
      }
    }

    // Confirmation checkboxes
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'Bu onay gereklidir';
    }
    if (!formData.privacyAccepted) {
      newErrors.privacyAccepted = 'Bu onay gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Clear previous errors
    setApiError(null);
    setSuccessMessage(null);

    // Check if iyzico payment is selected
    if (formData.paymentMethod === 'siteden-odeme') {
      // iyzico payment flow
      try {
        // First, create order with pending_payment status
        const invoiceType = formData.corporateInvoice ? 'corporate' : 'individual';
        const orderData = {
          customer_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          address: formData.addressLine.trim(),
          city: formData.city.trim(),
          district: formData.district.trim(),
          note: formData.deliveryNote.trim() || null,
          payment_method: 'iyzico',
          invoice_type: invoiceType,
          invoice_company_name: formData.corporateInvoice ? formData.companyName.trim() : null,
          invoice_tax_number: formData.corporateInvoice ? formData.taxNumber.trim() : null,
          invoice_tax_office: formData.corporateInvoice ? formData.taxOffice.trim() : null,
          items: items.map((item) => ({
            product_id: item.product.id,
            product_name: item.product.name,
            unit_price: item.product.price || 0,
            quantity: item.quantity,
          })),
        };

        // Create order
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        const orderResult = await orderResponse.json();

        if (!orderResponse.ok || !orderResult.success) {
          throw new Error(orderResult.error || 'Sipariş oluşturulurken bir hata oluştu');
        }

        const orderId = orderResult.orderId;

        // Initialize iyzico payment
        const iyzicoResponse = await fetch('/api/payment/iyzico/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId }),
        });

        const iyzicoResult = await iyzicoResponse.json();

        if (!iyzicoResponse.ok || !iyzicoResult.ok) {
          throw new Error(iyzicoResult.error || 'Ödeme formu oluşturulurken bir hata oluştu');
        }

        // Show iyzico form
        setIyzicoFormContent(iyzicoResult.checkoutFormContent);
        setShowIyzicoForm(true);
        setIsSubmitting(false);

        // Scroll to form
        setTimeout(() => {
          iyzicoContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'Ödeme başlatılırken bir hata oluştu');
        setIsSubmitting(false);
      }
      return;
    }

    // Regular payment flow (kapida-odeme)
    const paymentMethodMap: Record<string, 'havale' | 'kapida'> = {
      'kapida-odeme': 'kapida',
      'siteden-odeme': 'havale',
    };

    const paymentMethod = paymentMethodMap[formData.paymentMethod] || 'kapida';

    // Prepare order data for API
    const invoiceType = formData.corporateInvoice ? 'corporate' : 'individual';
    const orderData = {
      customer_name: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      address: formData.addressLine.trim(),
      city: formData.city.trim(),
      district: formData.district.trim(),
      note: formData.deliveryNote.trim() || null,
      payment_method: paymentMethod,
      // COD tahsilat tipi: kontrat gereği her zaman "card" (kredi kartı)
      shipping_payment_type: paymentMethod === 'kapida' ? 'card' : null,
      invoice_type: invoiceType,
      invoice_company_name: formData.corporateInvoice ? formData.companyName.trim() : null,
      invoice_tax_number: formData.corporateInvoice ? formData.taxNumber.trim() : null,
      invoice_tax_office: formData.corporateInvoice ? formData.taxOffice.trim() : null,
      items: items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        unit_price: item.product.price || 0,
        quantity: item.quantity,
      })),
    };

    try {
      // POST to API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sipariş gönderilirken bir hata oluştu');
      }

      // Success
      setSuccessMessage('Siparişiniz başarıyla alındı.');
      
      // Clear cart
      clearCart();

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/tesekkurler?orderId=${result.orderId}`);
      }, 2000);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Sipariş gönderilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <svg
              className="w-24 h-24 mx-auto mb-6 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sepetiniz boş</h2>
            <p className="text-gray-600 mb-8">Ödeme yapmak için sepetinizde ürün bulunmalıdır.</p>
            <Link
              href="/cart"
              className="inline-block px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors"
            >
              Sepete Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/cart"
            className="inline-flex items-center text-gray-600 hover:text-green-700 transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Sepete Geri Dön
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Ödeme</h1>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {apiError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center">
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>{apiError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary - RIGHT COLUMN (shown first on mobile) */}
          <div className="lg:col-span-1 lg:order-2 order-1">
            <div className="bg-white rounded-xl shadow-md p-6 md:sticky md:top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sipariş Özeti</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Ara Toplam:</span>
                  <span className="font-semibold">{formatPrice(subtotal)} ₺</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Kargo:</span>
                  <span className="font-semibold">
                    {shipping > 0 ? `${formatPrice(shipping)} ₺` : 'Ücretsiz'}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Toplam:</span>
                  <span className="text-2xl font-bold text-green-700">
                    {formatPrice(total)} ₺
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  form="checkout-form"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Siparişi Tamamla'}
                </button>
                <Link
                  href="/cart"
                  className="block w-full py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
                >
                  Sepete Geri Dön
                </Link>
              </div>
            </div>
          </div>

          {/* Checkout Form - LEFT COLUMN */}
          <div className="lg:col-span-2 lg:order-1 order-2">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Contact Info */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">İletişim Bilgileri</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                      Ad Soyad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Adınız ve soyadınız"
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon Numarası <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="05XX XXX XX XX"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      E-posta Adresi
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="ornek@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  Siparişinizle ilgili gerektiğinde sizinle bu bilgiler üzerinden iletişime geçeceğiz.
                </p>
              </div>

              {/* 2. Delivery Address */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Teslimat Adresi</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="addressTitle" className="block text-sm font-medium text-gray-700 mb-1">
                      Adres Başlığı
                    </label>
                    <input
                      type="text"
                      id="addressTitle"
                      name="addressTitle"
                      value={formData.addressTitle}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ev, İş, vb."
                    />
                  </div>

                  <div>
                    <label htmlFor="addressLine" className="block text-sm font-medium text-gray-700 mb-1">
                      Adres Satırı <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="addressLine"
                      name="addressLine"
                      value={formData.addressLine}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.addressLine ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Mahalle, sokak, cadde, bina no, daire no"
                    />
                    {errors.addressLine && (
                      <p className="mt-1 text-sm text-red-500">{errors.addressLine}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        İl <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          errors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="İl"
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                        İlçe <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          errors.district ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="İlçe"
                      />
                      {errors.district && (
                        <p className="mt-1 text-sm text-red-500">{errors.district}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Posta Kodu
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="34000"
                    />
                  </div>

                  <div>
                    <label htmlFor="deliveryNote" className="block text-sm font-medium text-gray-700 mb-1">
                      Teslimat Notu
                    </label>
                    <textarea
                      id="deliveryNote"
                      name="deliveryNote"
                      value={formData.deliveryNote}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Kapı şifresi, adres tarifi vb."
                    />
                  </div>
                </div>
              </div>

              {/* 2.1 Corporate Invoice */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Kurumsal Fatura</h2>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="corporateInvoice"
                    checked={formData.corporateInvoice}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-green-700 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Kurumsal fatura istiyorum.
                  </span>
                </label>

                {formData.corporateInvoice && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                        Firma Adı <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          errors.companyName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Firma Adı"
                      />
                      {errors.companyName && (
                        <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="taxNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Vergi Numarası <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="taxNumber"
                          name="taxNumber"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={11}
                          value={formData.taxNumber}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                            errors.taxNumber ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Vergi Numarası"
                        />
                        {errors.taxNumber && (
                          <p className="mt-1 text-sm text-red-500">{errors.taxNumber}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="taxOffice" className="block text-sm font-medium text-gray-700 mb-1">
                          Vergi Dairesi <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="taxOffice"
                          name="taxOffice"
                          value={formData.taxOffice}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                            errors.taxOffice ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Vergi Dairesi"
                        />
                        {errors.taxOffice && (
                          <p className="mt-1 text-sm text-red-500">{errors.taxOffice}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Shipping Method */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Teslimat Yöntemi</h2>
                <div className="space-y-3">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="yurtici-kargo"
                      checked={formData.shippingMethod === 'yurtici-kargo'}
                      onChange={(e) => handleRadioChange('shippingMethod', e.target.value)}
                      className="mt-1 mr-3 w-4 h-4 text-green-700 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Yurtiçi Kargo ile Teslimat</span>
                      <p className="text-sm text-gray-500 mt-1">
                        Siparişiniz 1–3 iş günü içinde Yurtiçi Kargo ile gönderilir.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. Payment Method */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Ödeme Yöntemi</h2>
                <div className="space-y-4">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="kapida-odeme"
                      checked={formData.paymentMethod === 'kapida-odeme'}
                      onChange={(e) => handleRadioChange('paymentMethod', e.target.value)}
                      className="mt-1 mr-3 w-4 h-4 text-green-700 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Kapıda Ödeme (Nakit/Kredi Kartı)</span>
                      <p className="text-sm text-gray-500 mt-1">
                        Ödemenizi teslimat sırasında kargo görevlisine kredi kartı veya nakit ile yapabilirsiniz. 
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="siteden-odeme"
                      checked={formData.paymentMethod === 'siteden-odeme'}
                      onChange={(e) => handleRadioChange('paymentMethod', e.target.value)}
                      className="mt-1 mr-3 w-4 h-4 text-green-700 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        Siteden Ödeme (Kredi Kartı)
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        Güvenli ödeme ile kredi kartınızla ödeme yapabilirsiniz.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 5. Confirmation */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Onay</h2>
                <div className="space-y-3">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleInputChange}
                      className="mt-1 mr-3 w-4 h-4 text-green-700 focus:ring-green-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      <Link
                        href="/mesafeli-satis-sozlesmesi"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-green-700 hover:underline focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
                      >
                        Mesafeli satış sözleşmesini
                      </Link>
                      {' '}okudum, kabul ediyorum. <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {errors.termsAccepted && (
                    <p className="ml-7 text-sm text-red-500">{errors.termsAccepted}</p>
                  )}

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      name="privacyAccepted"
                      checked={formData.privacyAccepted}
                      onChange={handleInputChange}
                      className="mt-1 mr-3 w-4 h-4 text-green-700 focus:ring-green-500 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      <Link
                        href="/kvkk"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-green-700 hover:underline focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
                      >
                        Kişisel verilerimin işlenmesine ilişkin aydınlatma metnini
                      </Link>
                      {' '}okudum. <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {errors.privacyAccepted && (
                    <p className="ml-7 text-sm text-red-500">{errors.privacyAccepted}</p>
                  )}
                </div>
              </div>
            </form>

            {/* iyzico Checkout Form */}
            {showIyzicoForm && (
              <div className="bg-white rounded-xl shadow-md p-6 mt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Ödeme Formu</h2>
                <div
                  id="iyzipay-checkout-form"
                  ref={iyzicoContainerRef}
                  className="responsive"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

