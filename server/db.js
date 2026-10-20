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

function ensureLocalStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORE_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const initialAdmin = {
      id: 1,
      email: process.env.ADMIN_EMAIL || 'acubebeauty@gmail.com',
      password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', salt),
      name: process.env.ADMIN_NAME || 'Ashish (Super Admin)',
      role: 'super_admin',
      phone: '7380405227',
      created_at: new Date().toISOString()
    };
    const store = {
      admins: [initialAdmin],
      leads: [],
      toys: INITIAL_TOYS.map((t, idx) => ({
        id: idx + 1,
        ...t,
        created_at: new Date().toISOString()
      })),
      orders: []
    };
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2));
  }
}

export function readLocalStore() {
  ensureLocalStore();
  const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
  return JSON.parse(raw);
}

export function writeLocalStore(data) {
  ensureLocalStore();
  fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2));
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(schemaSQL);

  // Alter tables to add new columns if they exist from older migrations
  try {
    await pool.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT \'admin\';');
    await pool.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(50);');
    await pool.query('ALTER TABLE leads ALTER COLUMN parent_name DROP NOT NULL;');
    await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS panda_points INT DEFAULT 100;');
  } catch (e) {
    // Columns might already exist
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
