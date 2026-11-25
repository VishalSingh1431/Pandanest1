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
  console.log('📧 Admin Portal Email Service initialized with Gmail SMTP.');
} else {
  console.log('ℹ️  EMAIL_USER/EMAIL_APP_PASS not set. Admin Portal emails will be simulated.');
}

/**
 * Sends a 6-digit OTP verification code to a whitelisted admin email.
 */
export async function sendPortalOTP(email, otp) {
  if (!transporter) {
    console.log(`[SIMULATED EMAIL] To: ${email} | Subject: Panda Nest Admin Verification Code: ${otp}`);
    return { success: true, simulated: true };
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; margin: 0; padding: 24px; color: #334155; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 28px 24px; text-align: center; }
        .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        .portal-tag { display: inline-block; background: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; margin-top: 6px; letter-spacing: 0.5px; }
        .content { padding: 32px 28px; text-align: center; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 10px; }
        .desc { font-size: 14px; line-height: 1.6; color: #64748b; margin: 0 0 24px; }
        .otp-box { background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 24px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; }
        .warning { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; }
        .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">🐼 Panda Nest</div>
          <div class="portal-tag">admin.pandanest.in • Secure Access</div>
        </div>
        <div class="content">
          <h2 class="title">Your Verification Code</h2>
          <p class="desc">You have requested access to the Panda Nest Internal Accounting & ERP Management Portal.</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p class="warning">This verification code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <div class="footer">
          Authorized personnel only • Protected under enterprise RBAC policy
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Panda Nest Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `[${otp}] Panda Nest Admin Login Verification Code`,
      html,
    });
    console.log(`✉️ OTP email successfully sent to ${email} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send OTP email:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends Daily Ledger Summary to firm-assigned partners (Ashish, Anurag, Aman).
 */
export async function sendFirmDailyReport({ firmName, recipientEmail, date, inTotal, outTotal, balance, entries }) {
  if (!transporter) {
    console.log(`[SIMULATED REPORT] Firm: ${firmName} | To: ${recipientEmail} | Date: ${date} | Net Balance: ₹${balance}`);
    return { success: true, simulated: true };
  }

  const rows = (entries || [])
    .map(
      (e) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 8px; font-size: 13px; font-weight: 600; color: ${e.flow_type === 'in' ? '#047857' : '#b91c1c'}; text-transform: uppercase;">
        ${e.flow_type}
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: #334155;">
        ${e.category || '-'} ${e.party_name ? `(${e.party_name})` : ''}
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: #64748b;">
        ${e.reason || '-'}
      </td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: right; font-weight: 700; color: #0f172a;">
        ₹${Number(e.amount).toLocaleString('en-IN')}
      </td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
        .box { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .head { background: #0f172a; color: white; padding: 20px; }
        .summary-grid { display: flex; background: #f1f5f9; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
        .stat { flex: 1; text-align: center; }
        .stat-num { font-size: 18px; font-weight: bold; margin-top: 4px; }
        .content { padding: 20px; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="head">
          <h2 style="margin: 0;">📊 ${firmName} Daily Report</h2>
          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Date: ${date}</p>
        </div>
        <div style="padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <table style="width: 100%; text-align: center;">
            <tr>
              <td><span style="font-size: 12px; color: #64748b;">Total In</span><div style="font-size: 18px; font-weight: bold; color: #047857;">₹${Number(inTotal).toLocaleString('en-IN')}</div></td>
              <td><span style="font-size: 12px; color: #64748b;">Total Out</span><div style="font-size: 18px; font-weight: bold; color: #b91c1c;">₹${Number(outTotal).toLocaleString('en-IN')}</div></td>
              <td><span style="font-size: 12px; color: #64748b;">Net Balance</span><div style="font-size: 18px; font-weight: bold; color: #0284c7;">₹${Number(balance).toLocaleString('en-IN')}</div></td>
            </tr>
          </table>
        </div>
        <div class="content">
          <h3 style="font-size: 15px; margin: 0 0 12px; color: #0f172a;">Today's Transactions:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; font-size: 12px; color: #64748b;">
                <th style="padding: 8px;">Flow</th>
                <th style="padding: 8px;">Category/Party</th>
                <th style="padding: 8px;">Reason</th>
                <th style="padding: 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #94a3b8;">No transactions logged today.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Panda Nest Accounts" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `[Daily Report] ${firmName} - Date ${date}`,
      html,
    });
    console.log(`✉️ Firm Daily Report for ${firmName} sent to ${recipientEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send Daily Report for ${firmName}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends Overall Consolidated EOD Report across all firms to Super Admins.
 */
export async function sendConsolidatedDailyReport({ date, firmSummaries, overallIn, overallOut, overallNet }) {
  const recipients = ['ashishpsd91@gmail.com', process.env.ADMIN_EMAIL || 'acubebeauty@gmail.com'];

  const rows = (firmSummaries || [])
    .map(
      (f) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 8px; font-weight: bold; color: #0f172a;">${f.name}</td>
      <td style="padding: 10px 8px; text-align: right; color: #047857; font-weight: 600;">₹${Number(f.inTotal || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 10px 8px; text-align: right; color: #b91c1c; font-weight: 600;">₹${Number(f.outTotal || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0284c7;">₹${Number(f.netBalance || 0).toLocaleString('en-IN')}</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
      <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #0f172a; color: white; padding: 22px;">
          <h2 style="margin: 0;">🌐 Overall Consolidated Daily Financial Report</h2>
          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Date: ${date} • admin.pandanest.in</p>
        </div>
        <div style="padding: 18px 20px; background: #f1f5f9;">
          <table style="width: 100%; text-align: center;">
            <tr>
              <td><span style="font-size: 12px; color: #64748b;">Grand Total In</span><div style="font-size: 20px; font-weight: bold; color: #047857;">₹${Number(overallIn).toLocaleString('en-IN')}</div></td>
              <td><span style="font-size: 12px; color: #64748b;">Grand Total Out</span><div style="font-size: 20px; font-weight: bold; color: #b91c1c;">₹${Number(overallOut).toLocaleString('en-IN')}</div></td>
              <td><span style="font-size: 12px; color: #64748b;">Consolidated Net</span><div style="font-size: 20px; font-weight: bold; color: #0284c7;">₹${Number(overallNet).toLocaleString('en-IN')}</div></td>
            </tr>
          </table>
        </div>
        <div style="padding: 20px;">
          <h3 style="font-size: 15px; margin: 0 0 12px; color: #0f172a;">Breakdown by Entity / Account:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; color: #64748b;">
                <th style="padding: 8px;">Firm / Account</th>
                <th style="padding: 8px; text-align: right;">Total In</th>
                <th style="padding: 8px; text-align: right;">Total Out</th>
                <th style="padding: 8px; text-align: right;">Net Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`[SIMULATED CONSOLIDATED REPORT] Date: ${date} | Overall Net: ₹${overallNet}`);
    return { success: true, simulated: true };
  }

  try {
    await transporter.sendMail({
      from: `"Panda Nest Executive Accounts" <${process.env.EMAIL_USER}>`,
      to: recipients.join(', '),
      subject: `[CONSOLIDATED EOD REPORT] Date ${date} - Grand Total ₹${Number(overallNet).toLocaleString('en-IN')}`,
      html,
    });
    console.log('✉️ Consolidated EOD report sent to Super Admins');
    return { success: true };
  } catch (err) {
    console.error('❌ Failed to send Consolidated report:', err);
    return { success: false, error: err.message };
  }
}
