const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'whatshop.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image TEXT,
    color TEXT DEFAULT '#E8ECF0',
    icon TEXT,
    position INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    image TEXT,
    stock INTEGER DEFAULT 1,
    featured INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL,
    stock INTEGER DEFAULT 1,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    payment_method TEXT,
    note TEXT,
    items TEXT NOT NULL,
    total REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'nuevo',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

const DEFAULT_SETTINGS = {
  screen: {
    type: 'Mobile Onboarding / Landing',
    theme: {
      background_color: '#FFFFFF',
      text_color: '#000000',
      font_style: 'Sans-Serif Bold'
    },
    layout: {
      display: 'flex',
      direction: 'column',
      align_items: 'center',
      justify_content: 'space-between',
      padding: '32px 24px'
    }
  },
  components: [
    {
      id: 'brand_header',
      type: 'Header',
      layout: { display: 'flex', justify: 'center' },
      children: [
        {
          type: 'Image',
          role: 'logo',
          alt: 'Nike Swoosh',
          style: {
            width: '40px',
            height: 'auto',
            margin_bottom: '20px'
          }
        }
      ]
    },
    {
      id: 'hero_media',
      type: 'Container',
      role: 'hero_image_wrapper',
      style: {
        shape: 'oval / stadium / capsule',
        border_radius: '9999px',
        overflow: 'hidden',
        width: '100%',
        max_width: '280px',
        aspect_ratio: '4/5',
        margin_bottom: '24px'
      },
      children: [
        {
          type: 'Image',
          alt: 'Model in urban athletic streetwear',
          object_fit: 'cover'
        }
      ]
    },
    {
      id: 'headline',
      type: 'Typography',
      role: 'main_title',
      content: {
        text: 'JUST\nDO IT.'
      },
      style: {
        font_size: '40px',
        font_weight: '900',
        line_height: '0.95',
        text_transform: 'uppercase',
        text_align: 'center',
        letter_spacing: '-0.02em',
        margin_bottom: '32px'
      }
    },
    {
      id: 'primary_action',
      type: 'Button',
      variant: 'pill_with_icon',
      style: {
        width: '100%',
        height: '56px',
        background_color: '#000000',
        border_radius: '9999px',
        padding_left: '24px',
        padding_right: '8px',
        display: 'flex',
        align_items: 'center',
        justify_content: 'space-between'
      },
      children: [
        {
          type: 'Typography',
          content: { text: 'Continue' },
          style: {
            color: '#FFFFFF',
            font_size: '16px',
            font_weight: '600'
          }
        },
        {
          type: 'Container',
          role: 'icon_badge',
          style: {
            width: '40px',
            height: '40px',
            background_color: '#FFFFFF',
            border_radius: '50%',
            display: 'flex',
            align_items: 'center',
            justify_content: 'center'
          },
          children: [
            {
              type: 'Icon',
              name: 'arrow_right',
              style: { color: '#000000', size: '18px' }
            }
          ]
        }
      ]
    }
  ],
  splash: {
    background: '#FFFFFF',
    logo: '/assets/logos/logoB.png',
    whatText: 'What',
    whatColor: '#000000',
    shopText: 'Shop',
    shopColor: '#16A34A',
    loadingSeconds: 3
  },
  store: {
    name: 'WhatShop',
    whatsapp: '',
    currency: '$',
    currencyPosition: 'before',
    open: true,
    closedMessage: 'La tienda esta cerrada en este momento',
    searchPlaceholder: 'Buscar productos...',
    emptyCartText: 'Tu carrito esta vacio',
    checkoutTitle: 'Datos de envio y pago',
    sendButton: 'Enviar pedido por WhatsApp',
    floatingWhatsapp: true,
    brandShowLogo: true,
    brandShowName: true,
    messageTemplate: [
      '\u{1F6D2} NUEVO PEDIDO - {storeName}',
      '',
      '\u{1F464} Cliente: {name}',
      '\u{1F4F1} Telefono: {phone}',
      '\u{1F4B3} Metodo de pago: {paymentMethod}',
      '{noteText}',
      '',
      '{items}',
      '',
      'TOTAL: {total}'
    ].join('\n'),
    social: {}
  },
  theme: {
    primary: '#171717',
    onPrimary: '#FFFFFF',
    secondary: '#404040',
    accent: '#A16207',
    background: '#FFFFFF',
    foreground: '#171717',
    muted: '#E8ECF0',
    border: '#E5E5E5',
    destructive: '#DC2626',
    ring: '#171717',
    categoryBox: '#E8ECF0',
    radius: 14,
    fontHeading: 'Plus Jakarta Sans',
    fontBody: 'Plus Jakarta Sans',
    darkMode: false,
    backgroundGradient: false,
    gradientColor: '#FFFFFF'
  },
  landing: {
    logo: '/assets/logos/logoB.png',
    title: 'WhatShop',
    subtitle: 'Tu tienda online',
    customText: '',
    swipeHint: 'Desliza hacia la derecha para entrar',
    buttonText: 'Entrar a la tienda'
  }
};

function getSettings() {
  const row = db.prepare('SELECT data FROM settings WHERE id = 1').get();
  if (!row) return null;
  return JSON.parse(row.data);
}

function saveSettings(data) {
  const existing = getSettings();
  const merged = { ...DEFAULT_SETTINGS, ...data };
  db.prepare(
    'INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data'
  ).run(JSON.stringify(merged));
  return getSettings();
}

if (!getSettings()) {
  saveSettings(DEFAULT_SETTINGS);
}

module.exports = { db, getSettings, saveSettings, DEFAULT_SETTINGS };