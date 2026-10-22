import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'store.json');

const { Pool } = pg;

let pool = null;
let isPostgresConnected = false;

// Initial starter toys matching discussion age groups (0-3 yrs, 3-5 yrs, 5-8 yrs, 8-12 yrs, 12+ yrs)
const INITIAL_TOYS = [
  {
    name: 'Jumbo Cuddly Bamboo Panda Plush',
    category: 'Plush & Soft Toys',
    price: 899,
    original_price: 1299,
    age_group: '0-3 yrs',
    description: 'Ultra-soft, huggable giant panda plush toy made with child-safe hypoallergenic cotton. Perfect bedtime companion for toddlers.',
    image_url: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&auto=format&fit=crop&q=80',
    stock: 25,
    featured: true
  },
  {
    name: 'Super Speed 4WD Off-Road Monster Truck',
    category: 'RC & Vehicles',
    price: 1499,
    original_price: 2199,
    age_group: '5-8 yrs',
    description: 'High-speed 2.4GHz remote control off-road rock crawler with heavy-duty shock absorbers, oversized all-terrain tires, and rechargeable battery pack.',
    image_url: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=800&auto=format&fit=crop&q=80',
    stock: 18,
    featured: true
  },
  {
    name: 'Deluxe Fairy Princess Castle Dollhouse',
    category: 'Dolls & Playsets',
    price: 1999,
    original_price: 2899,
    age_group: '3-5 yrs',
    description: 'Multi-level magical fairy castle complete with miniature furniture, glowing lights, royal balcony, and 3 princess figurines.',
    image_url: 'https://images.unsplash.com/photo-1582845512747-e42001c95638?w=800&auto=format&fit=crop&q=80',
    stock: 12,
    featured: true
  },
  {
    name: 'Galaxy Cosmic Space Rocket Builder',
    category: 'Building Blocks & Sets',
    price: 1299,
    original_price: 1799,
    age_group: '8-12 yrs',
    description: '520-piece space exploration shuttle with launch gantry, rover explorer vehicle, astronaut figurines, and real LED engine glow.',
    image_url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&auto=format&fit=crop&q=80',
    stock: 30,
    featured: true
  },
  {
    name: 'Gatling Bubble Storm Cannon Gun',
    category: 'Outdoor & Action',
    price: 649,
    original_price: 999,
    age_group: '3-5 yrs',
    description: 'Produces over 5,000 colorful bubbles per minute with vibrant LED night lights and ergonomic trigger handle. Comes with bubble solution bottles.',
    image_url: 'https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=800&auto=format&fit=crop&q=80',
    stock: 40,
    featured: false
  },
  {
    name: 'Epic Dragon Clash Strategy Board Game',
    category: 'Board Games & Fun',
    price: 799,
    original_price: 1199,
    age_group: '8-12 yrs',
    description: 'Exciting fast-paced family board game featuring fantasy treasure cards, mythical dice rolls, and custom dragon pawns for 2-4 players.',
    image_url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop&q=80',
    stock: 22,
    featured: false
  },
  {
    name: 'Nitro Turbo 360 Stunt Drift Racer',
    category: 'RC & Vehicles',
    price: 1199,
    original_price: 1699,
    age_group: '5-8 yrs',
    description: 'Double-sided stunt car capable of 360-degree tumbling spins, wall bouncing, headlights, and high-traction mecanum wheels.',
    image_url: 'https://images.unsplash.com/photo-1516905041604-7935af78f572?w=800&auto=format&fit=crop&q=80',
    stock: 15,
    featured: false
  },
  {
    name: 'Rainbow Glow Musical Drum & Xylophone Set',
    category: 'Musical & Sensory Toys',
    price: 849,
    original_price: 1249,
    age_group: '0-3 yrs',
    description: 'Interactive toddler music center with color-coded xylophone bars, soft-padded drum pads, light-up beats, and animal sound effects.',
    image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
    stock: 20,
    featured: false
  }
];

