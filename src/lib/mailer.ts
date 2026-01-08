import nodemailer from 'nodemailer';

function getAdminNotifyEmails(): string[] {
  // Comma-separated allowed
  const orderNotify = process.env.ORDER_NOTIFY_EMAIL || '';
  const adminEmail = process.env.ADMIN_EMAIL || '';
  // Fallback: reuse contact notify email if defined
  const contactNotify = process.env.CONTACT_NOTIFY_EMAIL || '';
  const all = [orderNotify, adminEmail, contactNotify]
    .filter(Boolean)
    .flatMap((val) => val.split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // Remove duplicates
  return Array.from(new Set(all));
}

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
    // Also copy admins if configured
    bcc: (() => {
      const admins = getAdminNotifyEmails();
      return admins.length ? admins.join(',') : undefined;
    })(),
    subject,
    text: textBody,
    html: htmlBody,
  });
}

interface SendOrderConfirmationEmailParams {
  to: string;
  orderId: string;
  customerName: string;
  totalPrice: number;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export async function sendOrderConfirmationEmail({
  to,
  orderId,
  customerName,
  totalPrice,
  items,
}: SendOrderConfirmationEmailParams): Promise<void> {
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

  // Format items list
  const itemsList = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unit_price.toFixed(2)} ₺</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.quantity * item.unit_price).toFixed(2)} ₺</td>
        </tr>`
    )
    .join('');

  // Email content
  const subject = 'Siparişiniz Alındı';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #15803d;">Siparişiniz Alındı</h2>
      <p>Merhaba ${customerName || 'Değerli Müşterimiz'},</p>
      <p>Siparişiniz başarıyla alınmıştır. En kısa sürede hazırlanıp size ulaştırılacaktır.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Sipariş ID:</strong> ${orderId}</p>
      </div>
      <h3 style="color: #15803d; margin-top: 30px;">Sipariş Detayları</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Ürün</th>
            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Adet</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Birim Fiyat</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Toplam</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold; border-top: 2px solid #e5e7eb;">Toplam:</td>
            <td style="padding: 8px; text-align: right; font-weight: bold; border-top: 2px solid #e5e7eb;">${totalPrice.toFixed(2)} ₺</td>
          </tr>
        </tfoot>
      </table>
      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Lezzette Tek<br>
        Bu e-posta otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;

  const textBody = `
Siparişiniz Alındı

Merhaba ${customerName || 'Değerli Müşterimiz'},

Siparişiniz başarıyla alınmıştır. En kısa sürede hazırlanıp size ulaştırılacaktır.

Sipariş ID: ${orderId}

Sipariş Detayları:
${items.map((item) => `- ${item.product_name} x${item.quantity} = ${(item.quantity * item.unit_price).toFixed(2)} ₺`).join('\n')}

Toplam: ${totalPrice.toFixed(2)} ₺

Lezzette Tek
Bu e-posta otomatik olarak gönderilmiştir.
  `.trim();

  // Send email
  await transporter.sendMail({
    from: mailFrom,
    to,
    // Also copy admins if configured
    bcc: (() => {
      const admins = getAdminNotifyEmails();
      return admins.length ? admins.join(',') : undefined;
    })(),
    subject,
    text: textBody,
    html: htmlBody,
  });
}
