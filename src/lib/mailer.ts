import nodemailer from 'nodemailer';

interface SendOrderStatusEmailParams {
  to: string;
  orderId: string;
  customerName: string;
  status: string;
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    yeni: 'Yeni',
    hazirlaniyor: 'Hazırlanıyor',
    kargoya_verildi: 'Kargoya Verildi',
    tamamlandi: 'Tamamlandı',
    iptal: 'İptal',
  };

  return statusMap[status] || status;
}

export async function sendOrderStatusEmail({
  to,
  orderId,
  customerName,
  status,
}: SendOrderStatusEmailParams): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM;

  // Validate required env variables
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !mailFrom) {
    throw new Error('SMTP konfigürasyonu eksik. Lütfen env değişkenlerini kontrol edin.');
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  // Email content
  const statusLabel = getStatusLabel(status);
  const subject = 'Sipariş Durumu Güncellendi';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #15803d;">Sipariş Durumu Güncellendi</h2>
      <p>Merhaba ${customerName || 'Değerli Müşterimiz'},</p>
      <p>Siparişinizin durumu güncellenmiştir:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Sipariş ID:</strong> ${orderId}</p>
        <p style="margin: 5px 0;"><strong>Yeni Durum:</strong> ${statusLabel}</p>
      </div>
      <p>Siparişinizle ilgili tüm bilgilere web sitemizden ulaşabilirsiniz.</p>
      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Lezzette Tek<br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;

  const textBody = `
Sipariş Durumu Güncellendi

Merhaba ${customerName || 'Değerli Müşterimiz'},

Siparişinizin durumu güncellenmiştir:

Sipariş ID: ${orderId}
Yeni Durum: ${statusLabel}

Siparişinizle ilgili tüm bilgilere web sitemizden ulaşabilirsiniz.

Lezzette Tek
Bu e-posta otomatik olarak gönderilmiştir.
  `.trim();

  // Send email
  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text: textBody,
    html: htmlBody,
  });
}
