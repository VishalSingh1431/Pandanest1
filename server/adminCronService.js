import cron from 'node-cron';
import { getDB } from './db.js';
import { readAdminStore } from './dbAdminPortal.js';
import { sendFirmDailyReport, sendConsolidatedDailyReport } from './adminEmailService.js';
import { sendDailyConsolidatedSMS } from './adminSmsService.js';
import { recordAuditLog } from './middleware/adminPortalAuth.js';

let cronJob = null;

/**
 * Initializes automated daily 11:59 PM (23:59) EOD report dispatcher.
 */
export function initAdminCronScheduler() {
  if (cronJob) return;

  // Runs every night at 23:59 (11:59 PM) IST / server time
  cronJob = cron.schedule('59 23 * * *', async () => {
    const today = new Date().toISOString().split('T')[0];
    console.log(`⏰ [CRON EOD] Executing automated 11:59 PM financial report dispatch for ${today}...`);
    await executeEODDispatch(today);
  });

  console.log('⏰ Automated 11:59 PM EOD Financial Cron Scheduler initialized.');
}

export async function executeEODDispatch(dateStr) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const { isPostgres, pool } = getDB();

  let firms = [];
  let entries = [];

  try {
    if (isPostgres && pool) {
      const fRes = await pool.query('SELECT * FROM admin_portal_firms WHERE is_active = true');
      firms = fRes.rows;
      const eRes = await pool.query('SELECT * FROM admin_portal_ledger_entries WHERE entry_date = $1', [targetDate]);
      entries = eRes.rows;
    } else {
      const store = readAdminStore();
      firms = (store.firms || []).filter((f) => f.is_active);
      entries = (store.ledger_entries || []).filter((e) => e.entry_date === targetDate);
    }

    const firmSummaries = [];
    let overallIn = 0;
    let overallOut = 0;

    for (const firm of firms) {
      const firmEntries = entries.filter((e) => e.firm_code === firm.code);
      const inTotal = firmEntries.filter((e) => e.flow_type === 'in').reduce((s, e) => s + Number(e.amount), 0);
      const outTotal = firmEntries.filter((e) => e.flow_type === 'out').reduce((s, e) => s + Number(e.amount), 0);
      const netBalance = inTotal - outTotal;

      overallIn += inTotal;
      overallOut += outTotal;

      firmSummaries.push({
        name: firm.name,
        code: firm.code,
        assigned_email: firm.assigned_email,
        inTotal,
        outTotal,
        netBalance,
      });

      // Send per-firm report to assigned partner
      if (firm.assigned_email) {
        await sendFirmDailyReport({
          firmName: firm.name,
          recipientEmail: firm.assigned_email,
          date: targetDate,
          inTotal,
          outTotal,
          balance: netBalance,
          entries: firmEntries,
        });
      }
    }

    const overallNet = overallIn - overallOut;

    // Send consolidated Email
    await sendConsolidatedDailyReport({
      date: targetDate,
      firmSummaries,
      overallIn,
      overallOut,
      overallNet,
    });

    // Send consolidated SMS
    await sendDailyConsolidatedSMS({
      date: targetDate,
      overallIn,
      overallOut,
      overallNet,
    });

    await recordAuditLog({
      userEmail: 'system_cron@pandanest.in',
      userName: 'Automated 11:59 PM Cron',
      module: 'MAIN_LEDGER',
      action: 'CRON_AUTO_EOD',
      description: `Dispatched automated 11:59 PM EOD Email & SMS reports for ${targetDate}. Grand Net: ₹${overallNet}`,
    });

    return { success: true, targetDate, overallIn, overallOut, overallNet, firmSummaries };
  } catch (err) {
    console.error('❌ Error executing EOD cron dispatch:', err);
    return { success: false, error: err.message };
  }
}
