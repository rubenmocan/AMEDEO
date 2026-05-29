/* ════════════════════════════════════════════════════════════
   Amedeo — shared application code
   Loaded by every page. Each function is defensive (checks for
   elements) so the same script works on any of the 9 pages.
   ════════════════════════════════════════════════════════════ */

let currentLang = 'ro';

// ── LANGUAGE SWITCHING ────────────────────────────────
function setLang(lang) {
  currentLang = lang;
  try { localStorage.setItem('amedeo-lang', lang); } catch (e) {}
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.lang-btn').forEach(b => { if (b.textContent.toLowerCase() === lang) b.classList.add('active'); });
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = i18n[lang][key];
      else el.textContent = i18n[lang][key];
    }
  });
  document.documentElement.lang = lang;
}

// ── PAGE NAVIGATION (multi-page) ──────────────────────
// In multi-page architecture each tab is its own .html file.
// showPage() exists for backward compatibility with inline onclick handlers.
const PAGE_URLS = {
  home:          'index.html',
  evanghelizare: 'evanghelizare.html',
  recreere:      'recreere.html',
  tabere:        'tabere.html',
  biblic:        'biblic.html',
  misiuni:       'misiuni.html',
  studio:        'studio.html',
  filiale:       'filiale.html',
  alatura:       'alatura.html'
};
function showPage(id) {
  const url = PAGE_URLS[id] || (id + '.html');
  // Preserve the chosen language across pages
  if (window.location.pathname.split('/').pop() === url ||
      (url === 'index.html' && (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')))) {
    // Already on this page — just scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.location.href = url;
}

function isElementInViewport(el) {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}

// ── MOBILE NAV ────────────────────────────────────────
function toggleMobileNav() {
  const mn = document.getElementById('mobile-nav');
  if (mn) mn.classList.toggle('open');
}

// ═══════════════════════════════════════════════════════════
//   FORM SUBMISSION via Google Apps Script
// ═══════════════════════════════════════════════════════════
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdYbOnZPvbuqcXCdC0mQOs5YddzYqox4BJIx2I1fn2F7AlD2B_rhlK8TlkUlIS0eCa/exec';
const FORM_EMAIL        = 'amedeo.oficial@gmail.com';
const STUDIO_FORM_EMAIL = 'rubenmocanstudio@gmail.com';

function encodeFormData(form) {
  // CRITICAL: returns the URLSearchParams OBJECT (not .toString()).
  // When fetch receives a URLSearchParams body, the browser sets
  // Content-Type: application/x-www-form-urlencoded automatically.
  // If we pass a string instead, the browser defaults to text/plain,
  // and Apps Script can't parse form-urlencoded params from text/plain
  // — e.parameter ends up empty and emails arrive blank.
  const fd = new FormData(form);
  const params = new URLSearchParams();
  for (const [k, v] of fd.entries()) params.append(k, v);
  return params;
}

async function submitForm(event) {
  if (event) event.preventDefault();
  const form = document.getElementById('join-form');
  if (!form) return false;
  const langField = document.getElementById('f-lang');
  if (langField) langField.value = currentLang;

  const name = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const city = document.getElementById('f-city').value.trim();

  if (!name || !phone || !city) {
    alert(currentLang === 'ro' ? 'Te rugăm completează numele, telefonul și orașul.' :
          currentLang === 'en' ? 'Please fill in name, phone, and city.' :
          'Bitte Name, Telefon und Stadt ausfüllen.');
    return false;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = currentLang === 'ro' ? 'Se trimite…' :
                            currentLang === 'en' ? 'Sending…' : 'Wird gesendet…';
  }

  try {
    await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: encodeFormData(form) });
    form.style.display = 'none';
    document.getElementById('form-success').style.display = 'block';
    return false;
  } catch (err) {
    console.warn('Apps Script POST failed:', err.message);
    alert(currentLang === 'ro' ? 'A apărut o eroare la trimitere. Te rugăm încearcă din nou sau scrie-ne la ' + FORM_EMAIL :
          currentLang === 'en' ? 'An error occurred while submitting. Please try again or write to ' + FORM_EMAIL :
          'Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie an ' + FORM_EMAIL);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    return false;
  }
}

async function submitStudioForm(event) {
  if (event) event.preventDefault();
  const form = document.getElementById('studio-form');
  if (!form) return false;
  const langField = document.getElementById('s-lang');
  if (langField) langField.value = currentLang;

  const name = document.getElementById('s-name').value.trim();
  const email = document.getElementById('s-email').value.trim();
  const message = document.getElementById('s-message').value.trim();

  if (!name || !email || !message) {
    alert(currentLang === 'ro' ? 'Te rugăm completează numele, emailul și detaliile proiectului.' :
          currentLang === 'en' ? 'Please fill in name, email, and project details.' :
          'Bitte Name, E-Mail und Projektdetails ausfüllen.');
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert(currentLang === 'ro' ? 'Te rugăm introdu o adresă de email validă.' :
          currentLang === 'en' ? 'Please enter a valid email address.' :
          'Bitte gültige E-Mail-Adresse eingeben.');
    return false;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = currentLang === 'ro' ? 'Se trimite…' :
                            currentLang === 'en' ? 'Sending…' : 'Wird gesendet…';
  }

  try {
    await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: encodeFormData(form) });
    form.style.display = 'none';
    document.getElementById('studio-form-success').style.display = 'block';
    return false;
  } catch (err) {
    console.warn('Apps Script POST failed:', err.message);
    alert(currentLang === 'ro' ? 'A apărut o eroare la trimitere. Te rugăm încearcă din nou sau scrie-ne la ' + STUDIO_FORM_EMAIL :
          currentLang === 'en' ? 'An error occurred while submitting. Please try again or write to ' + STUDIO_FORM_EMAIL :
          'Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie an ' + STUDIO_FORM_EMAIL);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    return false;
  }
}

