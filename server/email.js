import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASS,
    },
  });
  console.log('📧 Order Email Service initialized with Gmail SMTP.');
} else {
  console.log('ℹ️  EMAIL_USER/EMAIL_APP_PASS not set. Order emails will not be dispatched.');
}

/**
 * Dispatches customer confirmation email & admin sales alert
 */
export async function sendOrderEmails({
  order,
  items,
  customerName,
  customerEmail,
  phone,
  address,
  city,
  pincode,
  totalAmount,
  paymentMethod
}) {
  if (!transporter) {
    console.log('ℹ️  Transporter not active. Skipping email dispatch.');
    return;
  }

  const orderNum = order?.order_number || `PN-${order?.id || Math.floor(10000 + Math.random() * 90000)}`;
  const storePhone = process.env.STORE_PHONE || '7380405227';
  const storeEmail = process.env.STORE_EMAIL || process.env.EMAIL_USER || 'acubebeauty@gmail.com';
  const parsedItems = Array.isArray(items) ? items : [];

  // Generate table rows for items
  const itemsHtml = parsedItems
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 8px; vertical-align: middle;">
        ${
          item.image_url
            ? `<img src="${item.image_url}" alt="${item.name}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block; vertical-align: middle; margin-right: 10px;" />`
            : ''
        }
        <span style="font-weight: 600; color: #0f172a;">${item.name}</span>
      </td>
      <td style="padding: 12px 8px; text-align: center; color: #475569;">${item.quantity || 1}</td>
      <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #047857;">₹${(
        Number(item.price) * (item.quantity || 1)
      ).toLocaleString('en-IN')}</td>
    </tr>
  `
    )
    .join('');

  // 1. Customer Confirmation Email
  if (customerEmail && customerEmail.includes('@')) {
    const customerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { background: #0f172a; color: #ffffff; padding: 26px 20px; text-align: center; }
          .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px; }
          .body { padding: 28px 24px; }
          .order-box { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin: 20px 0; }
          .footer { background: #f1f5f9; padding: 18px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">Order Confirmed 🎉</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Panda Nest 🐼</h1>
            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">Bringing Joyful Toys to Every Home</p>
          </div>
          <div class="body">
            <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hi ${customerName},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #475569;">
              Thank you for choosing Panda Nest! We have received your order <strong>#${orderNum}</strong> and our team is already preparing it for packing and dispatch within 24 hours.
            </p>

            <div class="order-box">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-size: 13px;">Order Number:</span>
                <strong style="color: #0f172a;">${orderNum}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b; font-size: 13px;">Payment Method:</span>
                <strong style="color: #0f172a;">${paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Prepaid / Online'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 13px;">Estimated Dispatch:</span>
                <strong style="color: #047857;">Within 24 Hours 🚚</strong>
              </div>
            </div>

            <h3 style="font-size: 15px; color: #0f172a; margin-bottom: 10px;">Ordered Items</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-align: left;">
                  <th style="padding: 8px;">Product</th>
                  <th style="padding: 8px; text-align: center;">Qty</th>
                  <th style="padding: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 12px 8px; text-align: right; font-weight: 700; color: #0f172a;">Total Payable:</td>
                  <td style="padding: 12px 8px; text-align: right; font-weight: 800; font-size: 16px; color: #047857;">₹${Number(
                    totalAmount
                  ).toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>

            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px; margin-top: 20px;">
              <h4 style="margin: 0 0 4px; color: #065f46; font-size: 14px;">📍 Delivery Address:</h4>
              <p style="margin: 0; font-size: 13px; color: #047857; line-height: 1.5;">
                <strong>${customerName}</strong> (${phone})<br/>
                ${address}, ${city} - ${pincode}
              </p>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px; line-height: 1.5;">
              Need help or urgent delivery assistance? Message us on WhatsApp anytime: 
              <a href="https://wa.me/91${storePhone}" style="color: #10b981; font-weight: bold; text-decoration: none;">+91 ${storePhone}</a>.
            </p>
          </div>
          <div class="footer">
            Panda Nest India &bull; SCO 94 Swastic Vihar Mansa Devi Complex, Panchkula, Haryana 134114<br/>
            &copy; ${new Date().getFullYear()} Pandanest.in. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    transporter
      .sendMail({
        from: `"Panda Nest 🐼" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: `🎉 Order Confirmed! Pandanest Order #${orderNum}`,
        html: customerHtml,
      })
      .then(() => {
        console.log(`✅ Order confirmation email sent to customer: ${customerEmail}`);
      })
      .catch((err) => {
        console.error('Customer email dispatch notice:', err.message);
      });
  }

  // 2. Admin New Order Alert Email
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_USER || storeEmail;
  const adminHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 20px;">
      <div style="max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #cbd5e1;">
        <div style="background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 12px; margin-bottom: 12px;">
          NEW SALE RECEIVED 🚨
        </div>
        <h2 style="margin: 0 0 10px; color: #0f172a;">New Order #${orderNum}</h2>
        <div style="font-size: 22px; font-weight: bold; color: #047857; margin-bottom: 16px;">
          ₹${Number(totalAmount).toLocaleString('en-IN')} (${paymentMethod})
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
          <tr><td style="color: #64748b; padding: 6px 0; width: 120px;">Customer:</td><td><strong>${customerName}</strong></td></tr>
          <tr><td style="color: #64748b; padding: 6px 0;">Phone:</td><td><a href="tel:${phone}" style="color: #0284c7; font-weight: bold;">${phone}</a></td></tr>
          <tr><td style="color: #64748b; padding: 6px 0;">Email:</td><td>${customerEmail || 'Guest (No email provided)'}</td></tr>
          <tr><td style="color: #64748b; padding: 6px 0;">Address:</td><td>${address}, ${city} - ${pincode}</td></tr>
          <tr><td style="color: #64748b; padding: 6px 0;">Payment:</td><td><strong>${paymentMethod}</strong></td></tr>
        </table>

        <h3 style="font-size: 14px; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 12px;">Items to Pack:</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${itemsHtml}
        </table>

        <div style="margin-top: 24px; text-align: center;">
          <a href="https://pandanest.in/?page=admin" style="background: #0f172a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Open Admin Dashboard
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  transporter
    .sendMail({
      from: `"Pandanest Bot 🤖" <${process.env.EMAIL_USER}>`,
      to: adminAlertEmail,
      subject: `🚨 [NEW SALE ₹${totalAmount}] Order #${orderNum} by ${customerName}`,
      html: adminHtml,
    })
    .then(() => {
      console.log(`✅ Admin sales alert sent to: ${adminAlertEmail}`);
    })
    .catch((err) => {
      console.error('Admin sales alert email notice:', err.message);
    });
}

