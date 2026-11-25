import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const ADMIN_STORE_FILE = path.join(DATA_DIR, 'adminStore.json');

const MAIN_SUPER_ADMIN = 'ashishpsd91@gmail.com';
const ALL_PAGES = [
  'main_ledger',
  'partner_kharcha',
  'vendor_page',
  'salary_rent',
  'platform_profit',
  'investment',
  'audit_logs',
  'user_access'
];

let localAdminStoreCache = null;

function ensureLocalAdminStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(ADMIN_STORE_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('Admin@12345', salt);

    const store = {
      users: [
        {
          id: 1,
          email: MAIN_SUPER_ADMIN,
          name: 'Ashish (Main Super Admin)',
          role: 'super_admin',
          is_verified: true,
          is_active: true,
          password_hash: defaultPasswordHash,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          email: 'acubebeauty@gmail.com',
          name: 'Acube Admin',
          role: 'super_admin',
          is_verified: true,
          is_active: true,
          password_hash: defaultPasswordHash,
          created_at: new Date().toISOString()
        }
      ],
      permissions: ALL_PAGES.flatMap(page => [
        {
          id: `${MAIN_SUPER_ADMIN}_${page}`,
          user_email: MAIN_SUPER_ADMIN,
          page_key: page,
          access_level: 'edit',
          granted_by: 'system_seed',
          updated_at: new Date().toISOString()
        },
        {
          id: `acubebeauty@gmail.com_${page}`,
          user_email: 'acubebeauty@gmail.com',
          page_key: page,
          access_level: 'edit',
          granted_by: 'system_seed',
          updated_at: new Date().toISOString()
        }
      ]),
      audit_logs: [],
      firms: [
        { id: 1, name: 'Acube', code: 'acube', assigned_email: MAIN_SUPER_ADMIN, assigned_name: 'Ashish', display_order: 1, is_active: true },
        { id: 2, name: 'Treo', code: 'treo', assigned_email: 'anurag@pandanest.in', assigned_name: 'Anurag', display_order: 2, is_active: true },
        { id: 3, name: 'Tritoy', code: 'tritoy', assigned_email: 'aman@pandanest.in', assigned_name: 'Aman', display_order: 3, is_active: true },
        { id: 4, name: 'Cash', code: 'cash', assigned_email: MAIN_SUPER_ADMIN, assigned_name: 'Ashish', display_order: 4, is_active: true }
      ],
      ledger_entries: [],
      galla_expenses: [],
      vendors: [
        { id: 1, name: 'Nikhil', phone: '', address: '', notes: 'Key material supplier', is_active: true },
        { id: 2, name: 'Subham', phone: '', address: '', notes: 'Packaging supplier', is_active: true },
        { id: 3, name: 'Mittal uncle', phone: '', address: '', notes: 'Raw stock vendor', is_active: true },
        { id: 4, name: 'V.K.', phone: '', address: '', notes: 'Logistics and parts vendor', is_active: true }
      ],
      vendor_records: [],
      employees: [
        { id: 1, name: 'Ashish', role: 'Operations Lead', phone: '7380405227', default_salary: 35000, is_active: true },
        { id: 2, name: 'Aman', role: 'Catalog & Inventory', phone: '', default_salary: 30000, is_active: true },
        { id: 3, name: 'Anurag', role: 'Platform Specialist', phone: '', default_salary: 30000, is_active: true },
        { id: 4, name: 'Anuj', role: 'Dispatch & Packing', phone: '', default_salary: 20000, is_active: true },
        { id: 5, name: 'Prince', role: 'Warehouse Assistant', phone: '', default_salary: 18000, is_active: true }
      ],
      salary_records: [],
      rent_properties: [
        { id: 1, property_name: 'Sarawagi', landlord_name: 'Sarawagi Ji', default_rent: 25000, is_active: true },
        { id: 2, property_name: 'Uncle Sec-84', landlord_name: 'Uncle Sec 84', default_rent: 20000, is_active: true },
        { id: 3, property_name: 'Bengal 163', landlord_name: 'Bengal 163 Facility', default_rent: 18000, is_active: true }
      ],
      rent_records: [],
      platforms: [
        { id: 1, name: 'f - A', platform_type: 'Flipkart', firm_code: 'acube', display_order: 1, is_active: true },
        { id: 2, name: 'f - Treo', platform_type: 'Flipkart', firm_code: 'treo', display_order: 2, is_active: true },
        { id: 3, name: 'f - Tri', platform_type: 'Flipkart', firm_code: 'tritoy', display_order: 3, is_active: true },
        { id: 4, name: 'm - A', platform_type: 'Meesho', firm_code: 'acube', display_order: 4, is_active: true },
        { id: 5, name: 'm - Tre', platform_type: 'Meesho', firm_code: 'treo', display_order: 5, is_active: true },
        { id: 6, name: 'm - Tri', platform_type: 'Meesho', firm_code: 'tritoy', display_order: 6, is_active: true },
        { id: 7, name: 'Amazon', platform_type: 'Amazon', firm_code: 'general', display_order: 7, is_active: true },
        { id: 8, name: 'Myntra', platform_type: 'Myntra', firm_code: 'general', display_order: 8, is_active: true }
      ],
      platform_pnl: [],
      monthly_pnl_summaries: [],
      investors: [
        { id: 1, partner_name: 'Vishal', phone: '', email: '', display_order: 1, is_active: true },
        { id: 2, partner_name: 'Bhai', phone: '', email: '', display_order: 2, is_active: true },
        { id: 3, partner_name: 'Divesh', phone: '', email: '', display_order: 3, is_active: true }
      ],
      investments: [],
      otp_store: {}
    };

    fs.writeFileSync(ADMIN_STORE_FILE, JSON.stringify(store, null, 2));
    localAdminStoreCache = store;
  }
}