// ── SCROLL REVEAL ─────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

function initReveal() {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── CINEMATIC SCROLL CHOREOGRAPHY ─────────────────────
const easeInOut = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
const clamp01 = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;

function updateCinematic(stage) {
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const stageH = stage.offsetHeight;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const totalScroll = stageH - vh;
  if (totalScroll <= 0) return;
  const p = clamp01(-rect.top / totalScroll);

  const page = stage.closest('.page');
  if (page && page.getAttribute('data-cine-mode') === 'branches') {
    return updateBranchesStage(page, stage, p);
  }

  let introOp = 1, introY = 0;
  if (p > 0.04) {
    const t = clamp01((p - 0.04) / 0.18);
    const e = easeInOut(t);
    introOp = 1 - e;
    introY = -e * 80;
  }

  let hintOp = clamp01(1 - p * 8);

  const smallW = Math.min(vw * 0.42, 560);
  const smallH = smallW * 9 / 16;
  const finalW = Math.min(vw * 0.62, 880);
  const finalH = finalW * 9 / 16;
  const PADDING = 0;
  const availW = vw - PADDING * 2;
  const availH = vh - PADDING * 2;
  const fullW = Math.min(availW, availH * 16 / 9);
  const fullH = fullW * 9 / 16;

  let vidOp = 0, vidW = smallW, vidH = smallH, vidR = 16, vidY = 0;

  if (p < 0.18) {
    vidOp = 0; vidW = smallW; vidH = smallH; vidR = 16;
  } else if (p < 0.32) {
    const t = (p - 0.18) / 0.14;
    vidOp = easeInOut(t);
    vidW = smallW; vidH = smallH; vidR = 16;
  } else if (p < 0.52) {
    const t = (p - 0.32) / 0.20;
    const e = easeInOut(t);
    vidOp = 1;
    vidW = lerp(smallW, fullW, e);
    vidH = lerp(smallH, fullH, e);
    vidR = lerp(16, 0, e);
  } else if (p < 0.62) {
    vidOp = 1; vidW = fullW; vidH = fullH; vidR = 0;
  } else if (p < 0.85) {
    const t = (p - 0.62) / 0.23;
    const e = easeInOut(t);
    vidOp = 1;
    vidW = lerp(fullW, finalW, e);
    vidH = lerp(fullH, finalH, e);
    vidR = lerp(0, 18, e);
    vidY = -e * (vh * 0.04);
  } else {
    vidOp = 1; vidW = finalW; vidH = finalH; vidR = 18;
    vidY = -(vh * 0.04);
    if (p > 0.95) vidOp = clamp01(1 - (p - 0.95) / 0.05);
  }

  let bgOp = 1;
  if (p > 0.88) bgOp = clamp01(1 - (p - 0.88) / 0.12);

  stage.style.setProperty('--cine-intro-op', introOp.toFixed(3));
  stage.style.setProperty('--cine-intro-y', introY.toFixed(1) + 'px');
  stage.style.setProperty('--cine-hint-op', hintOp.toFixed(3));
  stage.style.setProperty('--cine-vid-op', vidOp.toFixed(3));
  stage.style.setProperty('--cine-vid-w', vidW.toFixed(0) + 'px');
  stage.style.setProperty('--cine-vid-h', vidH.toFixed(0) + 'px');
  stage.style.setProperty('--cine-vid-r', vidR.toFixed(1) + 'px');
  stage.style.setProperty('--cine-vid-y', vidY.toFixed(1) + 'px');
  stage.style.setProperty('--cine-bg-op', bgOp.toFixed(3));
}

function updateBranchesStage(page, stage, p) {
  let introOp = 1, introY = 0;
  if (p > 0.05) {
    const t = clamp01((p - 0.05) / 0.18);
    const e = easeInOut(t);
    introOp = 1 - e;
    introY = -e * 80;
  }
  let bgOp = 1;
  const hintOp = clamp01(1 - p * 8);

  stage.style.setProperty('--cine-intro-op', introOp.toFixed(3));
  stage.style.setProperty('--cine-intro-y', introY.toFixed(1) + 'px');
  stage.style.setProperty('--cine-hint-op', hintOp.toFixed(3));
  stage.style.setProperty('--cine-bg-op', bgOp.toFixed(3));

  const mapEl = stage.querySelector('.cine-map');
  if (mapEl) {
    const mapOpacity = p < 0.22 ? 1 : Math.max(0.35, 1 - (p - 0.22) * 0.7);
    mapEl.style.opacity = mapOpacity.toFixed(3);
  }

  const branches = page.querySelectorAll('.fil-branch');
  const windows = [[0.22, 0.45], [0.45, 0.68], [0.68, 0.95]];
  branches.forEach((b, i) => {
    const [lo, hi] = windows[i] || [1, 1];
    const active = p >= lo && p < hi;
    b.classList.toggle('fil-active', active);
  });
}

// ═══════════════════════════════════════════════════════════
//   DOMAINS-SECTION VIDEO AUDIO
// ═══════════════════════════════════════════════════════════
const MAX_VIDEO_VOLUME = 0.85;
let videoAudioEnabled = false;
let videoUserInteracted = false;

function getDomainsVisibility() {
  const section = document.querySelector('.domains-section');
  if (!section) return 0;
  const r = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  return clamp01(visible / vh);
}

function visibilityToVolume(v) {
  if (v < 0.10) return 0;
  if (v > 0.55) return MAX_VIDEO_VOLUME;
  return ((v - 0.10) / 0.45) * MAX_VIDEO_VOLUME;
}

function updateDomainsAudio() {
  const video = document.getElementById('domains-video');
  if (!video) return;
  const v = getDomainsVisibility();
  const targetVol = videoAudioEnabled ? visibilityToVolume(v) : 0;

  if (audioGain) {
    // Web Audio path: short scroll-driven fade (~300ms)
    fadeAudioGainTo(targetVol, 300);
  } else {
    // Fallback for browsers without AudioContext: set video.volume directly
    const curr = video.volume || 0;
    const newVol = curr + (targetVol - curr) * 0.25;
    video.volume = Math.max(0, Math.min(1, newVol));
  }

  if (videoAudioEnabled && v < 0.05) {
    if (!video.muted) video.muted = true;
  } else if (videoAudioEnabled && v >= 0.05) {
    if (video.muted) video.muted = false;
  }
}

// ─── Continuous audio fade loop ────────────────────────
// updateDomainsAudio() only runs on scroll/resize events. On mobile, when
// the user first unmutes audio without scrolling, the volume jumps because
// only one frame of the smooth-approach calc runs. This rAF loop keeps
// ramping the volume toward target until it converges, producing a gentle
// fade-in/out regardless of scroll activity.
let audioFadeRafId = null;
function startAudioFadeLoop() {
  if (audioFadeRafId) cancelAnimationFrame(audioFadeRafId);
  function step() {
    const video = document.getElementById('domains-video');
    if (!video) { audioFadeRafId = null; return; }
    const v = getDomainsVisibility();
    const targetVol = videoAudioEnabled ? visibilityToVolume(v) : 0;
    const curr = video.volume || 0;
    const diff = targetVol - curr;
    // ~6% of remaining distance per frame → smooth fade over ~1s
    video.volume = Math.max(0, Math.min(1, curr + diff * 0.06));
    if (Math.abs(diff) > 0.005) {
      audioFadeRafId = requestAnimationFrame(step);
    } else {
      video.volume = Math.max(0, Math.min(1, targetVol));
      audioFadeRafId = null;
    }
  }
  audioFadeRafId = requestAnimationFrame(step);
}

function toggleVideoAudio() {
  const video = document.getElementById('domains-video');
  const btn = document.getElementById('video-audio-toggle');
  if (!video || !btn) return;
  videoUserInteracted = true;
  videoAudioEnabled = !videoAudioEnabled;
  btn.classList.toggle('muted', !videoAudioEnabled);
  btn.classList.remove('pulse');

  // Initialize Web Audio on first interaction (required user gesture on iOS).
  // If init fails (older browser), we fall back to video.volume in updateDomainsAudio.
  if (!audioCtx) initAudioGraph();

  if (videoAudioEnabled) {
    // Start the video element. With Web Audio, volume is controlled by gain.
    if (!audioGain) video.volume = 0; // fallback path
    video.muted = false;
    const playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(() => {});
    btn.setAttribute('aria-label', 'Dezactivează sunetul video');
    // Smooth fade to target volume over 1.5s
    const v = getDomainsVisibility();
    if (audioGain) fadeAudioGainTo(visibilityToVolume(v), 1500);
    else startAudioFadeLoop();
  } else {
    // Fade out, then mute
    if (audioGain) {
      fadeAudioGainTo(0, 800);
      setTimeout(() => { if (!videoAudioEnabled) video.muted = true; }, 850);
    } else {
      video.muted = true;
      startAudioFadeLoop();
    }
    btn.setAttribute('aria-label', 'Activează sunetul video');
  }
}

let cineTicking = false;
function onScrollCinematic() {
  if (cineTicking) return;
  // ─── Pinch-zoom guard ─────────────────────────────────
  // On iOS Safari, pinch-zoom fires scroll events that fool our parallax
  // math into setting hero-bg opacity near 0 — the photo "vanishes" until
  // the user zooms out. Skip the animation while the user is zoomed in.
  if (window.visualViewport && window.visualViewport.scale > 1.01) return;
  cineTicking = true;
  requestAnimationFrame(() => {
    // Multi-page: each page is its own document. Just pick the .cinematic stage if present.
    const cinematicPage = document.querySelector('.page.cinematic');
    if (cinematicPage) {
      const stage = cinematicPage.querySelector('.cine-stage');
      updateCinematic(stage);
    }
    const heroBg = document.getElementById('hero-bg-photo');
    if (heroBg && heroBg.offsetParent !== null) {
      const y = window.scrollY || window.pageYOffset;
      const vh = window.innerHeight;
      const p = clamp01(y / vh);
      let blur, op, bri;
      if (p < 0.15) {
        blur = 0; op = 1; bri = 0.86;
      } else if (p < 0.70) {
        const t = (p - 0.15) / 0.55;
        const e = easeInOut(t);
        blur = e * 22;
        op = 1 - e * 0.15;
        bri = 0.86 - e * 0.10;
      } else {
        const t = (p - 0.70) / 0.30;
        const e = easeInOut(t);
        blur = 22 + e * 6;
        op = 0.85 * (1 - e);
        bri = 0.76 - e * 0.08;
      }
      heroBg.style.setProperty('--hero-bg-op', op.toFixed(3));
      heroBg.style.setProperty('--hero-blur', blur.toFixed(1) + 'px');
      heroBg.style.setProperty('--hero-bri', bri.toFixed(3));
      const heroContent = heroBg.parentElement.querySelector('.hero-content');
      if (heroContent) {
        const cOp = clamp01(1 - (p - 0.10) / 0.65);
        const cY = -clamp01((p - 0.05) / 0.75) * 40;
        heroContent.style.setProperty('--hero-content-op', cOp.toFixed(3));
        heroContent.style.setProperty('--hero-content-y', cY.toFixed(1) + 'px');
      }
    }
    updateDomainsAudio();
    cineTicking = false;
  });
}

function tryAutoEnableVideoAudio() {
  if (videoUserInteracted) return;
  videoUserInteracted = true;
  const video = document.getElementById('domains-video');
  const btn = document.getElementById('video-audio-toggle');
  if (!video) return;

  // Init Web Audio NOW — this is a real user gesture (scroll/click/touch),
  // which iOS requires for AudioContext to start.
  initAudioGraph();

  videoAudioEnabled = true;
  // Start silent: with Web Audio, gain=0 means silent; with fallback,
  // we set video.volume=0 so the rAF loop can ramp it.
  if (!audioGain) video.volume = 0;
  video.muted = false;
  const playPromise = video.play();
  if (playPromise && playPromise.catch) {
    playPromise.catch(() => {
      video.muted = true;
      videoAudioEnabled = false;
      if (btn) btn.classList.add('muted');
    });
  }
  if (btn) {
    btn.classList.toggle('muted', !videoAudioEnabled);
    btn.classList.remove('pulse');
  }

  // Smooth fade-in over 1.5s
  const v = getDomainsVisibility();
  if (audioGain) fadeAudioGainTo(visibilityToVolume(v), 1500);
  else startAudioFadeLoop();
}

// ═══════════════════════════════════════════════════════════
//   YOUTUBE LIGHTBOX
// ═══════════════════════════════════════════════════════════
function extractYouTubeId(input) {
  if (!input) return '';
  const s = String(input).trim();
  let m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  m = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  m = s.match(/youtube\.com\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return '';
}

let modalOpenScrollY = 0;
let modalScrollListenerActive = false;

function openYouTube(btn) {
  const raw = typeof btn === 'string' ? btn : (btn && btn.getAttribute('data-youtube')) || '';
  if (!raw || raw === 'placeholder' || raw === '') {
    alert(currentLang === 'ro' ? 'Videoclipul pentru această pagină va fi disponibil în curând. Te rugăm revino!' :
          currentLang === 'en' ? 'The video for this page will be available soon. Please check back!' :
          'Das Video für diese Seite ist bald verfügbar. Bitte schauen Sie später wieder vorbei!');
    return;
  }
  const id = extractYouTubeId(raw);
  if (!id) { console.warn('Invalid YouTube URL/ID:', raw); return; }
  const modal = document.getElementById('youtube-modal');
  const iframe = document.getElementById('youtube-iframe');
  if (!modal || !iframe) return;
  iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  modalOpenScrollY = window.scrollY || window.pageYOffset || 0;
  setTimeout(() => {
    if (!modal.classList.contains('open')) return;
    modalScrollListenerActive = true;
    window.addEventListener('scroll', closeYouTubeOnScroll, { passive: true });
    window.addEventListener('wheel',  closeYouTubeOnScroll, { passive: true });
    window.addEventListener('touchmove', closeYouTubeOnScroll, { passive: true });
  }, 250);
}

function closeYouTubeOnScroll() {
  const y = window.scrollY || window.pageYOffset || 0;
  if (Math.abs(y - modalOpenScrollY) < 6) return;
  closeYouTube();
}

function closeYouTube() {
  const modal = document.getElementById('youtube-modal');
  const iframe = document.getElementById('youtube-iframe');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (iframe) iframe.src = '';
  if (modalScrollListenerActive) {
    window.removeEventListener('scroll', closeYouTubeOnScroll);
    window.removeEventListener('wheel',  closeYouTubeOnScroll);
    window.removeEventListener('touchmove', closeYouTubeOnScroll);
    modalScrollListenerActive = false;
  }
}

// ═══════════════════════════════════════════════════════════
//   PHOTO SLIDESHOW (fixed: waits for actual image load events)
// ═══════════════════════════════════════════════════════════
function setupPhotoSlideshows() {
  document.querySelectorAll('.cine-photo-track').forEach(track => {
    const allSlides = Array.from(track.querySelectorAll('.cine-photo-slide'));
    if (allSlides.length === 0) return;
    const container = track.parentElement;
    const dotsContainer = container.querySelector('.cine-photo-dots');

    // Wait for each image's real load/error event instead of a fixed timeout.
    const slidePromises = allSlides.map(img => new Promise(resolve => {
      if (img.complete) {
        resolve(img.naturalWidth > 0 ? img : null);
      } else {
        img.addEventListener('load',  () => resolve(img.naturalWidth > 0 ? img : null), { once: true });
        img.addEventListener('error', () => { img.style.display = 'none'; resolve(null); }, { once: true });
      }
    }));

    Promise.all(slidePromises).then(results => {
      const liveSlides = results.filter(img => img !== null);
      if (liveSlides.length === 0) return;
      container.classList.add('has-slideshow');

      if (dotsContainer) {
        dotsContainer.innerHTML = '';
        liveSlides.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.className = 'cine-photo-dot' + (i === 0 ? ' active' : '');
          dot.type = 'button';
          dot.setAttribute('aria-label', 'Slide ' + (i + 1));
          dot.addEventListener('click', () => goToSlide(i));
          dotsContainer.appendChild(dot);
        });
      }

      liveSlides[0].classList.add('active');
      let current = 0;
      let intervalId = null;

      function goToSlide(target) {
        if (target === current) return;
        liveSlides[current].classList.remove('active');
        current = target;
        liveSlides[current].classList.add('active');
        if (dotsContainer) {
          dotsContainer.querySelectorAll('.cine-photo-dot').forEach((d, i) =>
            d.classList.toggle('active', i === current));
        }
      }
      function next() { goToSlide((current + 1) % liveSlides.length); }

      if (liveSlides.length > 1) intervalId = setInterval(next, 4500);
      container.addEventListener('mouseenter', () => {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
      });
      container.addEventListener('mouseleave', () => {
        if (!intervalId && liveSlides.length > 1) intervalId = setInterval(next, 4500);
      });
    });
  });
}