export const INITIAL_CATEGORIES = [
  'RC & Vehicles',
  'Plush & Soft Toys',
  'Dolls & Playsets',
  'Building Blocks & Sets',
  'Outdoor & Action',
  'Board Games & Fun',
  'Musical & Sensory Toys'
];

export const INITIAL_VIDEOS = [
  {
    id: 1,
    youtube_id: '3vTfq_724jM',
    title: 'Baby Panda Cute Cartoon Adventures 🐼',
    channel: 'Panda Nest Kids Club',
    duration_sec: 40,
    points_reward: 10,
    description: 'Join the playful little panda cub as he explores the bamboo forest and builds colorful wooden toy nests with friends.'
  },
  {
    id: 2,
    youtube_id: 'u7r6q69P0rQ',
    title: 'High Speed RC Stunt Cars & Monster Truck Showcase 🏎️',
    channel: 'Toy Arena',
    duration_sec: 40,
    points_reward: 10,
    description: 'Watch incredible 360-degree tumbling spins, off-road ramp jumps, and glow-in-the-dark stunt drifting in action!'
  },
  {
    id: 3,
    youtube_id: 'Y9j4LhD1w30',
    title: 'Magical Dollhouse Castle & Princess Fairytale Play 🏰',
    channel: 'Creative Playroom',
    duration_sec: 40,
    points_reward: 10,
    description: 'Step into the enchanted miniature fairytale castle with light-up balconies, miniature royal tea sets, and magical storytelling.'
  }
];

// Helper to ensure data folder and fallback local store file exists
function ensureLocalStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORE_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const initialAdmin = {
      id: 1,
      email: process.env.ADMIN_EMAIL || 'admin@pandanest.in',
      password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', salt),
      name: process.env.ADMIN_NAME || 'Pandanest Store Manager',
      role: 'super_admin',
      phone: '',
      created_at: new Date().toISOString()
    };
    const store = {
      admins: [initialAdmin],
      users: [],          // Customer accounts (OTP / Google login)
      leads: [],
      toys: INITIAL_TOYS.map((t, idx) => ({
        id: idx + 1,
        ...t,
        created_at: new Date().toISOString()
      })),
      categories: INITIAL_CATEGORIES.map((c, idx) => ({
        id: idx + 1,
        name: c,
        description: `${c} toys and activities for kids`,
        created_at: new Date().toISOString()
      })),
      videos: INITIAL_VIDEOS.map(v => ({
        ...v,
        created_at: new Date().toISOString()
      })),
      coupons: [
        {
          id: 1,
          code: 'PANDA50',
          discount_type: 'flat',
          discount_value: 50,
          min_order_amount: 499,
          max_discount: 50,
          expires_at: null,
          usage_limit: 500,
          used_count: 0,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          code: 'WELCOME10',
          discount_type: 'percentage',
          discount_value: 10,
          min_order_amount: 0,
          max_discount: 200,
          expires_at: null,
          usage_limit: 1000,
          used_count: 0,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ],
      reviews: [],
      orders: [],
      otp_store: {}       // Persisted OTPs: email → { otp, expiresAt }
    };
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2));
  }
}

let localStoreCache = null; // In-memory cache to avoid blocking sync I/O on every request

