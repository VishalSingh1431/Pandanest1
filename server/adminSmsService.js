import dotenv from 'dotenv';
dotenv.config();

/**
 * Unified SMS Service for Panda Nest Executive Reports
 * Supports Fast2SMS (India), Twilio, and Simulated fallback.
 */
export async function sendDailyConsolidatedSMS({ date, overallIn, overallOut, overallNet }) {
  const recipients = [
    process.env.ADMIN_PHONE || '7380405227',
    process.env.MAIN_ADMIN_PHONE || '7380405227'
  ];

  const uniquePhones = Array.from(new Set(recipients.filter(Boolean)));
  const message = `[PANDA NEST EOD ${date}] Daily Accounts Summary: In: Rs.${Number(overallIn).toLocaleString('en-IN')} | Out: Rs.${Number(overallOut).toLocaleString('en-IN')} | Net: Rs.${Number(overallNet).toLocaleString('en-IN')}. Portal: admin.pandanest.in`;

  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;

  // 1. Fast2SMS (Indian Gateway)
  if (fast2smsKey) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2smsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'v3',
          sender_id: 'TXTIND',
          message: message,
          language: 'english',
          flash: 0,
          numbers: uniquePhones.join(','),
        }),
      });
      const resData = await response.json();
      console.log('📱 Fast2SMS EOD SMS dispatched successfully:', resData);
      return { success: true, provider: 'fast2sms', data: resData };
    } catch (err) {
      console.error('❌ Fast2SMS dispatch failed:', err.message);
    }
  }

  // 2. Twilio Gateway
  if (twilioSid && twilioAuth && process.env.TWILIO_PHONE_NUMBER) {
    try {
      for (const phone of uniquePhones) {
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', formattedPhone);
        params.append('From', process.env.TWILIO_PHONE_NUMBER);
        params.append('Body', message);

        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
      }
      console.log('📱 Twilio EOD SMS dispatched successfully.');
      return { success: true, provider: 'twilio' };
    } catch (err) {
      console.error('❌ Twilio dispatch failed:', err.message);
    }
  }

  // 3. Fallback: Log simulation
  console.log(`📱 [SIMULATED SMS] Recipients: ${uniquePhones.join(', ')}`);
  console.log(`📱 Message: "${message}"`);
  return { success: true, simulated: true, message };
}