// YouTube thumbnail preloader
function setupYouTubeThumbnails() {
  document.querySelectorAll('.cine-video-play[data-youtube]').forEach(btn => {
    const id = btn.getAttribute('data-youtube');
    if (!id || id === 'placeholder') return;
    const container = btn.closest('.cine-video');
    if (!container) return;
    if (container.querySelector('.cine-video-thumb')) return;
    const thumb = document.createElement('div');
    thumb.className = 'cine-video-thumb';
    container.insertBefore(thumb, container.firstChild);
    const tryLoad = (url, onFail) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth <= 120 && onFail) { onFail(); return; }
        thumb.style.backgroundImage = 'url(' + url + ')';
        thumb.classList.add('loaded');
        container.classList.add('has-thumbnail');
      };
      img.onerror = () => { if (onFail) onFail(); };
      img.src = url;
    };
    tryLoad(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`, () => {
      tryLoad(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
    });
  });
}

// ═══════════════════════════════════════════════════════════
//   PHOTO LIGHTBOX — full-screen viewer with prev/next nav
//   Used by .photo-gallery on Evanghelizare, Recreere, Tabere,
//   Misiuni, Studio. Built dynamically on first use.
// ═══════════════════════════════════════════════════════════
const lightbox = { items: [], index: 0, root: null, touchStartX: 0, touchStartY: 0 };

function buildLightbox() {
  if (lightbox.root) return lightbox.root;
  const root = document.createElement('div');
  root.className = 'photo-lightbox';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<button class="photo-lightbox-prev" aria-label="Anterioară" type="button">‹</button>' +
    '<div class="photo-lightbox-stage"><img class="photo-lightbox-img" alt=""></div>' +
    '<button class="photo-lightbox-next" aria-label="Următoarea" type="button">›</button>' +
    '<button class="photo-lightbox-close" aria-label="Închide" type="button">✕</button>' +
    '<div class="photo-lightbox-counter">1 / 1</div>' +
    '<div class="photo-lightbox-hint">← →  ESC</div>';
  document.body.appendChild(root);

  // Close on backdrop click (but not on image/buttons)
  root.addEventListener('click', (e) => {
    if (e.target === root || e.target.classList.contains('photo-lightbox-stage')) {
      closeLightbox();
    }
  });
  root.querySelector('.photo-lightbox-close').addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  root.querySelector('.photo-lightbox-prev').addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });
  root.querySelector('.photo-lightbox-next').addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });

  // Touch swipe (mobile + tablet)
  root.addEventListener('touchstart', (e) => {
    lightbox.touchStartX = e.touches[0].clientX;
    lightbox.touchStartY = e.touches[0].clientY;
  }, { passive: true });
  root.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - lightbox.touchStartX;
    const dy = e.changedTouches[0].clientY - lightbox.touchStartY;
    // Horizontal swipe only (ignore mostly-vertical gestures = scroll attempts)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextImage();
      else prevImage();
    }
  }, { passive: true });

  lightbox.root = root;
  return root;
}

function openLightbox(items, startIndex) {
  if (!items || items.length === 0) return;
  buildLightbox();
  lightbox.items = items;
  lightbox.index = Math.max(0, Math.min(startIndex || 0, items.length - 1));
  renderLightbox();
  lightbox.root.classList.add('open');
  lightbox.root.setAttribute('aria-hidden', 'false');
  // Prevent body scrolling while open
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox.root) return;
  lightbox.root.classList.remove('open');
  lightbox.root.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // Release src so memory doesn't pile up
  setTimeout(() => {
    const img = lightbox.root.querySelector('.photo-lightbox-img');
    if (img && !lightbox.root.classList.contains('open')) img.src = '';
  }, 350);
}

function nextImage() {
  if (!lightbox.items.length) return;
  lightbox.index = (lightbox.index + 1) % lightbox.items.length;
  renderLightbox();
}

function prevImage() {
  if (!lightbox.items.length) return;
  lightbox.index = (lightbox.index - 1 + lightbox.items.length) % lightbox.items.length;
  renderLightbox();
}

function renderLightbox() {
  const root = lightbox.root;
  const img = root.querySelector('.photo-lightbox-img');
  const counter = root.querySelector('.photo-lightbox-counter');
  const current = lightbox.items[lightbox.index];
  // Brief fade out, then swap and fade in
  root.classList.add('swap');
  setTimeout(() => {
    img.src = current.src;
    img.alt = current.alt || '';
    counter.textContent = (lightbox.index + 1) + ' / ' + lightbox.items.length;
    requestAnimationFrame(() => root.classList.remove('swap'));
  }, 120);
  // Preload neighbours for snappy navigation
  if (lightbox.items.length > 1) {
    const preload = (i) => {
      const it = lightbox.items[(i + lightbox.items.length) % lightbox.items.length];
      if (it) { const p = new Image(); p.src = it.src; }
    };
    preload(lightbox.index + 1);
    preload(lightbox.index - 1);
  }
}

// ═══════════════════════════════════════════════════════════
//   PHOTO GALLERY — column-masonry layout + lightbox wiring
//   Tiles that fail to load are hidden. Loaded tiles fade in
//   smoothly and become clickable to open the lightbox.
// ═══════════════════════════════════════════════════════════
function setupPhotoGalleries() {
  document.querySelectorAll('.photo-gallery').forEach((gallery) => {
    const tiles = Array.from(gallery.querySelectorAll('.photo-tile'));
    if (tiles.length === 0) return;

    const tilePromises = tiles.map((tile) => new Promise((resolve) => {
      const img = tile.querySelector('.photo-tile-img');
      if (!img) { tile.classList.add('failed'); return resolve(null); }

      const onSuccess = () => {
        tile.classList.add('loaded');
        resolve({ src: img.src, alt: img.alt || '', tile: tile });
      };
      const onFailure = () => {
        tile.classList.add('failed');
        resolve(null);
      };

      if (img.complete) {
        if (img.naturalWidth > 0) onSuccess();
        else onFailure();
      } else {
        img.addEventListener('load', onSuccess, { once: true });
        img.addEventListener('error', onFailure, { once: true });
      }
    }));

    Promise.all(tilePromises).then((results) => {
      const items = results.filter((r) => r !== null);
      if (items.length === 0) return;
      items.forEach((item, idx) => {
        item.tile.addEventListener('click', () => openLightbox(items, idx));
        item.tile.setAttribute('role', 'button');
        item.tile.setAttribute('tabindex', '0');
        item.tile.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(items, idx);
          }
        });
      });
    });
  });
}

// ── Keyboard nav (ESC + arrows for lightbox; ESC also closes YouTube) ──
document.addEventListener('keydown', function(e) {
  // Lightbox takes priority if open
  if (lightbox.root && lightbox.root.classList.contains('open')) {
    if (e.key === 'Escape') { closeLightbox(); return; }
    if (e.key === 'ArrowRight') { nextImage(); return; }
    if (e.key === 'ArrowLeft') { prevImage(); return; }
  }
  // YouTube modal
  if (e.key === 'Escape') {
    const modal = document.getElementById('youtube-modal');
    if (modal && modal.classList.contains('open')) closeYouTube();
  }
});

// ─── IBAN copy ───
function copyIBAN(btn) {
  const iban = btn.getAttribute('data-iban') || '';
  const span = btn.querySelector('.copy-text');
  const original = span ? span.textContent : '';
  const finish = (ok) => {
    if (!span) return;
    btn.classList.toggle('copied', ok);
    span.textContent = ok
      ? (currentLang === 'ro' ? 'Copiat!' : currentLang === 'en' ? 'Copied!' : 'Kopiert!')
      : (currentLang === 'ro' ? 'Eroare' : currentLang === 'en' ? 'Error'   : 'Fehler');
    setTimeout(() => {
      btn.classList.remove('copied');
      span.textContent = original;
    }, 2000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(iban).then(() => finish(true)).catch(() => finish(false));
  } else {
    try {
      const ta = document.createElement('textarea');
      ta.value = iban; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      finish(true);
    } catch (e) { finish(false); }
  }
}

// ═══════════════════════════════════════════════════════════
//   FAST-TAP for iOS — bypasses Safari's "hover-then-tap" behaviour
//   On iOS, elements with :hover styles require TWO taps even with
//   touch-action: manipulation. This handler captures touchend BEFORE
//   iOS's synthetic click delay and fires the onclick immediately.
// ═══════════════════════════════════════════════════════════
function setupFastTaps() {
  if (!('ontouchstart' in window)) return;

  let tx = 0, ty = 0, ttime = 0, tapTarget = null;

  document.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) { tapTarget = null; return; }
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
    ttime = Date.now();
    // Match elements that have an onclick handler — covers nav links,
    // buttons, photo tiles, IBAN copy etc. without naming each selector.
    tapTarget = e.target.closest('a[onclick], button[onclick], [onclick]');
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!tapTarget) return;
    const t = e.touches[0];
    // Cancel if user moved more than 10px — they're scrolling, not tapping
    if (Math.abs(t.clientX - tx) > 10 || Math.abs(t.clientY - ty) > 10) {
      tapTarget = null;
    }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!tapTarget) return;
    const dt = Date.now() - ttime;
    const target = tapTarget;
    tapTarget = null;
    if (dt > 500) return; // long-press, not a tap

    // Skip if the tap is on a native form control — let browser handle them
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    // Skip if it's a form submit button — submitForm logic needs the real submit event
    if (target.type === 'submit') return;

    // Skip lightbox arrows (they have their own touch handlers)
    if (target.closest('.photo-lightbox')) return;

    e.preventDefault(); // Stop the natural synthetic click from firing again

    // Fire the onclick directly
    const onclickAttr = target.getAttribute('onclick');
    if (onclickAttr) {
      try { (new Function('event', onclickAttr)).call(target, e); }
      catch (err) { console.warn('onclick error:', err); }
    } else if (typeof target.click === 'function') {
      target.click();
    }
  }, { passive: false });
}

// ═══════════════════════════════════════════════════════════
//   WEB AUDIO API for fade on iOS — video.volume is read-only on iOS,
//   so we route the video through AudioContext + GainNode. Gain CAN be
//   ramped on iOS, giving us true fade-in/fade-out everywhere.
// ═══════════════════════════════════════════════════════════
let audioCtx = null;
let audioGain = null;
let audioSourceNode = null;

function initAudioGraph() {
  if (audioCtx || !('AudioContext' in window || 'webkitAudioContext' in window)) return false;
  const video = document.getElementById('domains-video');
  if (!video) return false;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    audioSourceNode = audioCtx.createMediaElementSource(video);
    audioGain = audioCtx.createGain();
    audioGain.gain.value = 0; // start silent
    audioSourceNode.connect(audioGain);
    audioGain.connect(audioCtx.destination);
    return true;
  } catch (e) {
    console.warn('Web Audio init failed (continuing without fade):', e.message);
    audioCtx = null;
    return false;
  }
}

function fadeAudioGainTo(targetVol, durationMs) {
  if (!audioCtx || !audioGain) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  const now = audioCtx.currentTime;
  const d = Math.max(0.05, (durationMs || 600) / 1000);
  try {
    audioGain.gain.cancelScheduledValues(now);
    audioGain.gain.setValueAtTime(audioGain.gain.value, now);
    audioGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, targetVol)), now + d);
  } catch (e) { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════
//   FORM TIMESTAMP — bot timing detection
//   Setăm timestamp-ul la încărcarea paginii. Apps Script verifică
//   diff-ul față de Date.now() la submit. Sub 2s = bot (silent drop).
// ═══════════════════════════════════════════════════════════
function setFormTimestamps() {
  const ts = Date.now().toString();
  document.querySelectorAll('input.form-timestamp').forEach((el) => {
    el.value = ts;
  });
}

// ═══════════════════════════════════════════════════════════
//   EMAIL OBFUSCATION — protect against scraper spam bots
//   Static HTML shows "…@…" placeholder; JS rebuilds the real
//   address from data-user + data-domain on page load.
//   Simple regex scrapers that look for `mailto:` or `@gmail.com`
//   get nothing. Real users see the email + clickable mailto link.
//
//   To add a new obfuscated email anywhere in HTML:
//     <a href="#" data-user="username" data-domain="domain.com">…@…</a>
// ═══════════════════════════════════════════════════════════
function unobfuscateEmails() {
  document.querySelectorAll('a[data-user][data-domain]').forEach((a) => {
    const user = a.getAttribute('data-user');
    const domain = a.getAttribute('data-domain');
    if (!user || !domain) return;
    const email = user + '@' + domain;
    a.setAttribute('href', 'mailto:' + email);
    // Only replace text if it's still the placeholder (don't overwrite custom labels)
    if (a.textContent.trim() === '…@…' || a.textContent.trim() === '') {
      a.textContent = email;
    }
  });
}

// Form success hash handler (no longer redirects between pages in multi-page mode)
function handleSuccessHash() {
  const h = window.location.hash;
  if (h === '#join-success') {
    setTimeout(() => {
      const f = document.getElementById('join-form');
      const s = document.getElementById('form-success');
      if (f && s) { f.style.display = 'none'; s.style.display = 'block'; }
    }, 100);
    history.replaceState(null, '', window.location.pathname);
  } else if (h === '#studio-success') {
    setTimeout(() => {
      const f = document.getElementById('studio-form');
      const s = document.getElementById('studio-form-success');
      if (f && s) { f.style.display = 'none'; s.style.display = 'block'; }
    }, 100);
    history.replaceState(null, '', window.location.pathname);
  }
}

// Highlight the current page in the nav bar
function highlightActiveNav() {
  const here = window.location.pathname.split('/').pop() || 'index.html';
  const id = (Object.keys(PAGE_URLS).find(k => PAGE_URLS[k] === here)) || 'home';
  document.querySelectorAll('nav#main-nav .nav-links a, .mobile-nav a').forEach(a => {
    const onclickStr = a.getAttribute('onclick') || '';
    const match = onclickStr.match(/showPage\(['"]([a-z]+)['"]\)/);
    if (match && match[1] === id) a.classList.add('current');
    else a.classList.remove('current');
  });
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initReveal();

  // Restore saved language preference
  let savedLang = 'ro';
  try { savedLang = localStorage.getItem('amedeo-lang') || 'ro'; } catch (e) {}
  if (!['ro', 'en', 'de'].includes(savedLang)) savedLang = 'ro';
  setLang(savedLang);

  highlightActiveNav();
  handleSuccessHash();
  setupYouTubeThumbnails();
  setupPhotoSlideshows();
  setupPhotoGalleries();
  unobfuscateEmails();
  setFormTimestamps();
  setupFastTaps();

  window.addEventListener('scroll', onScrollCinematic, { passive: true });
  window.addEventListener('resize', onScrollCinematic, { passive: true });
  ['scroll', 'click', 'touchstart', 'keydown'].forEach(ev => {
    window.addEventListener(ev, tryAutoEnableVideoAudio, { once: true, passive: true });
  });
  onScrollCinematic();
});
