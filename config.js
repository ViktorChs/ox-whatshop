/* Configuracion de Supabase - OX WhatShop */
const SUPABASE_URL = 'https://qfxcnvnjbabikdikftsr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BRvDhGZ0uVwqxP3QL0vcYQ_NMuEAnYs';
const STORAGE_BUCKET = 'images';

/* Analiticas opcionales (Google Analytics 4). Pon tu Measurement ID, p. ej. 'G-XXXXXXXXXX' */
const GA4_ID = '';

/* Auto-limpiar service workers y caché viejos (evita servir versiones corruptas) */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (rs) {
    rs.forEach(function (r) { r.unregister(); });
  });
}
if (window.caches && caches.keys) {
  caches.keys().then(function (keys) {
    keys.forEach(function (k) { caches.delete(k); });
  });
}

/* Cargar GA4 si hay Measurement ID configurado */
(function () {
  if (!GA4_ID) return;
  var g = document.createElement('script');
  g.async = true;
  g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
  document.head.appendChild(g);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA4_ID);
  window.gtag = gtag;
})();

/* Banner de consentimiento de cookies (solo tienda, no admin) */
(function () {
  function initCookieBanner() {
    if (document.body.classList.contains('admin-page')) return;
    if (localStorage.getItem('whatshop_cookies') === 'ok') return;
    var bar = document.createElement('div');
    bar.id = 'cookie-banner';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#111;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:13px;box-shadow:0 -4px 20px rgba(0,0,0,.25)';
    bar.innerHTML = '<span style="flex:1;min-width:200px">Usamos cookies y almacenamiento local para mejorar tu experiencia.</span>' +
      '<span style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="cookie-accept" style="padding:8px 18px;border:none;border-radius:999px;background:#16a34a;color:#fff;font-weight:700;cursor:pointer">Aceptar</button>' +
      '<a href="./cookies.html" style="padding:8px 14px;border-radius:999px;border:1px solid #fff;color:#fff;text-decoration:none;font-weight:600">Más info</a>' +
      '</span>';
    document.body.appendChild(bar);
    document.getElementById('cookie-accept').addEventListener('click', function () {
      localStorage.setItem('whatshop_cookies', 'ok');
      bar.remove();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCookieBanner);
  else initCookieBanner();
})();