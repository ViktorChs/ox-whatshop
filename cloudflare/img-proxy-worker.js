// ============================================================
// WhatShop - Cloudflare Worker: proxy de cache de imagenes
// Opción A del plan: sirve las imagenes publicas del bucket de
// Supabase desde el edge de Cloudflare, cacheandolas para que
// Supabase solo reciba el primer request por imagen (0 egress
// en visitas repetidas).
//
// Desplegar:
//   1) Cuenta Cloudflare > Workers & Pages > Create Worker.
//   2) Pegar este codigo y Deploy.
//   3) Anotar la URL del worker (https://img-<tu-sufijo>.workers.dev).
//   4) En cada config.js de las tiendas setear:
//        window.IMG_CDN = 'https://img-<tu-sufijo>.workers.dev';
//
// Las imagenes se sirven como:
//   https://img-<tu-sufijo>.workers.dev/storage/v1/object/public/images/<path>
//   -> reenvio a  https://qfxcnvnjbabikdikftsr.supabase.co/...
//   -> cache en Cloudflare con Cache-Control inmutable.
// ============================================================

const SUPABASE_STORAGE = 'https://qfxcnvnjbabikdikftsr.supabase.co';
const CACHE_MAX_AGE = 31536000; // 1 año (nombres de archivo inmutables)
const ALLOWED_PREFIX = '/storage/v1/object/public/images/';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1) Solo GET/HEAD y solo imagenes publicas del bucket 'images'.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    if (!path.startsWith(ALLOWED_PREFIX)) {
      return new Response('Not Found', { status: 404 });
    }

    // 2) Cache API (caché por URL completa, ignore query strings vía ignoreSearch).
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    // 3) Miss -> fetch al bucket público de Supabase.
    const originUrl = SUPABASE_STORAGE + path;
    const originRes = await fetch(originUrl, {
      headers: {
        'User-Agent': 'WhatShop-CDN',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    // 4) No cachear errores (para no envenenar la caché).
    if (!originRes.ok) {
      const body = await originRes.clone().text();
      return new Response(body, {
        status: originRes.status,
        statusText: originRes.statusText,
        headers: { 'Content-Type': originRes.headers.get('Content-Type') || 'text/plain' }
      });
    }

    // 5) Reconstruir respuesta con Cache-Control inmutable.
    const resp = new Response(originRes.body, {
      status: originRes.status,
      headers: {
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
        'Content-Type': originRes.headers.get('Content-Type') || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'ETag': originRes.headers.get('ETag') || undefined,
        'X-Served-By': 'whatshop-cdn'
      }
    });

    // 6) Llenar caché de Cloudflare de forma asíncrona.
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));

    return resp;
  }
};