export function readAdminStore() {
  if (localAdminStoreCache) return localAdminStoreCache;
  ensureLocalAdminStore();
  const raw = fs.readFileSync(ADMIN_STORE_FILE, 'utf-8');
  localAdminStoreCache = JSON.parse(raw);
  return localAdminStoreCache;
}

export function writeAdminStore(data) {
  localAdminStoreCache = data;
  const tempFile = `${ADMIN_STORE_FILE}.tmp.${Date.now()}`;
  fs.writeFile(tempFile, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Failed to write adminStore temp file:', err);
      return;
    }
    fs.rename(tempFile, ADMIN_STORE_FILE, (renameErr) => {
      if (renameErr) {
        fs.copyFile(tempFile, ADMIN_STORE_FILE, () => {
          fs.unlink(tempFile, () => {});
        });
      }
    });
  });
}

/**
 * Initializes all PostgreSQL tables, indexes, and default seeds
 * for the dedicated admin.pandanest.in portal.
 */
export async function initAdminPortalSchema(pool) {
  ensureLocalAdminStore();

  if (!pool) {
    console.log('📦  Initialized admin.pandanest.in local memory/JSON fallback store.');
    return;
  }

  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS admin_portal_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(150),
      role VARCHAR(50) DEFAULT 'member',
      is_verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      password_hash VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_portal_permissions (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      page_key VARCHAR(50) NOT NULL,
      access_level VARCHAR(20) NOT NULL DEFAULT 'view',
      granted_by VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_email, page_key)
    );

    CREATE TABLE IF NOT EXISTS admin_portal_audit_logs (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      user_name VARCHAR(150),
      module VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      record_id VARCHAR(100),
      description TEXT,
      old_values JSONB,
      new_values JSONB,
      ip_address VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_email ON admin_portal_audit_logs(user_email);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON admin_portal_audit_logs(module);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_portal_audit_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS admin_portal_firms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      assigned_email VARCHAR(255),
      assigned_name VARCHAR(100),
      display_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_portal_ledger_entries (
      id SERIAL PRIMARY KEY,
      firm_code VARCHAR(50) NOT NULL,
      flow_type VARCHAR(10) NOT NULL,
      entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
      category VARCHAR(100),
      party_name VARCHAR(150),
      reason TEXT,
      amount NUMERIC(12, 2) NOT NULL,
      created_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_firm_date ON admin_portal_ledger_entries(firm_code, entry_date);

    CREATE TABLE IF NOT EXISTS admin_portal_galla_expenses (
      id SERIAL PRIMARY KEY,
      partner_name VARCHAR(100) NOT NULL,
      entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
      reason TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      logged_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_galla_date ON admin_portal_galla_expenses(entry_date);

    CREATE TABLE IF NOT EXISTS admin_portal_vendors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_portal_vendor_records (
      id SERIAL PRIMARY KEY,
      vendor_id INT NOT NULL REFERENCES admin_portal_vendors(id) ON DELETE CASCADE,
      record_type VARCHAR(20) NOT NULL,
      record_date DATE NOT NULL DEFAULT CURRENT_DATE,
      bill_no VARCHAR(100),
      amount NUMERIC(12, 2) NOT NULL,
      notes TEXT,
      logged_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_vendor_records ON admin_portal_vendor_records(vendor_id, record_date);

    CREATE TABLE IF NOT EXISTS admin_portal_employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      role VARCHAR(100),
      phone VARCHAR(50),
      default_salary NUMERIC(12, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_portal_salary_records (
      id SERIAL PRIMARY KEY,
      employee_id INT NOT NULL REFERENCES admin_portal_employees(id) ON DELETE CASCADE,
      month_year VARCHAR(20) NOT NULL,
      salary_amount NUMERIC(12, 2) NOT NULL,
      advance_deduction NUMERIC(12, 2) DEFAULT 0,
      net_paid NUMERIC(12, 2) NOT NULL,
      payment_status VARCHAR(50) DEFAULT 'Paid',
      payment_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      logged_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_salary_month ON admin_portal_salary_records(month_year);

    CREATE TABLE IF NOT EXISTS admin_portal_rent_properties (
      id SERIAL PRIMARY KEY,
      property_name VARCHAR(150) NOT NULL,
      landlord_name VARCHAR(150),
      default_rent NUMERIC(12, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_portal_rent_records (
      id SERIAL PRIMARY KEY,
      property_id INT NOT NULL REFERENCES admin_portal_rent_properties(id) ON DELETE CASCADE,
      month_year VARCHAR(20) NOT NULL,
      rent_amount NUMERIC(12, 2) NOT NULL,
      electricity_charges NUMERIC(12, 2) DEFAULT 0,
      total_paid NUMERIC(12, 2) NOT NULL,
      payment_status VARCHAR(50) DEFAULT 'Paid',
      payment_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      logged_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_rent_month ON admin_portal_rent_records(month_year);

    CREATE TABLE IF NOT EXISTS admin_portal_platforms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      platform_type VARCHAR(50),
      firm_code VARCHAR(50),
      display_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_portal_platform_pnl (
      id SERIAL PRIMARY KEY,
      platform_id INT NOT NULL REFERENCES admin_portal_platforms(id) ON DELETE CASCADE,
      month_year VARCHAR(20) NOT NULL,
      gross_sales NUMERIC(12, 2) DEFAULT 0,
      returns_amount NUMERIC(12, 2) DEFAULT 0,
      cogs_amount NUMERIC(12, 2) DEFAULT 0,
      platform_fees NUMERIC(12, 2) DEFAULT 0,
      net_profit NUMERIC(12, 2) NOT NULL,
      notes TEXT,
      logged_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_pnl_month ON admin_portal_platform_pnl(month_year);

    CREATE TABLE IF NOT EXISTS admin_portal_monthly_pnl_summary (
      id SERIAL PRIMARY KEY,
      month_year VARCHAR(20) UNIQUE NOT NULL,
      total_gross_profit NUMERIC(12, 2) DEFAULT 0,
      salary_kharcha NUMERIC(12, 2) DEFAULT 0,
      rent_kharcha NUMERIC(12, 2) DEFAULT 0,
      other_kharcha NUMERIC(12, 2) DEFAULT 0,
      net_profit NUMERIC(12, 2) DEFAULT 0,
      notes TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_portal_investors (
      id SERIAL PRIMARY KEY,
      partner_name VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      display_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_portal_investments (
      id SERIAL PRIMARY KEY,
      investor_id INT NOT NULL REFERENCES admin_portal_investors(id) ON DELETE CASCADE,
      month_year VARCHAR(20) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      investment_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      logged_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_invest_month ON admin_portal_investments(investor_id, month_year);
  `;

  try {
    await pool.query(schemaSQL);
    console.log('🏛️  admin.pandanest.in PostgreSQL tables and indexes ready.');

    // Seed Main Admin in PostgreSQL
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('Admin@12345', salt);

    await pool.query(
      `INSERT INTO admin_portal_users (email, name, role, is_verified, is_active, password_hash)
       VALUES ($1, $2, 'super_admin', true, true, $3)
       ON CONFLICT (email) DO UPDATE SET role = 'super_admin', is_verified = true, is_active = true`,
      [MAIN_SUPER_ADMIN, 'Ashish (Main Super Admin)', defaultPasswordHash]
    );

    for (const page of ALL_PAGES) {
      await pool.query(
        `INSERT INTO admin_portal_permissions (user_email, page_key, access_level, granted_by)
         VALUES ($1, $2, 'edit', 'system_seed')
         ON CONFLICT (user_email, page_key) DO UPDATE SET access_level = 'edit'`,
        [MAIN_SUPER_ADMIN, page]
      );
    }
  } catch (err) {
    console.warn('⚠️  Could not run PostgreSQL migration for admin portal:', err.message);
  }
}
