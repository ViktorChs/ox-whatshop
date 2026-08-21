/* Configuracion de Supabase - OX WhatShop */
const SUPABASE_URL = 'https://qfxcnvnjbabikdikftsr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BRvDhGZ0uVwqxP3QL0vcYQ_NMuEAnYs';
const STORAGE_BUCKET = 'images';

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
