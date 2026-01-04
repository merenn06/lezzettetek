"use client";

import { useState } from "react";

export default function Iletisim() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowSuccess(false);
    setErrorMessage(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const fullName = (formData.get("name") || "").toString();
    const email = (formData.get("email") || "").toString();
    const subject = (formData.get("subject") || "").toString();
    const message = (formData.get("message") || "").toString();

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          subject,
          message,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };

      if (!res.ok || !json.success) {
        setErrorMessage(json.error || "Mesajınız gönderilirken bir hata oluştu.");
        setShowSuccess(false);
        return;
      }

      // Success
      setShowSuccess(true);
      setErrorMessage(null);
      form.reset();

      // Hide success after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    } catch (err) {
      console.error("Contact form error:", err);
      setErrorMessage("Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      setShowSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white">
      {/* Hero Section */}
      <section className="py-24 xl:py-32 px-4 bg-gradient-to-br from-green-50 to-amber-50">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            İletişim
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Her türlü soru, öneri veya iş birliği talepleriniz için bizimle iletişime geçebilirsiniz.
          </p>
        </div>
      </section>

      {/* Main Content - Two Column */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Bize Ulaşın - Contact Form */}
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Bize Ulaşın</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="Adınız ve soyadınız"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    E-posta
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="ornek@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                    Konu
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    placeholder="Mesaj konusu"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                    Mesaj
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
                    placeholder="Mesajınızı buraya yazın..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Gönderiliyor..." : "Gönder"}
                </button>

                {errorMessage && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 font-medium">{errorMessage}</p>
                  </div>
                )}

                {showSuccess && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-700 font-medium">
                      Mesajınızı aldık, en kısa sürede dönüş yapacağız.
                    </p>
                  </div>
                )}
              </form>
            </div>

            {/* Right: İletişim Bilgileri + Map */}
            <div className="min-w-0">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">İletişim Bilgileri</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Minimal, doğal ve lezzet odaklı mutfağımız hakkında bilgi almak veya siparişleriniz için
                bize her zaman ulaşabilirsiniz.
              </p>

              <div className="bg-gray-50 rounded-2xl p-8 shadow-md space-y-8">
                {/* Address */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Adres</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Kayışdağı Mahallesi Hilal Sokak No:21
                      <br />
                      Ataşehir / İstanbul
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Telefon</h3>
                    <p className="text-gray-600">
                      <a href="tel:+905317039591" className="hover:text-green-700 transition-colors">
                        +90 (531) 703 95 91
                      </a>
                    </p>
                    <p className="text-gray-600">
                      <a href="tel:+902166021051" className="hover:text-green-700 transition-colors">
                        +90 (216) 602 10 51
                      </a>
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">E-posta</h3>
                    <p className="text-gray-600">
                      <a href="mailto:info@enginarbahcesi.com" className="hover:text-green-700 transition-colors">
                        info@enginarbahcesi.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <h2 className="text-3xl font-bold mb-6 text-gray-900 lg:text-right">Konum</h2>
                <div className="w-full h-[360px] lg:h-[420px] rounded-2xl overflow-hidden shadow-lg">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3012.062835335742!2d29.143567799999996!3d40.9801049!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cac5fc6ae5a265%3A0x6de6c6266e2814f9!2sF%20%26%20S%20Tarim%20%C3%9Cr%C3%BCnleri%20Tek%20Lezzet!5e0!3m2!1str!2str!4v1765869938731!5m2!1str!2str"
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}