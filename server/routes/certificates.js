import express from 'express';
import { getDB, readLocalStore, writeLocalStore } from '../db.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

export const DEFAULT_CERTIFICATES = [
  {
    id: 1,
    title: 'BIS Standard IS 9873 (Part 1, 2 & 3) — Safety of Toys',
    issuer: 'Bureau of Indian Standards (Govt. of India)',
    cert_number: 'BIS-IS9873-IN-2026-8841',
    category: 'Safety & Compliance',
    valid_till: '2028-12-31',
    image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    description: 'Mandatory Indian Standard compliance verifying mechanical, physical, flammability, and heavy element safety requirements for all toys.',
    display_order: 1
  },
  {
    id: 2,
    title: '100% Non-Toxic & BPA-Free Child Safety Certification',
    issuer: 'SGS India / TÜV Testing Laboratories',
    cert_number: 'SGS-TOX-SAFE-90412',
    category: 'Child Health & Safety',
    valid_till: '2028-10-15',
    image_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
    description: 'EN 71-3 testing protocol certifying zero phthalates, lead-free pigments, and food-grade ABS virgin plastics safe for toddlers and infants.',
    display_order: 2
  },
  {
    id: 3,
    title: 'ISO 9001:2015 Certified Quality Management System',
    issuer: 'International Organization for Standardization (ISO)',
    cert_number: 'ISO-9001-QMS-PN2026',
    category: 'Quality Assurance',
    valid_till: '2027-08-30',
    image_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
    description: 'Certified production, rigorous batch packaging inspection, and transparent customer care delivery systems.',
    display_order: 3
  },
  {
    id: 4,
    title: 'Ministry of MSME & Startup India Recognition',
    issuer: 'Govt. of India, Ministry of MSME / DPIIT',
    cert_number: 'UDYAM-UP-28-0091823',
    category: 'Government Recognition',
    valid_till: 'Permanent',
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    description: 'Recognized Indian manufacturing and indigenous child learning development brand registered under Government of India initiatives.',
    display_order: 4
  },
  {
    id: 5,
    title: 'CE Conformity European Toy Directive EN-71',
    issuer: 'European Union Toy Safety Directive',
    cert_number: 'CE-EU-EN71-7729',
    category: 'Global Standards',
    valid_till: '2028-05-20',
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
    description: 'Demonstrating conformity with health, safety, and environmental protection standards for children under 14 years.',
    display_order: 5
  }
];

// GET /api/certificates - List all certificates (Public)
router.get('/', async (req, res) => {
  try {
    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      try {
        const result = await pool.query('SELECT * FROM certificates ORDER BY display_order ASC, id ASC');
        if (result.rows.length > 0) {
          return res.json(result.rows);
        }
      } catch (e) {
        // fallback
      }
    }

    const store = readLocalStore();
    const certs = store.certificates && store.certificates.length > 0
      ? store.certificates
      : DEFAULT_CERTIFICATES;
    return res.json(certs);
  } catch (err) {
    console.error('Error fetching certificates:', err);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

// POST /api/certificates - Add new certificate (Admin only)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { title, issuer, cert_number, category, valid_till, image_url, description, display_order } = req.body;
    if (!title || !issuer) {
      return res.status(400).json({ error: 'Certificate title and issuer are required' });
    }

    const orderNum = parseInt(display_order || '0', 10);
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        const result = await pool.query(
          `INSERT INTO certificates (title, issuer, cert_number, category, valid_till, image_url, description, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [title.trim(), issuer.trim(), cert_number || '', category || 'Safety & Compliance', valid_till || '', image_url || '', description || '', orderNum]
        );
        return res.status(201).json(result.rows[0]);
      } catch (e) {
        console.warn('Postgres add certificate error:', e.message);
      }
    }

    const store = readLocalStore();
    if (!store.certificates) {
      store.certificates = [...DEFAULT_CERTIFICATES];
    }

    const newCert = {
      id: Date.now(),
      title: title.trim(),
      issuer: issuer.trim(),
      cert_number: cert_number || '',
      category: category || 'Safety & Compliance',
      valid_till: valid_till || '',
      image_url: image_url || '',
      description: description || '',
      display_order: orderNum,
      created_at: new Date().toISOString()
    };

    store.certificates.push(newCert);
    writeLocalStore(store);
    res.status(201).json(newCert);
  } catch (err) {
    console.error('Error creating certificate:', err);
    res.status(500).json({ error: 'Failed to create certificate' });
  }
});

// PUT /api/certificates/:id - Update certificate (Admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, issuer, cert_number, category, valid_till, image_url, description, display_order } = req.body;

    const { isPostgres, pool } = getDB();
    if (isPostgres && pool) {
      try {
        const result = await pool.query(
          `UPDATE certificates
           SET title = COALESCE($1, title),
               issuer = COALESCE($2, issuer),
               cert_number = COALESCE($3, cert_number),
               category = COALESCE($4, category),
               valid_till = COALESCE($5, valid_till),
               image_url = COALESCE($6, image_url),
               description = COALESCE($7, description),
               display_order = COALESCE($8, display_order)
           WHERE id = $9
           RETURNING *`,
          [title, issuer, cert_number, category, valid_till, image_url, description, display_order ? parseInt(display_order, 10) : undefined, id]
        );
        if (result.rows.length > 0) return res.json(result.rows[0]);
      } catch (e) {
        // fallback
      }
    }

    const store = readLocalStore();
    if (!store.certificates) store.certificates = [...DEFAULT_CERTIFICATES];
    const idx = store.certificates.findIndex(c => String(c.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Certificate not found' });

    store.certificates[idx] = {
      ...store.certificates[idx],
      ...(title && { title }),
      ...(issuer && { issuer }),
      ...(cert_number !== undefined && { cert_number }),
      ...(category && { category }),
      ...(valid_till !== undefined && { valid_till }),
      ...(image_url !== undefined && { image_url }),
      ...(description !== undefined && { description }),
      ...(display_order !== undefined && { display_order: parseInt(display_order, 10) })
    };

    writeLocalStore(store);
    res.json(store.certificates[idx]);
  } catch (err) {
    console.error('Error updating certificate:', err);
    res.status(500).json({ error: 'Failed to update certificate' });
  }
});

// DELETE /api/certificates/:id - Delete certificate (Admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPostgres, pool } = getDB();

    if (isPostgres && pool) {
      try {
        await pool.query('DELETE FROM certificates WHERE id = $1', [id]);
        return res.json({ success: true, message: 'Certificate deleted' });
      } catch (e) {
        // fallback
      }
    }

    const store = readLocalStore();
    if (store.certificates) {
      store.certificates = store.certificates.filter(c => String(c.id) !== String(id));
      writeLocalStore(store);
    }

    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    console.error('Error deleting certificate:', err);
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

export default router;

