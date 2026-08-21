/* OX WhatShop - Cliente Supabase + helpers */
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

let sbClient = null;

function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (sbClient) return resolve(sbClient);
    if (window.supabase) { sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); return resolve(sbClient); }
    const s = document.createElement('script');
    s.src = SUPABASE_CDN;
    s.onload = () => {
      sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      resolve(sbClient);
    };
    s.onerror = () => reject(new Error('No se pudo cargar Supabase'));
    document.head.appendChild(s);
  });
}

// ===== Helpers UI compartidos (tienda + admin) =====
function applyTheme(settings) {
  const t = (settings && settings.theme) || {};
  const root = document.documentElement.style;
  const map = {
    '--color-primary': t.primary,
    '--color-on-primary': t.onPrimary,
    '--color-secondary': t.secondary,
    '--color-accent': t.accent,
    '--color-background': t.background,
    '--color-foreground': t.foreground,
    '--color-muted': t.muted,
    '--color-border': t.border,
    '--color-destructive': t.destructive,
    '--color-ring': t.ring,
    '--color-category-box': t.categoryBox,
    '--radius': t.radius ? `${t.radius}px` : undefined
  };
  for (const [key, value] of Object.entries(map)) {
    if (value) root.setProperty(key, value);
  }
  if (t.fontHeading) root.setProperty('--font-heading', `'${t.fontHeading}', system-ui, sans-serif`);
  if (t.fontBody) root.setProperty('--font-body', `'${t.fontBody}', system-ui, sans-serif`);
  if (t.fontHeading) injectFont(t.fontHeading);
}

function injectFont(fontName) {
  if (!fontName || /system/i.test(fontName)) return;
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function toast(message, type = '', duration = 2600) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show' + (type ? ` toast--${type}` : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}

function formatPrice(value, settings) {
  const s = settings || {};
  const currency = s.store?.currency || '$';
  const pos = s.store?.currencyPosition || 'before';
  const num = Number(value || 0).toFixed(2);
  return pos === 'after' ? `${num} ${currency}` : `${currency}${num}`;
}

function openWhatsApp(message, phone) {
  const number = phone || '';
  const encoded = encodeURIComponent(message);
  let url;
  if (number && number.startsWith('wa.me/')) {
    url = `${number}?text=${encoded}`;
  } else if (number) {
    url = `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encoded}`;
  } else {
    url = `https://wa.me?text=${encoded}`;
  }
  window.open(url, '_blank');
  toast('Abriendo WhatsApp...', 'success');
}

// SHA-256 (hex) para validar el PIN del admin
async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const SBHelper = {
  async client() { return loadSupabase(); },

  // ---- Settings ----
  async getSettings() {
    const c = await loadSupabase();
    const { data, error } = await c.from('settings').select('data').eq('id', 1).single();
    if (error) throw error;
    return data ? data.data : null;
  },
  async saveSettings(data) {
    const c = await loadSupabase();
    const { error } = await c.from('settings').upsert({ id: 1, data, updated_at: new Date() });
    if (error) throw error;
  },

  // ---- Admin PIN ----
  async getPinHash() {
    const c = await loadSupabase();
    const { data, error } = await c.from('admin').select('pin_hash').eq('id', 1).single();
    if (error) throw error;
    return data ? data.pin_hash : null;
  },

  // ---- Categorias ----
  async getCategories() {
    const c = await loadSupabase();
    const { data, error } = await c.from('categories').select('*').order('position');
    if (error) throw error;
    return data || [];
  },
  async addCategory(obj) {
    const c = await loadSupabase();
    const { data, error } = await c.from('categories').insert(obj).select().single();
    if (error) throw error;
    return data;
  },
  async deleteCategory(id) {
    const c = await loadSupabase();
    const { error } = await c.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Productos ----
  async getProducts() {
    const c = await loadSupabase();
    const { data, error } = await c.from('products').select('*, product_variants(*)').order('position');
    if (error) throw error;
    return data || [];
  },
  async addProduct(obj) {
    const c = await loadSupabase();
    const { data, error } = await c.from('products').insert(obj).select().single();
    if (error) throw error;
    return data;
  },
  async deleteProduct(id) {
    const c = await loadSupabase();
    const { error } = await c.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Pedidos ----
  async addOrder(order) {
    const c = await loadSupabase();
    const { data: last, error: e0 } = await c.from('orders').select('order_number').order('order_number', { ascending: false }).limit(1);
    if (e0) throw e0;
    const orderNumber = (last && last.length ? last[0].order_number : 0) + 1;
    const { data, error } = await c.from('orders').insert({ ...order, order_number: orderNumber }).select().single();
    if (error) throw error;
    return data;
  },
  async getOrders() {
    const c = await loadSupabase();
    const { data, error } = await c.from('orders').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async updateOrderStatus(id, status) {
    const c = await loadSupabase();
    const { error } = await c.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  },

  // ---- Storage (imagenes) ----
  publicUrl(path) {
    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  },
  async uploadImage(file) {
    const c = await loadSupabase();
    const name = (file && file.name) || '';
    const ext = (name.split('.').pop() || 'png').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await c.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type || 'image/png' });
    if (error) throw error;
    return this.publicUrl(path);
  },

  // ---- Backup: reemplazar catalogo completo (borra e inserta) ----
  async replaceCatalog(categories, products) {
    const c = await loadSupabase();
    const { error: d0 } = await c.from('products').delete().neq('id', 0);
    if (d0) throw d0;
    const { error: d1 } = await c.from('categories').delete().neq('id', 0);
    if (d1) throw d1;

    const catIdMap = {};
    for (const cat of categories || []) {
      const { data, error } = await c.from('categories')
        .insert({ name: cat.name, image: cat.image, color: cat.color, position: cat.position })
        .select().single();
      if (error) throw error;
      catIdMap[cat.id] = data.id;
    }

    for (const p of products || []) {
      const { data, error } = await c.from('products')
        .insert({
          category_id: p.category_id != null ? (catIdMap[p.category_id] ?? null) : null,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          stock: p.stock,
          featured: !!p.featured,
          position: p.position
        })
        .select().single();
      if (error) throw error;

      if (Array.isArray(p.variants) && p.variants.length) {
        const rows = p.variants.map((v) => ({
          product_id: data.id,
          name: v.name,
          price: v.price ?? null,
          stock: v.stock ?? 1
        }));
        const { error: ve } = await c.from('product_variants').insert(rows);
        if (ve) throw ve;
      }
    }
    return true;
  }
};

async function SBStore() {
  const [settings, categories, products] = await Promise.all([
    SBHelper.getSettings(),
    SBHelper.getCategories(),
    SBHelper.getProducts()
  ]);
  const categoriesWithProducts = (categories || []).map((cat) => ({
    ...cat,
    products: (products || []).filter((p) => p.category_id === cat.id)
  }));
  const uncategorized = (products || []).filter((p) => !p.category_id);
  return { settings, categories: categoriesWithProducts, uncategorized };
}