export function readLocalStore() {
  if (localStoreCache) {
    if (!localStoreCache.categories) {
      localStoreCache.categories = INITIAL_CATEGORIES.map((c, idx) => ({
        id: idx + 1,
        name: c,
        description: `${c} toys and activities for kids`,
        created_at: new Date().toISOString()
      }));
    }
    if (!localStoreCache.videos) {
      localStoreCache.videos = INITIAL_VIDEOS.map(v => ({
        ...v,
        created_at: new Date().toISOString()
      }));
    }
    if (!localStoreCache.coupons) {
      localStoreCache.coupons = [
        {
          id: 1,
          code: 'PANDA50',
          discount_type: 'flat',
          discount_value: 50,
          min_order_amount: 499,
          max_discount: 50,
          expires_at: null,
          usage_limit: 500,
          used_count: 0,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          code: 'WELCOME10',
          discount_type: 'percentage',
          discount_value: 10,
          min_order_amount: 0,
          max_discount: 200,
          expires_at: null,
          usage_limit: 1000,
          used_count: 0,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
    }
    if (!localStoreCache.reviews) {
      localStoreCache.reviews = [];
    }
    return localStoreCache;
  }
  ensureLocalStore();
  const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
  localStoreCache = JSON.parse(raw);
  if (!localStoreCache.categories) {
    localStoreCache.categories = INITIAL_CATEGORIES.map((c, idx) => ({
      id: idx + 1,
      name: c,
      description: `${c} toys and activities for kids`,
      created_at: new Date().toISOString()
    }));
    writeLocalStore(localStoreCache);
  }
  if (!localStoreCache.videos) {
    localStoreCache.videos = INITIAL_VIDEOS.map(v => ({
      ...v,
      created_at: new Date().toISOString()
    }));
    writeLocalStore(localStoreCache);
  }
  if (!localStoreCache.coupons) {
    localStoreCache.coupons = [
      {
        id: 1,
        code: 'PANDA50',
        discount_type: 'flat',
        discount_value: 50,
        min_order_amount: 499,
        max_discount: 50,
        expires_at: null,
        usage_limit: 500,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        code: 'WELCOME10',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 0,
        max_discount: 200,
        expires_at: null,
        usage_limit: 1000,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
    writeLocalStore(localStoreCache);
  }
  if (!localStoreCache.reviews) {
    localStoreCache.reviews = [];
    writeLocalStore(localStoreCache);
  }
  return localStoreCache;
}

export function writeLocalStore(data) {
  localStoreCache = data; // Update cache immediately (synchronous, in-process)
  ensureLocalStore();
  // Persist to disk asynchronously so it never blocks the event loop
  fs.writeFile(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), (err) => {
    if (err) console.error('⚠️  Failed to persist local store to disk:', err);
  });
}

export async function initDB() {
  const dbUrl = process.env.DATABASE_URL;

  try {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables.');
    }

    const cleanUrl = dbUrl.split('?')[0];

    pool = new Pool({
      connectionString: cleanUrl,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    client.release();
    isPostgresConnected = true;
    console.log('✅ PostgreSQL connected successfully to Aiven Cloud database!');

    await initPostgresSchema();
  } catch (err) {
    isPostgresConnected = false;
    console.warn('⚠️  PostgreSQL connection issue (' + err.message + ').');
    console.warn('📦  Running on local high-performance store fallback.');
    ensureLocalStore();
  }
}

async function initPostgresSchema() {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(150),
      role VARCHAR(50) DEFAULT 'admin',
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(150),
      phone VARCHAR(50),
      avatar TEXT,
      panda_points INT DEFAULT 0,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_store (
      email VARCHAR(255) PRIMARY KEY,
      otp VARCHAR(10) NOT NULL,
      expires_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      child_name VARCHAR(150) NOT NULL,
      parent_name VARCHAR(150) DEFAULT '',
      phone VARCHAR(50) NOT NULL,
      dob DATE NOT NULL,
      panda_points INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS toys (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      original_price NUMERIC(10, 2),
      age_group VARCHAR(50) NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      stock INT DEFAULT 10,
      featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      customer_name VARCHAR(150) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      pincode VARCHAR(20) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'COD',
      total_amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending',
      items JSONB NOT NULL,
      user_email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      youtube_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      channel VARCHAR(150) DEFAULT 'Pandanest Kids',
      duration_sec INT DEFAULT 40,
      description TEXT,
      points_reward INT DEFAULT 10,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage' | 'flat'
      discount_value NUMERIC(10, 2) NOT NULL,
      min_order_amount NUMERIC(10, 2) DEFAULT 0,
      max_discount NUMERIC(10, 2),
      expires_at TIMESTAMP,
      usage_limit INT DEFAULT 100,
      used_count INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      toy_id INT NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      user_name VARCHAR(150) NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      status VARCHAR(20) DEFAULT 'approved', -- 'pending' | 'approved' | 'rejected'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(schemaSQL);

  // Migrate: add columns for existing deployments
  try {
    await pool.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT \'admin\';');
    await pool.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(50);');
    await pool.query('ALTER TABLE leads ALTER COLUMN parent_name DROP NOT NULL;');
    await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS panda_points INT DEFAULT 100;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);');
    await pool.query('ALTER TABLE toys ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT \'{}\';');
    await pool.query('ALTER TABLE toys ADD COLUMN IF NOT EXISTS video_url TEXT;');
  } catch (e) {
    // Columns might already exist — safe to ignore
  }

  // Seed default super admin if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'acubebeauty@gmail.com';
  const adminCheck = await pool.query('SELECT id, role FROM admins WHERE email = $1', [adminEmail]);
  if (adminCheck.rows.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', salt);
    await pool.query(
      'INSERT INTO admins (email, password_hash, name, role, phone) VALUES ($1, $2, $3, $4, $5)',
      [adminEmail, hash, process.env.ADMIN_NAME || 'Ashish (Super Admin)', 'super_admin', '7380405227']
    );
    console.log(`👑 Seeded Super Admin: ${adminEmail}`);
  } else {
    // Ensure primary admin has super_admin role
    await pool.query('UPDATE admins SET role = \'super_admin\' WHERE email = $1', [adminEmail]);
  }

  // Seed default toys if table is empty
  const toysCheck = await pool.query('SELECT COUNT(*) as count FROM toys');
  if (parseInt(toysCheck.rows[0].count, 10) === 0) {
    for (const t of INITIAL_TOYS) {
      await pool.query(
        `INSERT INTO toys (name, category, price, original_price, age_group, description, image_url, stock, featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [t.name, t.category, t.price, t.original_price, t.age_group, t.description, t.image_url, t.stock, t.featured]
      );
    }
    console.log(`🧸 Seeded ${INITIAL_TOYS.length} toys into PostgreSQL!`);
  }

  // Seed default categories if empty
  const catCheck = await pool.query('SELECT COUNT(*) as count FROM categories');
  if (parseInt(catCheck.rows[0].count, 10) === 0) {
    for (const c of INITIAL_CATEGORIES) {
      await pool.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [c, `${c} toys and activities for kids`]
      );
    }
    console.log(`🏷️  Seeded ${INITIAL_CATEGORIES.length} categories into PostgreSQL!`);
  }

  // Seed default videos if empty
  const vidCheck = await pool.query('SELECT COUNT(*) as count FROM videos');
  if (parseInt(vidCheck.rows[0].count, 10) === 0) {
    for (const v of INITIAL_VIDEOS) {
      await pool.query(
        `INSERT INTO videos (youtube_id, title, channel, duration_sec, description, points_reward)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [v.youtube_id, v.title, v.channel, v.duration_sec, v.description, v.points_reward]
      );
    }
    console.log(`🎬 Seeded ${INITIAL_VIDEOS.length} videos into PostgreSQL!`);
  }

  // Seed default coupons if empty
  const couponCheck = await pool.query('SELECT COUNT(*) as count FROM coupons');
  if (parseInt(couponCheck.rows[0].count, 10) === 0) {
    await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, usage_limit, is_active)
       VALUES
       ('PANDA50', 'flat', 50, 499, 50, 500, true),
       ('WELCOME10', 'percentage', 10, 0, 200, 1000, true)
       ON CONFLICT (code) DO NOTHING`
    );
    console.log('🎟️  Seeded default coupons (PANDA50, WELCOME10) into PostgreSQL!');
  }
}

export function getDB() {
  return {
    isPostgres: isPostgresConnected,
    pool: pool
  };
}

export default {
  initDB,
  getDB,
  readLocalStore,
  writeLocalStore
};
