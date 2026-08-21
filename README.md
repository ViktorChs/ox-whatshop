# OX WhatShop

Tienda e-commerce estática (sin registro) con checkout por WhatsApp y panel de administración.

La app es 100% estática: HTML + CSS + JS puro en el navegador. Los datos viven en **Supabase** (Postgres + Storage), por lo que se puede desplegar gratis en **GitHub Pages** sin backend.

## Requisitos

- Cuenta en [Supabase](https://supabase.com) (plan gratuito)
- Repositorio en GitHub para GitHub Pages
- GitHub Pages sirve el contenido de `public/` como raíz del sitio

## 1. Configurar Supabase

1. Crea un proyecto nuevo en Supabase (por ejemplo `ox-whatshop`).
2. Abre **SQL Editor** y ejecuta el contenido completo de `supabase.sql`. Esto crea:
   - Tablas: `settings`, `admin`, `categories`, `products`, `product_variants`, `orders`
   - Políticas RLS (lectura pública + escritura anónima, ver nota de seguridad)
   - Bucket de Storage `images` (público) con políticas de subida/lectura/borrado
   - Datos iniciales: `settings` por defecto y PIN de admin `1234`
3. En el proyecto, ve a **Settings → API** y copia:
   - `Project URL`
   - `anon public key`

4. Abre `public/config.js` y verifica/actualiza:

```js
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY';
const STORAGE_BUCKET = 'images';
```

> La anon key es pública y solo expone lo permitido por RLS. No copies la `service_role key`.

### Cambiar el PIN del admin

El PIN por defecto es `1234`. Para cambiarlo:

1. Calcula el hash SHA-256 del nuevo PIN:

```bash
# Linux / macOS
echo -n "TU_PIN" | sha256sum
# Windows (PowerShell)
$h = [System.Security.Cryptography.SHA256]::Create()
[BitConverter]::ToString($h.ComputeHash([Text.Encoding]::UTF8.GetBytes("TU_PIN"))).Replace("-","").ToLower()
```

2. En SQL Editor de Supabase:

```sql
update public.admin set pin_hash = '<hash-del-paso-1>' where id = 1;
```

El login compara el hash con `crypto.subtle` en el navegador (requiere HTTPS, que GitHub Pages da gratis).

## 2. Desplegar en GitHub Pages

1. Crea un repositorio en GitHub (público o privado).
2. Prepara la rama `gh-pages` (o la rama por defecto) con el contenido de `public/` en la raíz:

```bash
mkdir gh-pages
cp -r public/* gh-pages/
cd gh-pages
git init
git add .
git commit -m "Deploy OX WhatShop"
git branch -M gh-pages
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin gh-pages
```

3. En GitHub: **Settings → Pages** → Source: **Deploy from a branch** → selecciona `gh-pages` y `/ (root)` → Save.

4. Tu tienda queda en `https://TU_USUARIO.github.io/TU_REPO/` y el admin en `.../admin.html`.

> Nota: si el sitio se publica en un subdirectorio (proyecto, no `username.github.io`), las rutas absolutas (`/config.js`, `/css/...`) requieren ajustarse a relativas. Para evitar esto, usa un repositorio `TU_USUARIO.github.io` o configura un dominio personalizado en la raíz.

## 3. Uso

| Ruta | Página |
|---|---|
| `/` | Landing con splash |
| `/tienda.html` | Tienda con catálogo y checkout por WhatsApp |
| `/admin.html` | Panel de administración (PIN) |

### Panel admin

- **Apariencia**: colores, tipografía, marca, degradado de fondo.
- **Tienda**: nombre, WhatsApp, moneda, métodos de pago, banner, logo (sube a Storage).
- **Catálogo**: crear/eliminar categorías y productos. Las imágenes se suben a Storage; si la librería de IA de remoción de fondo no está lista, la imagen original se sube directamente.
- **Pedidos**: historial y cambio de estado (pagado / entregado / cancelado).
- **Analítica**: pedidos, ingresos y más vendidos (calculado en el cliente).
- **Backup**: exportar/importar toda la configuración y catálogo en JSON.

## Estructura

```
public/
  config.js          # URL y anon key de Supabase + bucket
  index.html         # Landing
  tienda.html        # Tienda (catálogo + checkout WhatsApp)
  admin.html         # Panel admin
  js/supabase.js     # Cliente Supabase + helpers (API, Storage, UI)
  js/landing.js      # Lógica del landing
  css/               # Estilos
  assets/logos/      # Logos por defecto
supabase.sql         # Setup de tablas, políticas y Storage
server.js / db.js    # Backend Node legacy (ya no necesario en producción)
```

## Seguridad (importante)

El PIN del admin solo protege la **UI**. Las políticas RLS permiten escritura anónima en tablas (necesario para que el cliente pueda crear pedidos sin login). Si necesitas escritura protegida real, reemplaza las políticas `anon todo *` por políticas con `auth.uid()`/roles y maneja una sesión de Supabase Auth en el admin.

## Desarrollo local

```bash
npx serve public
# o
python -m http.server 8080 --directory public
```

Abre `http://localhost:8080`. `crypto.subtle` funciona en `localhost` (contexto seguro). Para subir imágenes localmente necesitas el proyecto de Supabase configurado y las políticas de Storage activas.