# 🐼 Pandanest.in - Premium Toy Shop & QR Experience

A full-stack, playful, modern toy store platform built with **React**, **Node.js/Express**, **PostgreSQL (`pg`)**, and **Cloudinary**.

---

## 🚀 Key Highlights & User Journey

### 1. In-Store QR Customer Onboarding (`/welcome`)
- Designed for parents scanning a physical QR standee in the shop or on promotional materials.
- Collects:
  - **Parent's Name**
  - **Child's Name**
  - **Mobile Number**
  - **Child's Date of Birth (DOB)** (used for birthday surprises & age recommendations)
- **Two Direct Options:**
  - **Submit & Enter:** Stores details in PostgreSQL, triggers a confetti celebration, and redirects to the toy catalog.
  - **Skip for now:** Parents can skip registration anytime and jump straight into the catalog.

### 2. Toy Catalog & Storefront (`/`)
- Dynamic categories: *RC & Vehicles, Plush & Soft Toys, Dolls & Playsets, Building Blocks & Sets, Outdoor & Action, Board Games, Musical Toys*.
- Filter by child age groups (`0-5 yrs`, `3-8 yrs`, `5-12 yrs`, `6-14 yrs`, `7+ yrs`).
- Live search by toy name and description.
- Interactive product cards with sale discounts, age badges, and stock availability.
- Quick View Modal with complete specs and high-res imagery.

### 3. Shopping Cart & Standard Checkout
- Persistent cart drawer with quantity adjustments and free delivery indicators.
- **Standard Checkout Modal:**
  - Customer name, phone, delivery address, city, pincode.
  - Payment method: **Cash on Delivery (COD)** or **Online Pay (UPI/Cards)**.
  - Order confirmation screen with unique order tracking numbers (e.g. `PN-49120`).

### 4. Admin Management Dashboard (`/admin`)
- **Secure JWT Authentication:** Email (`admin@pandanest.in`) and Password (`admin123`).
- **Real-Time Metrics:** Total Toys, Total Leads, Upcoming Birthdays, Total Orders & Revenue.
- **Toy Inventory Manager:**
  - Add, edit, or delete toys.
  - **Cloudinary Image Upload:** Directly upload toy photos to Cloudinary with real-time preview (plus URL fallback).
- **QR Customer Leads:**
  - View all registered parents and kids.
  - **Upcoming Birthday Tracker:** Flags children whose birthdays are within the next 30 days so the shopkeeper can send personalized offers!
  - 1-click phone call / WhatsApp launcher.
- **Orders Manager:** View customer address and change order status (`Pending`, `Confirmed`, `Dispatched`, `Delivered`).
- **Printable In-Store QR Standee:** High-resolution QR code generator ready to download or print for store counters.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Lucide Icons, Canvas Confetti, Vanilla CSS (Fredoka & Outfit Typography).
- **Backend:** Node.js, Express, `pg` (node-postgres), JSON Web Tokens (JWT), Bcrypt, Multer.
- **Database:** PostgreSQL (with automatic table initialization & starter toys seeding).
- **Image Cloud:** Cloudinary (`v2`) for toy image storage.

---

## 🏃 Quick Start

### 1. Start Both Backend & Frontend
From the root directory:
```bash
npm run dev
```
* **Frontend:** `http://localhost:3000`
* **Backend API:** `http://localhost:5000`

---

## ⚙️ Configuration (`server/.env`)

Edit `server/.env` to link your PostgreSQL database and Cloudinary keys:

```env
PORT=5000
JWT_SECRET=pandanest_super_secret_jwt_key_2026_xyz

# PostgreSQL Database (Local, Supabase, Neon, or Render)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pandanest

# Cloudinary (Get from https://cloudinary.com/console)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Default Admin Credentials
ADMIN_EMAIL=admin@pandanest.in
ADMIN_PASSWORD=admin123
```

> **Note:** Pandanest includes an automatic fallback store so that even if PostgreSQL or Cloudinary credentials are not yet entered, the entire web app runs and lets you test right away!

---

## 🔐 Default Admin Login
- **URL:** `http://localhost:3000/?page=admin`
- **Email:** `admin@pandanest.in`
- **Password:** `admin123`
