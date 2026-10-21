import express from 'express';
import multer from 'multer';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { uploadToCloudinary } from '../cloudinary.js';

const router = express.Router();

// Memory storage for multer so we can directly stream to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

// GET /api/toys - Public catalog with search & filters
router.get('/', async (req, res) => {
  try {
    const { category, age, search, sort } = req.query;
    const { isPostgres, pool } = getDB();
    let toys = [];

    if (isPostgres && pool) {
      let query = 'SELECT * FROM toys WHERE 1=1';
      const params = [];

      if (category && category !== 'All') {
        params.push(category);
        query += ` AND category = $${params.length}`;
      }

      if (age && age !== 'All') {
        params.push(age);
        query += ` AND age_group = $${params.length}`;
      }

      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        params.push(searchTerm); // e.g. $3
        params.push(searchTerm); // e.g. $4 (separate push for LOWER(description))
        query += ` AND (LOWER(name) LIKE $${params.length - 1} OR LOWER(description) LIKE $${params.length})`;
      }

      if (sort === 'price-low') {
        query += ' ORDER BY price ASC';
      } else if (sort === 'price-high') {
        query += ' ORDER BY price DESC';
      } else {
        query += ' ORDER BY featured DESC, created_at DESC';
      }

      const result = await pool.query(query, params);
      toys = result.rows;
    } else {
      const store = readLocalStore();
      toys = [...(store.toys || [])];

      if (category && category !== 'All') {
        toys = toys.filter(t => t.category === category);
      }

      if (age && age !== 'All') {
        toys = toys.filter(t => t.age_group === age);
      }

      if (search) {
        const s = search.toLowerCase();
        toys = toys.filter(t => t.name.toLowerCase().includes(s) || (t.description && t.description.toLowerCase().includes(s)));
      }

      if (sort === 'price-low') {
        toys.sort((a, b) => Number(a.price) - Number(b.price));
      } else if (sort === 'price-high') {
        toys.sort((a, b) => Number(b.price) - Number(a.price));
      } else {
        toys.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      }
    }

    res.json(toys);
  } catch (err) {
    console.error('Fetch toys error:', err);
    res.status(500).json({ error: 'Failed to retrieve toys.' });
  }
});

// GET /api/toys/:id - Single toy details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();
    let toy = null;

    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM toys WHERE id = $1', [id]);
      if (result.rows.length > 0) toy = result.rows[0];
    } else {
      const store = readLocalStore();
      toy = store.toys.find(t => String(t.id) === String(id));
    }

    if (!toy) {
      return res.status(404).json({ error: 'Toy not found.' });
    }

    res.json(toy);
  } catch (err) {
    console.error('Get toy error:', err);
    res.status(500).json({ error: 'Failed to retrieve toy details.' });
  }
});

// POST /api/toys - Admin: Add new toy with Cloudinary image upload
router.post('/', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, original_price, age_group, description, stock, featured, image_url_manual } = req.body;

    if (!name || !category || !price || !age_group) {
      return res.status(400).json({ error: 'Name, Category, Price, and Age Group are required.' });
    }

    let finalImageUrl = image_url_manual;

    // If an image file was uploaded, upload it to Cloudinary
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      finalImageUrl = uploadResult.url;
    }

    if (!finalImageUrl) {
      // Default placeholder if none provided
      finalImageUrl = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&auto=format&fit=crop&q=80';
    }

    const { isPostgres, pool } = getDB();
    const numPrice = parseFloat(price);
    const numOriginalPrice = original_price ? parseFloat(original_price) : null;
    const numStock = stock ? parseInt(stock, 10) : 10;
    const isFeatured = featured === 'true' || featured === true;

    if (isPostgres && pool) {
      const result = await pool.query(
        `INSERT INTO toys (name, category, price, original_price, age_group, description, image_url, stock, featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [name.trim(), category.trim(), numPrice, numOriginalPrice, age_group.trim(), description || '', finalImageUrl, numStock, isFeatured]
      );
      return res.status(201).json(result.rows[0]);
    } else {
      const store = readLocalStore();
      const newToy = {
        id: Date.now(),
        name: name.trim(),
        category: category.trim(),
        price: numPrice,
        original_price: numOriginalPrice,
        age_group: age_group.trim(),
        description: description || '',
        image_url: finalImageUrl,
        stock: numStock,
        featured: isFeatured,
        created_at: new Date().toISOString()
      };
      store.toys.unshift(newToy);
      writeLocalStore(store);

      return res.status(201).json(newToy);
    }
  } catch (err) {
    console.error('Create toy error:', err);
    res.status(500).json({ error: 'Failed to create toy: ' + err.message });
  }
});

// PUT /api/toys/:id - Admin: Edit toy
router.put('/:id', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, original_price, age_group, description, stock, featured, image_url } = req.body;

    let finalImageUrl = image_url;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      finalImageUrl = uploadResult.url;
    }

    const { isPostgres, pool } = getDB();
    const numPrice = parseFloat(price);
    const numOriginalPrice = original_price ? parseFloat(original_price) : null;
    // Pass null when stock is not provided so COALESCE($8, stock) preserves existing value
    const numStock = stock !== undefined ? parseInt(stock, 10) : null;
    const isFeatured = featured === 'true' || featured === true;

    if (isPostgres && pool) {
      const result = await pool.query(
        `UPDATE toys
         SET name = COALESCE($1, name),
             category = COALESCE($2, category),
             price = COALESCE($3, price),
             original_price = $4,
             age_group = COALESCE($5, age_group),
             description = COALESCE($6, description),
             image_url = COALESCE($7, image_url),
             stock = COALESCE($8, stock),
             featured = COALESCE($9, featured)
         WHERE id = $10
         RETURNING *`,
        [name, category, numPrice, numOriginalPrice, age_group, description, finalImageUrl, numStock, isFeatured, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Toy not found.' });
      }
      return res.json(result.rows[0]);
    } else {
      const store = readLocalStore();
      const index = store.toys.findIndex(t => String(t.id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Toy not found.' });
      }

      const existing = store.toys[index];
      const updated = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        category: category !== undefined ? category : existing.category,
        price: price !== undefined ? numPrice : existing.price,
        original_price: original_price !== undefined ? numOriginalPrice : existing.original_price,
        age_group: age_group !== undefined ? age_group : existing.age_group,
        description: description !== undefined ? description : existing.description,
        image_url: finalImageUrl || existing.image_url,
        stock: stock !== undefined ? numStock : existing.stock,
        featured: featured !== undefined ? isFeatured : existing.featured
      };
      store.toys[index] = updated;
      writeLocalStore(store);

      return res.json(updated);
    }
  } catch (err) {
    console.error('Update toy error:', err);
    res.status(500).json({ error: 'Failed to update toy: ' + err.message });
  }
});

// DELETE /api/toys/:id - Admin: Delete toy
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query('DELETE FROM toys WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Toy not found.' });
      }
    } else {
      const store = readLocalStore();
      const before = store.toys.length;
      store.toys = store.toys.filter(t => String(t.id) !== String(id));
      if (store.toys.length === before) {
        return res.status(404).json({ error: 'Toy not found.' });
      }
      writeLocalStore(store);
    }

    res.json({ success: true, message: 'Toy deleted successfully.' });
  } catch (err) {
    console.error('Delete toy error:', err);
    res.status(500).json({ error: 'Failed to delete toy.' });
  }
});

export default router;
