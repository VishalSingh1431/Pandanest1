import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/categories - Public: Get all product categories
router.get('/', async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
      return res.json(result.rows);
    } else {
      const store = readLocalStore();
      const categories = (store.categories || []).sort((a, b) => a.name.localeCompare(b.name));
      return res.json(categories);
    }
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// POST /api/categories - Admin: Create new category
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const cleanName = name.trim();
    const cleanDesc = (description || '').trim();
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const exists = await pool.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [cleanName]);
      if (exists.rows.length > 0) {
        return res.status(400).json({ error: 'A category with this name already exists.' });
      }
      const result = await pool.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
        [cleanName, cleanDesc]
      );
      return res.status(201).json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.categories) store.categories = [];
      const exists = store.categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: 'A category with this name already exists.' });
      }
      const newCat = {
        id: Date.now(),
        name: cleanName,
        description: cleanDesc,
        created_at: new Date().toISOString()
      };
      store.categories.push(newCat);
      writeLocalStore(store);
      return res.status(201).json(newCat);
    }
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category: ' + err.message });
  }
});

// PUT /api/categories/:id - Admin: Update category
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const cleanName = name.trim();
    const cleanDesc = (description || '').trim();
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      // Check for name conflict on other categories
      const conflict = await pool.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [cleanName, id]
      );
      if (conflict.rows.length > 0) {
        return res.status(400).json({ error: 'Another category with this name already exists.' });
      }

      const result = await pool.query(
        'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
        [cleanName, cleanDesc, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found.' });
      }
      return res.json(result.rows[0]);
    } else {
      const store = readLocalStore();
      if (!store.categories) store.categories = [];
      const index = store.categories.findIndex(c => String(c.id) === String(id));
      if (index === -1) {
        return res.status(404).json({ error: 'Category not found.' });
      }

      const conflict = store.categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase() && String(c.id) !== String(id));
      if (conflict) {
        return res.status(400).json({ error: 'Another category with this name already exists.' });
      }

      const updated = {
        ...store.categories[index],
        name: cleanName,
        description: cleanDesc
      };
      store.categories[index] = updated;
      writeLocalStore(store);
      return res.json(updated);
    }
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category: ' + err.message });
  }
});

// DELETE /api/categories/:id - Admin: Delete category
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Category not found.' });
      }
    } else {
      const store = readLocalStore();
      if (!store.categories) store.categories = [];
      const before = store.categories.length;
      store.categories = store.categories.filter(c => String(c.id) !== String(id));
      if (store.categories.length === before) {
        return res.status(404).json({ error: 'Category not found.' });
      }
      writeLocalStore(store);
    }

    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category: ' + err.message });
  }
});

export default router;
