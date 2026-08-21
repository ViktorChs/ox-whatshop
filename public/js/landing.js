/* OX WhatShop - Splash + Landing con renderizado JSON */

(async function init() {
  let store = null;
  try {
    store = await SBStore();
  } catch (e) {
    console.warn('No se pudo cargar la configuracion', e);
  }

  const settings = store?.settings || {};
  window.__settings = settings || {};

  const splashEl = document.getElementById('splash');

  const splash = settings.splash || {};
  const splashBackground = splash.background || '#FFFFFF';
  const splashLogo = splash.logo || './assets/logos/logoB.png';
  const splashWhatColor = splash.whatColor || '#000000';
  const splashShopColor = splash.shopColor || '#16A34A';
  const loadingSeconds = Math.max(1, Number(splash.loadingSeconds) || 1);

  splashEl.style.background = splashBackground;
  document.getElementById('splash-logo').src = splashLogo;
  document.getElementById('splash-what').textContent = splash.whatText || 'What';
  document.getElementById('splash-shop').textContent = splash.shopText || 'Shop';
  document.getElementById('splash-what').style.color = splashWhatColor;
  document.getElementById('splash-shop').style.color = splashShopColor;

  const splashTimeout = setTimeout(function () {
    splashEl.classList.add('fade-out');
    setTimeout(function () {
      splashEl.style.display = 'none';
      showLanding();
    }, 500);
  }, loadingSeconds * 1000);

  window._splashTimeout = splashTimeout;

  try {
    var landing = settings.landing || {};
    var logoEl = document.getElementById('entry-logo');
    if (logoEl && landing.logo) logoEl.src = landing.logo;
    var textEl = document.getElementById('entry-text');
    if (textEl && landing.subtitle) textEl.textContent = landing.subtitle;
  } catch (e) {
    console.error('Error cargando datos de landing', e);
  }
})();

function showLanding() {
  var settings = window.__settings || {};
  document.getElementById('app').classList.remove('hidden');

  var theme = settings.theme || {};
  var root = document.documentElement.style;
  if (theme.background_color) root.setProperty('--color-background', theme.background_color);
  if (theme.text_color) root.setProperty('--color-foreground', theme.text_color);

  var landingConfig = settings.screen;

  var landingCfg = settings.landing || {};
  var entryLogo = landingCfg.logo || (landingConfig && landingConfig.logo) || './assets/logos/logoB.png';
  document.getElementById('entry-logo').src = entryLogo;

  document.getElementById('entry-text').textContent = landingCfg.customText || 'Bienvenido a WhatShop';
  document.getElementById('swap-label').textContent = landingCfg.swipeHint || 'Desliza para entrar';

  var reveals = document.querySelectorAll('.reveal');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  reveals.forEach(function (el, i) {
    el.style.transitionDelay = (i * 100) + 'ms';
    observer.observe(el);
  });

  setupSwap(settings);
  setupCart(settings);
}

function renderComponents(components) {
  var landing = document.querySelector('.landing');
  if (!landing || !components) return;

  components.forEach(function (comp) {
    var el = document.createElement('div');
    el.className = 'reveal';

    var type = comp.type;
    if (type === 'Header') {
      var img = document.createElement('img');
      img.src = './assets/logos/logoB.png';
      img.alt = (comp.children && comp.children[0] && comp.children[0].alt) || '';
      img.style.width = '40px';
      img.style.height = 'auto';
      img.style.marginBottom = '20px';
      el.appendChild(img);
    } else if (type === 'Container') {
      var wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = comp.style.max_width || '280px';
      wrap.style.aspectRatio = comp.style.aspect_ratio || '4/5';
      wrap.style.borderRadius = comp.style.border_radius || '9999px';
      wrap.style.overflow = 'hidden';
      wrap.style.marginBottom = comp.style.margin_bottom || '24px';
      var hero = document.createElement('img');
      hero.src = './assets/logos/logoB.png';
      hero.alt = (comp.children && comp.children[0] && comp.children[0].alt) || '';
      hero.style.width = '100%';
      hero.style.height = '100%';
      hero.style.objectFit = 'cover';
      wrap.appendChild(hero);
      el.appendChild(wrap);
    } else if (type === 'Typography') {
      var p = document.createElement('p');
      p.textContent = comp.content.text || '';
      p.style.fontSize = comp.style.font_size || '40px';
      p.style.fontWeight = comp.style.font_weight || '900';
      p.style.lineHeight = comp.style.line_height || '0.95';
      p.style.textTransform = comp.style.text_transform || 'uppercase';
      p.style.textAlign = comp.style.text_align || 'center';
      p.style.letterSpacing = comp.style.letter_spacing || '-0.02em';
      p.style.marginBottom = comp.style.margin_bottom || '32px';
      el.appendChild(p);
    } else if (type === 'Button') {
      var btn = document.createElement('button');
      btn.style.width = '100%';
      btn.style.height = '56px';
      btn.style.backgroundColor = '#000000';
      btn.style.borderRadius = '9999px';
      btn.style.padding = '0 8px 0 24px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'space-between';
      btn.style.cursor = 'pointer';
      var label = document.createElement('span');
      label.textContent = 'Continue';
      label.style.color = '#FFFFFF';
      label.style.fontSize = '16px';
      label.style.fontWeight = '600';
      var badge = document.createElement('span');
      badge.textContent = '\u2192';
      badge.style.width = '40px';
      badge.style.height = '40px';
      badge.style.backgroundColor = '#FFFFFF';
      badge.style.borderRadius = '50%';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.color = '#000000';
      btn.appendChild(label);
      btn.appendChild(badge);
      el.appendChild(btn);
    }

    landing.appendChild(el);
  });
}

function setupSwap(settings) {
  var track = document.getElementById('swap-track');
  var btn = document.getElementById('entry-btn');
  var go = function () {
    window.location.href = './tienda.html';
  };
  if (track) {
    track.addEventListener('click', go);
    track.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  }
  if (btn) {
    btn.addEventListener('click', go);
  }
}

function setupCart(settings) {
  var cart = JSON.parse(localStorage.getItem('whatshop_cart') || '[]');
  var countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = cart.reduce(function (s, it) { return s + (it.qty || 1); }, 0);
}
