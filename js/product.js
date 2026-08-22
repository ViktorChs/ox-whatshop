/* OX WhatShop - Pagina de producto (product.html?id=) */

var I18N = {
  es: { back: 'Volver a la tienda', loading: 'Cargando…', offer: 'Oferta', color: 'Color', size: 'Talla', add_cart: 'Agregar al carrito', buy: 'Comprar ahora', bar_add: 'Agregar', bar_buy: 'Comprar', desc_title: 'Descripción', cart: 'Carrito', total: 'Total', checkout: 'Proceder al checkout', co_title: 'Datos de envío y pago', co_name: 'Nombre completo', co_phone: 'Teléfono / WhatsApp', co_pay: 'Método de pago', co_note: 'Nota / referencia (opcional)', send_wa: 'Enviar pedido por WhatsApp', back_shop: 'Volver a la tienda', out: 'Agotado', stock_n: 'En stock: {n}', sell_variants: 'Elija color y talla', not_found: 'Producto no encontrado' },
  en: { back: 'Back to store', loading: 'Loading…', offer: 'Sale', color: 'Color', size: 'Size', add_cart: 'Add to cart', buy: 'Buy now', bar_add: 'Add', bar_buy: 'Buy', desc_title: 'Description', cart: 'Cart', total: 'Total', checkout: 'Checkout', co_title: 'Shipping and payment details', co_name: 'Full name', co_phone: 'Phone / WhatsApp', co_pay: 'Payment method', co_note: 'Note / reference (optional)', send_wa: 'Send order via WhatsApp', back_shop: 'Back to store', out: 'Out of stock', stock_n: 'In stock: {n}', sell_variants: 'Choose color and size', not_found: 'Product not found' }
};
var lang = localStorage.getItem('whatshop_lang') === 'en' ? 'en' : 'es';
function t(key) { var v = I18N[lang][key]; return v != null ? v : key; }

function applyLang() {
  document.documentElement.setAttribute('lang', lang);
  document.getElementById('lang-label').textContent = lang.toUpperCase();
  document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
}

function applyThemeMode(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('whatshop_theme', mode);
  var sun = document.querySelector('.icon-sun'), moon = document.querySelector('.icon-moon');
  if (sun) sun.style.display = mode === 'dark' ? 'none' : '';
  if (moon) moon.style.display = mode === 'dark' ? '' : 'none';
}

var settings = { store: {} };
var product = null;
var variants = [];
var selectedColor = null;
var selectedSize = null;
var qty = 1;

