require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const { db, getSettings, saveSettings } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const UPLOADS_DIR = path.join(__dirname, process.env.UPLOADS_DIR || 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

const tokens = new Map();
function createToken() {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, Date.now() + 12 * 60 * 60 * 1000);
  return token;
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expires = tokens.get(token);
  if (!expires || expires < Date.now()) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(png|jpe?g|webp|gif|svg)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('Formato de imagen no permitido'));
  }
});

function publicStore() {
  const settings = getSettings();
  const categories = db.prepare('SELECT * FROM categories ORDER BY position, id').all();
  const products = db.prepare('SELECT * FROM products ORDER BY position, id').all();
  const variants = db.prepare('SELECT * FROM product_variants ORDER BY id').all();

  const categoriesWithProducts = categories.map((cat) => ({
    ...cat,
    products: products
      .filter((p) => p.category_id === cat.id)
      .map((p) => ({
        ...p,
        variants: variants.filter((v) => v.product_id === p.id)
      }))
  }));

  const uncategorized = products.filter((p) => p.category_id === null);

  return {
    settings,
    categories: categoriesWithProducts,
    uncategorized
  };
}

app.get('/api/debug/settings', (req, res) => {
  try {
    const s = getSettings();
    res.json({ hasSettings: !!s, settingsKeys: s ? Object.keys(s) : null, screen: s?.screen, theme: s?.theme });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/store', (req, res) => {
  const settings = getSettings();
  const categories = db.prepare('SELECT * FROM categories ORDER BY position, id').all();
  const products = db.prepare('SELECT * FROM products ORDER BY position, id').all();
  const variants = db.prepare('SELECT * FROM product_variants ORDER BY id').all();

  const categoriesWithProducts = categories.map((cat) => ({
    ...cat,
    products: products
      .filter((p) => p.category_id === cat.id)
      .map((p) => ({
        ...p,
        variants: variants.filter((v) => v.product_id === p.id)
      }))
  }));

  const uncategorized = products.filter((p) => p.category_id === null);

  // DEBUG: agregar screen info a la respuesta
  const screenInfo = settings.screen || {};
  
  res.json({
    settings,
    categories: categoriesWithProducts,
    uncategorized,
    // Debug info
    debug: {
      screen: screenInfo,
      settingsKeys: settings ? Object.keys(settings) : null
    }
  });
});

app.post('/api/admin/verify', (req, res) => {
  const { pin } = req.body || {};
  if (String(pin) === String(ADMIN_PIN)) {
    res.json({ ok: true, token: createToken() });
  } else {
    res.status(401).json({ ok: false, error: 'PIN incorrecto' });
  }
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json(getSettings());
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const updated = saveSettings(req.body || {});
  res.json(updated);
});

app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen' });
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

app.get('/api/categories', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY position, id').all());
});

app.post('/api/categories', requireAdmin, (req, res) => {
  const { name, image, color, position } = req.body || {};
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const info = db
    .prepare('INSERT INTO categories (name, image, color, position) VALUES (?, ?, ?, ?)')
    .run(name, image || null, color || null, position || 0);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/categories/:id', requireAdmin, (req, res) => {
  const { name, image, color, position } = req.body || {};
  db.prepare('UPDATE categories SET name = COALESCE(?, name), image = COALESCE(?, image), color = COALESCE(?, color), position = COALESCE(?, position) WHERE id = ?')
    .run(name, image, color, position, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

app.delete('/api/categories/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/debug/settings', (req, res) => {
  try {
    const s = getSettings();
    res.json({ hasSettings: !!s, settingsKeys: s ? Object.keys(s) : null, screen: s?.screen, theme: s?.theme });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products', requireAdmin, (req, res) => {
  res.json(
    db.prepare('SELECT * FROM products ORDER BY position, id').all().map((p) => ({
      ...p,
      variants: db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id)
    }))
  );
});

app.post('/api/products', requireAdmin, (req, res) => {
  const { category_id, name, description, price, image, stock, featured, position, variants } = req.body || {};
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const info = db
    .prepare('INSERT INTO products (category_id, name, description, price, image, stock, featured, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(category_id || null, name, description || '', price || 0, image || null, stock === undefined ? 1 : stock, featured ? 1 : 0, position || 0);
  const id = info.lastInsertRowid;
  if (Array.isArray(variants)) {
    const ins = db.prepare('INSERT INTO product_variants (product_id, name, price, stock) VALUES (?, ?, ?, ?)');
    for (const v of variants) ins.run(id, v.name, v.price ?? null, v.stock === undefined ? 1 : v.stock);
  }
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ ...row, variants: db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(id) });
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const { category_id, name, description, price, image, stock, featured, position, variants } = req.body || {};
  db.prepare(
    `UPDATE products SET
      category_id = COALESCE(?, category_id),
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      image = COALESCE(?, image),
      stock = COALESCE(?, stock),
      featured = COALESCE(?, featured),
      position = COALESCE(?, position)
     WHERE id = ?`
  ).run(category_id, name, description, price, image, stock, featured, position, req.params.id);

  if (Array.isArray(variants)) {
    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(req.params.id);
    const ins = db.prepare('INSERT INTO product_variants (product_id, name, price, stock) VALUES (?, ?, ?, ?)');
    for (const v of variants) ins.run(req.params.id, v.name, v.price ?? null, v.stock === undefined ? 1 : v.stock);
  }
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ ...row, variants: db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(req.params.id) });
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/orders', (req, res) => {
  const { name, phone, paymentMethod, note, items, total } = req.body || {};
  if (!name || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  const last = db.prepare('SELECT COALESCE(MAX(order_number), 0) AS max FROM orders').get();
  const orderNumber = last.max + 1;
  const info = db
    .prepare('INSERT INTO orders (order_number, name, phone, payment_method, note, items, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(orderNumber, name, phone || '', paymentMethod || '', note || '', JSON.stringify(items), total || 0, 'nuevo');
  res.json({ ok: true, orderNumber });
});

app.get('/api/orders', requireAdmin, (req, res) => {
  res.json(
    db.prepare('SELECT * FROM orders ORDER BY id DESC').all().map((o) => ({
      ...o,
      items: JSON.parse(o.items)
    }))
  );
});

app.patch('/api/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status || 'nuevo', req.params.id);
  res.json({ ok: true });
});

app.get('/api/analytics', requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders').all();
  const totals = { count: 0, revenue: 0 };
  const byDay = {};
  const productCounts = {};
  for (const o of orders) {
    totals.count += 1;
    totals.revenue += o.total || 0;
    const day = (o.created_at || '').slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
    let items = [];
    try { items = JSON.parse(o.items); } catch {}
    for (const it of items) {
      const key = it.name || 'Producto';
      productCounts[key] = (productCounts[key] || 0) + (it.qty || 1);
    }
  }
  const bestSellers = Object.entries(productCounts)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);
  res.json({ totals, byDay, bestSellers });
});

app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get(['/tienda', '/tienda.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tienda.html'));
});

app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Páginas legales
const legalPages = ['terminos', 'privacidad', 'cookies', 'politicas', 'contacto', 'error'];
legalPages.forEach((page) => {
  app.get([`/${page}`, `/${page}.html`], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

// Página 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Manejo de errores del servidor (500)
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
  res.status(500).sendFile(path.join(__dirname, 'public', 'error.html'));
});

app.listen(PORT, () => {
  console.log(`OX WhatShop corriendo en http://localhost:${PORT}`);
  console.log(`Panel admin: http://localhost:${PORT}/admin`);
});