function parseId() {
  var m = location.search.match(/[?&]id=(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
function variantPrice(v) { return v && v.price != null ? Number(v.price) : Number(product.price || 0); }
function comboStock(color, size) {
  var v = variants.find(function (x) { return x.color === color && x.size === size; });
  return v ? (Number(v.stock) || 0) : 0;
}
function totalStock() {
  if (variants.length) return variants.reduce(function (s, v) { return s + (Number(v.stock) || 0); }, 0);
  return Number(product.stock) || 0;
}

function render() {
  var imgs = [];
  if (Array.isArray(product.images) && product.images.length) imgs = product.images.slice();
  else if (product.image) imgs = [product.image];
  document.getElementById('p-hero').src = imgs[0] || './assets/logos/logoB.png';
  document.getElementById('p-hero').alt = product.name;
  document.getElementById('p-name').textContent = product.name;
  document.getElementById('p-desc').textContent = product.description || '';

  var cat = (window.__store && window.__store.categories.find(function (c) { return c.id === product.category_id; })) || null;
  document.getElementById('p-cat').textContent = cat ? cat.name : '';

  document.getElementById('p-price').textContent = formatPrice(product.price, settings);
  if (product.original_price) {
    document.getElementById('p-was').textContent = formatPrice(product.original_price, settings);
    document.getElementById('p-was').classList.remove('hidden');
    document.getElementById('p-offer-badge').classList.remove('hidden');
  }

  var thumbs = document.getElementById('p-thumbs');
  thumbs.innerHTML = imgs.map(function (u, i) {
    return '<img src="' + u + '" data-i="' + i + '" class="' + (i === 0 ? 'active' : '') + '" alt="" />';
  }).join('');
  thumbs.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('click', function () {
      thumbs.querySelectorAll('img').forEach(function (x) { x.classList.remove('active'); });
      img.classList.add('active');
      document.getElementById('p-hero').src = img.getAttribute('src');
    });
  });

  var colors = [];
  var seen = {};
  variants.forEach(function (v) { if (v.color && !seen[v.color]) { seen[v.color] = 1; colors.push(v); } });
  var colorBox = document.getElementById('p-colors');
  if (colors.length) {
    document.getElementById('p-colors-sec').classList.remove('hidden');
    colorBox.innerHTML = colors.map(function (c) {
      return '<button class="swatch" data-c="' + c.color + '" title="' + c.color + '" style="background:' + (c.color_hex || '#888') + '"></button>';
    }).join('');
    colorBox.querySelectorAll('.swatch').forEach(function (b) {
      b.addEventListener('click', function () {
        selectedColor = b.getAttribute('data-c');
        colorBox.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderSizes();
        updateStock();
      });
    });
  } else {
    document.getElementById('p-colors-sec').classList.add('hidden');
  }
  renderSizes();
  updateStock();
  var bar = document.getElementById('p-bar');
  if (bar) bar.classList.remove('hidden');
}

function renderSizes() {
  var sizes = [];
  var seen = {};
  variants.forEach(function (v) { if (v.size && !seen[v.size]) { seen[v.size] = 1; sizes.push(v.size); } });
  var box = document.getElementById('p-sizes');
  if (!sizes.length) { document.getElementById('p-sizes-sec').classList.add('hidden'); selectedSize = null; return; }
  document.getElementById('p-sizes-sec').classList.remove('hidden');
  box.innerHTML = sizes.map(function (sz) {
    var stock = selectedColor ? comboStock(selectedColor, sz) : null;
    var soldout = selectedColor && stock <= 0;
    return '<button class="size-pill' + (selectedSize === sz ? ' active' : '') + (soldout ? ' soldout' : '') + '" data-sz="' + sz + '"' + (soldout ? ' disabled' : '') + '>' + sz + '</button>';
  }).join('');
  box.querySelectorAll('.size-pill').forEach(function (b) {
    b.addEventListener('click', function () {
      selectedSize = b.getAttribute('data-sz');
      box.querySelectorAll('.size-pill').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      updateStock();
    });
  });
}

function updateStock() {
  var el = document.getElementById('p-stock');
  var canBuy = true;
  var needSel = variants.length > 0 && (!selectedColor || !selectedSize);
  if (needSel) {
    el.textContent = t('sell_variants'); el.classList.remove('out');
    canBuy = false;
  } else {
    var st = variants.length ? comboStock(selectedColor, selectedSize) : totalStock();
    el.textContent = st > 0 ? t('stock_n').replace('{n}', st) : t('out');
    el.classList.toggle('out', st <= 0);
    canBuy = st > 0;
  }
  document.getElementById('btn-add-cart').disabled = !canBuy;
  document.getElementById('btn-buy').disabled = !canBuy;
  updateBar();
}

function updateBar() {
  var sel = document.getElementById('p-bar-sel');
  var price = document.getElementById('p-bar-price');
  if (!sel || !price || !product) return;
  var nm = product.name || '';
  if (variants.length) {
    if (selectedColor && selectedSize) {
      sel.textContent = nm + ' · ' + selectedColor + ' · ' + selectedSize;
    } else if (selectedColor) {
      sel.textContent = nm + ' · ' + selectedColor + ' · ' + t('sell_variants');
    } else {
      sel.textContent = nm + ' · ' + t('sell_variants');
    }
    var v = selectedVariant();
    price.textContent = formatPrice(variantPrice(v), settings);
  } else {
    sel.textContent = nm;
    price.textContent = formatPrice(product.price, settings);
  }
}

function selectedVariant() {
  if (!variants.length) return null;
  return variants.find(function (v) { return v.color === selectedColor && v.size === selectedSize; });
}

function getCartProduct() {
  var imgs = (Array.isArray(product.images) && product.images.length) ? product.images : (product.image ? [product.image] : []);
  return { id: product.id, title: product.name, price: Number(product.price) || 0, image: imgs[0] || null };
}

function addToCartThen(checkout) {
  var cp = getCartProduct();
  if (variants.length) {
    if (!selectedColor || !selectedSize) { toast(t('sell_variants'), 'error'); return; }
    var v = selectedVariant();
    if (!v || (Number(v.stock) || 0) <= 0) { toast(t('out'), 'error'); return; }
    cp.variantPrice = variantPrice(v);
    cp.variantId = v.id;
    CART.addItem(cp, { variantId: v.id, color: v.color, size: v.size, qty: qty });
  } else {
    if (totalStock() <= 0) { toast(t('out'), 'error'); return; }
    CART.addItem(cp, { qty: qty });
  }
  if (checkout) CART.openCheckout();
}

function init() {
  applyLang();
  applyThemeMode(localStorage.getItem('whatshop_theme') === 'dark' ? 'dark' : 'light');
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  CART.wire();

  document.getElementById('lang-toggle').addEventListener('click', function () {
    lang = lang === 'es' ? 'en' : 'es';
    localStorage.setItem('whatshop_lang', lang);
    applyLang();
  });
  document.getElementById('theme-toggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    applyThemeMode(cur === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('cart-open').addEventListener('click', CART.openCart);
  document.getElementById('btn-back').addEventListener('click', function () { window.location.href = './tienda.html'; });
  document.getElementById('qty-dec').addEventListener('click', function () { qty = Math.max(1, qty - 1); document.getElementById('qty-val').textContent = qty; });
  document.getElementById('qty-inc').addEventListener('click', function () { qty += 1; document.getElementById('qty-val').textContent = qty; });
  document.getElementById('btn-add-cart').addEventListener('click', function () { addToCartThen(false); });
  document.getElementById('btn-buy').addEventListener('click', function () { addToCartThen(true); });
  CART.updateBadge();

  var id = parseId();
  if (!id) { document.getElementById('p-loading').textContent = t('not_found'); return; }

  SBStore().then(function (store) {
    settings = store.settings || settings;
    window.__settings = settings;
    window.__store = store;
    applyTheme(settings);
    var name = (settings.store && settings.store.name) || 'WhatShop';
    document.getElementById('brand-name').textContent = name;
    var logo = (settings.landing && settings.landing.logo) || './assets/logos/logoB.png';
    var bl = document.getElementById('brand-logo');
    bl.style.opacity = '0';
    bl.onload = function () { bl.style.opacity = '1'; };
    bl.onerror = function () { bl.src = './assets/logos/logoB.png'; bl.style.opacity = '1'; };
    bl.src = logo;
    document.title = name;
    var all = [];
    (store.categories || []).forEach(function (c) { (c.products || []).forEach(function (p) { all.push(p); }); });
    (store.uncategorized || []).forEach(function (p) { all.push(p); });
    CART.pruneCart(all.map(function (p) { return p.id; }));
    product = all.find(function (p) { return p.id === id; }) || null;
    if (!product) { document.getElementById('p-loading').textContent = t('not_found'); return; }
    variants = (product.product_variants || []).filter(function (v) { return v.color && v.size; });
    if (!variants.length) variants = (product.product_variants || []).slice();
    document.getElementById('p-loading').classList.add('hidden');
    document.getElementById('p-content').classList.remove('hidden');
    render();
  }).catch(function (err) {
    console.error(err);
    document.getElementById('p-loading').textContent = t('not_found');
  });
}

document.addEventListener('DOMContentLoaded', init);