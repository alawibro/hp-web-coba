/**
 * ==========================================================================
 * Persona 3 Reload - Portfolio Interaction & Animation Engine
 * Vanilla JS, no dependencies.
 *
 *   1.  Configuration & data
 *   2.  State & DOM cache
 *   3.  Media tier, video sources & video lifecycle
 *   4.  Audio engine (Web Audio API, autoplay-policy safe)
 *   5.  Input helpers: pointer type, swipe, keyboard scroll, browser history
 *   6.  Main menu (SVG options)
 *   7.  Page transition engine (WAAPI clip-path ripple)
 *   8.  Pages: registry, open / close, and per-page UI
 *   9.  Menu background video (intro -> loop)
 *   10. Loading screen & entry
 *   11. Keyboard router
 *   12. Initialisation
 *
 * URL parameters (debug / deep links):
 *   ?page=project|skills|about|contact   open a page directly (&tab=<id> for skills)
 *   ?select=0..3                         preselect a menu option
 *   ?skip_loading=1                      skip the loading screen
 *   ?media=lite|full                     force the video quality tier
 * ==========================================================================
 */

// --------------------------------------------------------------------------
// 1. Configuration & Data
// --------------------------------------------------------------------------
/** On touch-only devices, wait for one tap after loading (needed to start audio and video). */
const REQUIRE_TAP_TO_START = true;

const OPTION_COLOR_CLASSES = ["fill-button-1", "fill-button-2", "fill-button-3"];

/**
 * Main menu entries. The order matches the keys of PAGES (section 8).
 * rotation / offset / bannerScale* are the hand-tuned SVG layout of each entry.
 */
const options = [
  { name: "PROJECT", description: "View featured works and projects",    rotation: -20, zIndex: 1, offsetX: -40, offsetY: 25, fontSize: "5.15rem", bannerScaleX: 1.07, bannerScaleY: 3.35 },
  { name: "SKILLS",  description: "View technical abilities and stack",   rotation: -12, zIndex: 2, offsetX: -65, offsetY: 30, fontSize: "4.55rem", bannerScaleX: 0.96, bannerScaleY: 3.05 },
  { name: "ABOUT",   description: "Developer profile and philosophy",     rotation: -4,  zIndex: 3, offsetX: -80, offsetY: 35, fontSize: "4.85rem", bannerScaleX: 1.02, bannerScaleY: 3.25 },
  { name: "CONTACT", description: "Get in touch",                         rotation: 5,   zIndex: 4, offsetX: -85, offsetY: 40, fontSize: "4.65rem", bannerScaleX: 1.04, bannerScaleY: 3.2 }
];

/** PROJECT page cards. `url: "#"` = no link yet (the card only plays its sound). */
const slinkData = [
  { numeral: "I",   title: "P3R PORTFOLIO",      subtitle: "Persona 3 Reload UI & Web Audio Engine",  url: "#" },
  { numeral: "II",  title: "PERSONA 5 PORTO",    subtitle: "Phantom Thieves Comic Showcase",          url: "../porto-persona/index.html" },
  { numeral: "III", title: "P5 FONT GENERATOR",  subtitle: "Ransom Cutout Typography Tool",           url: "../persona5-font/index.html" },
  { numeral: "IV",  title: "AIOS UTBK PLATFORM", subtitle: "Neumorphic SNBT Exam Simulator",          url: "../aios-app/index.html" },
  { numeral: "V",   title: "CREATIX AGENCY",    subtitle: "High-Performance Modern Web Platform",    url: "../web-app/index.html" }
];

const skillTabsList = [
  { id: "frontend",  code: "01", label: "FRONTEND" },
  { id: "backend",   code: "02", label: "BACKEND" },
  { id: "ai",        code: "03", label: "AI & ML" },
  { id: "languages", code: "04", label: "LANGUAGES" }
];

const skillGroupsData = [
  {
    id: "frontend",
    title: "FRONTEND & WEB ENGINEERING",
    skills: [
      { name: "JavaScript / TypeScript", level: 92 },
      { name: "React · Next.js · Vue 3", level: 88 },
      { name: "HTML5 · Modern CSS3 · Tailwind", level: 95 },
      { name: "SvelteKit · State Management", level: 84 },
      { name: "WebGL · Three.js · Canvas", level: 80 },
      { name: "UI/UX Design · Figma Systems", level: 86 }
    ]
  },
  {
    id: "backend",
    title: "BACKEND & CLOUD ARCHITECTURE",
    skills: [
      { name: "Node.js · Express · REST APIs", level: 85 },
      { name: "Python · FastAPI · Django", level: 82 },
      { name: "SQL · PostgreSQL · Supabase", level: 80 },
      { name: "Docker · CI/CD · Cloud Hosting", level: 76 },
      { name: "Git · GitHub · Workflows", level: 90 },
      { name: "WebSockets & Realtime Systems", level: 78 }
    ]
  },
  {
    id: "ai",
    title: "AI & MACHINE LEARNING",
    skills: [
      { name: "Prompt Engineering & Agent Swarms", level: 90 },
      { name: "TensorFlow / PyTorch · Neural Nets", level: 82 },
      { name: "NLP & LLM API Integrations", level: 85 },
      { name: "Computer Vision · MediaPipe", level: 80 },
      { name: "Vector DB & RAG Architecture", level: 84 }
    ]
  },
  {
    id: "languages",
    title: "LANGUAGE PROFICIENCY",
    skills: [
      { name: "Bahasa Indonesia (Native / Fluent)", level: 100 },
      { name: "English (Professional Working Proficiency)", level: 86 },
      { name: "English (Technical & Documentation)", level: 90 },
      { name: "English (Spoken & Conversational)", level: 82 }
    ]
  }
];

// --------------------------------------------------------------------------
// 2. State & DOM Cache
// --------------------------------------------------------------------------
let isLoaded = false;            // loading sequence finished
let isStarted = false;           // the user is inside the experience (menu visible)
let selectedIndex = 0;           // highlighted main-menu option
let activePage = null;           // key of PAGES that is open (or opening), else null
let isWavyTransitionRunning = false;
let selectedSlinkIndex = 0;      // PROJECT page: highlighted card
let currentSkillTab = "frontend";
let selectedContactIndex = 0;    // CONTACT page: highlighted row

// Main menu
const appMain = document.querySelector(".p3r-main");
const bgVideoIntro = document.getElementById("background-video-intro");
const bgVideoLoop = document.getElementById("background-video-loop");
const optionsList = document.getElementById("options-list");
const sideNumber = document.getElementById("side-number");

// PROJECT page
const projectPage = document.getElementById("project-page");
const projectHeader = document.getElementById("project-header");
const slinkBgVideo = document.getElementById("slink-bg-video");
const slinkCardsContainer = document.getElementById("slink-cards-container");
const slinkConfirmBtn = document.getElementById("slink-confirm-btn");
const slinkBackBtn = document.getElementById("slink-back-btn");

// SKILLS page
const skillPage = document.getElementById("skill-page");
const skillHeader = document.getElementById("skill-header");
const skillBgVideo = document.getElementById("skill-bg-video");
const skillTabsNav = document.getElementById("skill-tabs-nav");
const skillsContainer = document.getElementById("p3r-skills-container");
const skillBackBtn = document.getElementById("skill-back-btn");
const skillTabPrevBtn = document.getElementById("skill-tab-prev-btn");
const skillTabNextBtn = document.getElementById("skill-tab-next-btn");

// ABOUT page
const aboutPage = document.getElementById("about-page");
const aboutHeader = document.getElementById("about-header");
const aboutBgVideo = document.getElementById("about-bg-video");
const aboutCard = document.querySelector(".p3r-about-card");
const aboutBackBtn = document.getElementById("about-back-btn");

// CONTACT page
const contactPage = document.getElementById("contact-page");
const contactBgVideo = document.getElementById("contact-bg-video");
const contactBackBtn = document.getElementById("contact-back-btn");
const contactMailRows = document.querySelectorAll(".p3r-mail-row");

// Loading screen
const loadingScreen = document.getElementById("loading-screen");
const loadingTitle = document.getElementById("loading-title");
const loadingTrack = document.getElementById("loading-track");
const loadingBar = document.getElementById("loading-bar");
const loadingPercent = document.getElementById("loading-percent");

// --------------------------------------------------------------------------
// 3. Media Tier, Video Sources & Video Lifecycle
// --------------------------------------------------------------------------
/**
 * "lite"  = 720p / 30fps clips (assets/lite/*): phones, Save-Data, slow networks, low-memory devices.
 * "full"  = original-quality clips (assets/*): everything else.
 * Add ?media=lite or ?media=full to the URL to force a tier (handy for testing).
 */
const MEDIA_TIER = (() => {
  const forced = new URLSearchParams(location.search).get("media");
  if (forced === "lite" || forced === "full") return forced;

  const connection = navigator.connection || {};
  const phoneSized = Math.min(screen.width, screen.height) <= 600;          // CSS px, orientation-proof
  const constrainedNetwork = connection.saveData === true || /^(slow-2g|2g|3g)$/.test(connection.effectiveType || "");
  const lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 2;
  return phoneSized || constrainedNetwork || lowMemory ? "lite" : "full";
})();
document.documentElement.dataset.media = MEDIA_TIER;

const mediaVideos = [bgVideoIntro, bgVideoLoop, slinkBgVideo, skillBgVideo, aboutBgVideo, contactBgVideo].filter(Boolean);

// Sets `src` from data-src / data-src-lite. With preload="none" this costs no bandwidth by itself.
function ensureVideoSource(video) {
  if (video && !video.getAttribute("src")) {
    video.src = (MEDIA_TIER === "lite" && video.dataset.srcLite) || video.dataset.src;
  }
}
mediaVideos.forEach(ensureVideoSource);

// Frees the decoder and buffers of a sub-page clip once its page is closed (matters on phones:
// iOS Safari discards tabs under memory pressure). The source is re-attached on next use.
function releaseVideo(video) {
  if (MEDIA_TIER !== "lite" || !video) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
}

// Starts downloading a page clip ahead of the transition. `intent` = the user is already
// touching / selecting it, so it is worth the bytes even in Save-Data mode.
function warmPageVideo(optionIndex, intent = false) {
  const page = PAGES[PAGE_KEYS[optionIndex]];
  const video = page && page.video;
  if (!video) return;
  if (!intent && navigator.connection && navigator.connection.saveData) return;
  ensureVideoSource(video);
  if (video.preload !== "auto") video.preload = "auto";
}

// Which clip should currently be playing? (used to resume after tab switches / blocked autoplay)
function isVideoWanted(video) {
  if (video === bgVideoIntro) return !hasSwitchedToLoop;
  if (video === bgVideoLoop) return !activePage;
  const screenEl = video.closest(".p3r-slink-screen");
  return !!screenEl && (screenEl.classList.contains("active") || screenEl.classList.contains("circle-transitioning"));
}

// Browsers may refuse autoplay (iOS Low Power Mode, data-saver modes). The poster stays visible,
// and playback is retried on the user's next touch / key press instead of staying frozen.
function armPlayRetry(video) {
  if (!video || video.__retryArmed) return;
  video.__retryArmed = true;
  const events = ["pointerup", "touchend", "keydown"];
  const retry = () => {
    events.forEach((evt) => window.removeEventListener(evt, retry));
    video.__retryArmed = false;
    if (video.paused && isVideoWanted(video)) safePlay(video);
  };
  events.forEach((evt) => window.addEventListener(evt, retry, { passive: true }));
}

function safePlay(video) {
  if (!video) return;
  ensureVideoSource(video);
  const result = video.play();
  if (result && typeof result.catch === "function") {
    result.catch((err) => { if (!err || err.name === "NotAllowedError") armPlayRetry(video); });
  }
}

// Pause every playing clip while the tab is hidden (battery / data / decoder), resume after.
let videosPausedByVisibility = [];
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    videosPausedByVisibility = mediaVideos.filter((v) => !v.paused && !v.ended);
    videosPausedByVisibility.forEach((v) => v.pause());
  } else {
    videosPausedByVisibility.filter(isVideoWanted).forEach(safePlay);
    videosPausedByVisibility = [];
  }
});

// Resolves when the clip can start without stalling, or after maxMs (never blocks start-up).
function waitForVideoReady(video, maxMs) {
  return new Promise((resolve) => {
    if (!video || !video.getAttribute("src") || video.readyState >= 3) return resolve();
    const events = ["canplay", "error"];
    const finish = () => {
      clearTimeout(timer);
      events.forEach((evt) => video.removeEventListener(evt, finish));
      resolve();
    };
    const timer = setTimeout(finish, maxMs);
    events.forEach((evt) => video.addEventListener(evt, finish));
  });
}

// --------------------------------------------------------------------------
// 4. Audio Engine (Web Audio API, autoplay-policy safe)
// --------------------------------------------------------------------------
/**
 * Each sound is played through Web Audio when the context is running (lowest latency) and
 * falls back to the matching <audio> element in index.html otherwise.
 */
const SOUNDS = {
  navigate: { url: "sfx/navigation.wav", fallbackId: "sfx-navigation-el", volume: 0.6,  buffer: null },
  close:    { url: "sfx/close-menu.mp3", fallbackId: "sfx-close-menu-el", volume: 0.75, buffer: null },
  jingle:   { url: "sfx/menu-utama.mp3", fallbackId: "sfx-menu-utama-el", volume: 0.95, buffer: null }
};

let audioCtx = null;
let hasJinglePlayed = false;
let experienceEntryTime = 0;

// The context is created lazily, on first use. Nothing creates it at page load:
// mobile browsers keep a context created outside a user gesture suspended (and Chrome logs an
// autoplay warning). The first real tap / key press goes through unlockAudioEngine() below.
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass({ latencyHint: "interactive" });
      if (audioCtx.addEventListener) audioCtx.addEventListener("statechange", onAudioStateChange);
      decodePendingAudio();
    }
  }
  // "interrupted" is iOS Safari's state after a call / tab switch; it needs a resume() too.
  if (audioCtx && (audioCtx.state === "suspended" || audioCtx.state === "interrupted")) {
    Promise.resolve(audioCtx.resume()).catch(() => {});
  }
  return audioCtx;
}

// Two-phase loading: the files are fetched right away (no AudioContext needed), and decoded as
// soon as a context exists (decodeAudioData works on a suspended context).
const rawAudioData = {};         // sound key -> ArrayBuffer waiting to be decoded
let audioPrefetchPromise = null;

function prefetchAudio() {
  if (!audioPrefetchPromise) {
    audioPrefetchPromise = Promise.all(Object.entries(SOUNDS).map(async ([key, sound]) => {
      try {
        const res = await fetch(sound.url);
        if (res.ok) rawAudioData[key] = await res.arrayBuffer();
      } catch (_) { /* the <audio> fallback still works */ }
    })).then(decodePendingAudio);
  }
  return audioPrefetchPromise;
}

// Promise wrapper that also works with the callback-only decodeAudioData of older Safari.
const decodeAudio = (ctx, data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));

async function decodePendingAudio() {
  if (!audioCtx) return;
  for (const [key, raw] of Object.entries(rawAudioData)) {
    delete rawAudioData[key];
    try { SOUNDS[key].buffer = await decodeAudio(audioCtx, raw); } catch (_) {}
  }
}

// ~100 KB in total: cheap to fetch on every device.
prefetchAudio();

function playSound(sound, onPlaySuccess) {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "running" && sound.buffer) {
    try {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = sound.volume;
      source.buffer = sound.buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
      if (onPlaySuccess) onPlaySuccess();
      return;
    } catch (_) { /* fall through to the <audio> element */ }
  }

  const el = document.getElementById(sound.fallbackId);
  if (!el) return;
  try {
    el.currentTime = 0;
    el.volume = sound.volume;
    const played = el.play();
    if (played !== undefined) {
      played.then(() => { if (onPlaySuccess) onPlaySuccess(); }).catch(() => {});
    }
  } catch (_) {}
}

// Navigation blips only sound once the user is inside the experience.
function playSFX() {
  if (isStarted) playSound(SOUNDS.navigate);
}

function playCloseMenuSFX() {
  playSound(SOUNDS.close);
}

async function playMenuUtamaSFX() {
  if (hasJinglePlayed) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state !== "running") {
    try { await ctx.resume(); } catch (_) {}
  }
  playSound(SOUNDS.jingle, () => { hasJinglePlayed = true; });
}

// Audio unlock. Autoplay policies only accept resume() / start() calls made synchronously inside
// a user gesture (iOS Safari: touchend / click only), so both run before the handler returns.
// Listeners detach once the context is running and re-arm if it is interrupted again.
const AUDIO_UNLOCK_EVENTS = ["pointerup", "touchend", "click", "keydown"];
let audioUnlockArmed = false;

function armAudioUnlock() {
  if (audioUnlockArmed) return;
  audioUnlockArmed = true;
  AUDIO_UNLOCK_EVENTS.forEach((evt) => window.addEventListener(evt, unlockAudioEngine, { capture: true, passive: true }));
}

function disarmAudioUnlock() {
  if (!audioUnlockArmed) return;
  audioUnlockArmed = false;
  AUDIO_UNLOCK_EVENTS.forEach((evt) => window.removeEventListener(evt, unlockAudioEngine, { capture: true }));
}

function onAudioStateChange() {
  if (audioCtx && audioCtx.state === "running") disarmAudioUnlock();
  else armAudioUnlock();
}

function unlockAudioEngine() {
  const ctx = getAudioContext();       // created here, inside the gesture, on first call
  if (ctx) {
    const resumed = Promise.resolve(ctx.resume());
    try {                              // silent 1-sample buffer: finishes the unlock on iOS
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 22050);
      source.connect(ctx.destination);
      source.start(0);
    } catch (_) {}
    resumed.then(() => { if (ctx.state === "running") disarmAudioUnlock(); }).catch(() => {});
  }

  // The entry jingle is only worth playing if the first gesture is close to the entry itself.
  if (isStarted && !hasJinglePlayed) {
    if (Date.now() - experienceEntryTime < 2500) {
      playMenuUtamaSFX();
    } else {
      hasJinglePlayed = true;
    }
  }
}

armAudioUnlock();

// --------------------------------------------------------------------------
// 5. Input Helpers: Pointer Type, Swipe, Keyboard Scroll, Browser History
// --------------------------------------------------------------------------
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

// After a tap, touch browsers synthesise mouse events (mouseenter, then click).
// Remembering the pointer type of the last gesture lets hover handlers ignore
// those synthetic events, so a tap = "click" and a mouse still gets "hover".
let lastPointerType = "mouse";
["pointerdown", "pointermove"].forEach((evt) => {
  window.addEventListener(evt, (e) => { lastPointerType = e.pointerType || "mouse"; }, { capture: true, passive: true });
});
const shouldHandleHover = () => lastPointerType !== "touch";

// iOS Safari only applies :active styles if some touch listener exists on the document.
document.addEventListener("touchstart", () => {}, { passive: true });

/**
 * Minimal swipe detector (touch events, so it keeps working while the browser
 * decides about scrolling). Fires one of left/right/up/down for a quick,
 * mostly-straight drag; slow or diagonal drags are ignored so vertical
 * scrolling inside lists is never hijacked.
 */
function bindSwipe(el, { left, right, up, down }, threshold = 48) {
  if (!el) return;
  let startX = 0, startY = 0, startTime = 0, tracking = false;

  el.addEventListener("touchstart", (e) => {
    tracking = e.touches.length === 1;
    if (!tracking) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  el.addEventListener("touchcancel", () => { tracking = false; }, { passive: true });

  el.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;
    if (Date.now() - startTime > 700) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX >= threshold && absX > absY * 1.6) {
      (dx < 0 ? left : right)?.();
    } else if (absY >= threshold && absY > absX * 1.6) {
      (dy < 0 ? up : down)?.();
    }
  }, { passive: true });
}

// Smooth-scroll a scrollable pane from the keyboard (Skills list, About card on small screens).
function scrollPane(el, direction) {
  if (!el) return;
  el.scrollBy({
    top: direction * Math.max(80, el.clientHeight * 0.4),
    behavior: reducedMotionQuery.matches ? "auto" : "smooth"
  });
}

// Restarts a CSS entrance animation driven by the `.animating` class.
function restartAnimation(el) {
  if (!el) return;
  el.classList.remove("animating");
  void el.offsetWidth;                 // force a reflow so the class re-triggers the animation
  el.classList.add("animating");
}

// Browser history: each page gets one history entry, so the phone's Back
// button / swipe-back closes the page instead of leaving the site.
const pageHistory = { pushed: false, silent: false };

function pushPageState(name) {
  try {
    history.pushState({ p3rPage: name }, "", `#${name}`);
    pageHistory.pushed = true;
  } catch (_) {
    pageHistory.pushed = false; // e.g. sandboxed iframe: degrade to no history integration
  }
}

function popPageState() {
  if (!pageHistory.pushed) return;
  pageHistory.pushed = false;
  pageHistory.silent = true;   // the popstate caused by our own back() must not close anything
  try { history.back(); } catch (_) { pageHistory.silent = false; }
}

function closeActivePage(retries = 8) {
  if (isWavyTransitionRunning) {           // Back pressed mid-transition: retry shortly
    if (retries > 0) setTimeout(() => closeActivePage(retries - 1), 120);
    return;
  }
  if (activePage) closePage(activePage);
}

window.addEventListener("popstate", () => {
  if (pageHistory.silent) { pageHistory.silent = false; return; }
  pageHistory.pushed = false;
  closeActivePage();
  // "Forward" can land on a stale #page entry with nothing open: show a clean URL instead.
  if (history.state && history.state.p3rPage && !activePage) {
    history.replaceState(null, "", location.pathname + location.search);
  }
});

// --------------------------------------------------------------------------
// 6. Main Menu (SVG Options with Mask Inversion)
// --------------------------------------------------------------------------
const selectorPath = "M 24.853754, 93.31573 135.14625, 49.684266 114.14751, 97.331142 Z";
const selectorBackgroundPath = "M 12.7428765,95.50088 144.25712,47.499123 116.75625,95.465764 Z";

let cachedOptionItems = [];

function renderOptions() {
  optionsList.innerHTML = "";
  cachedOptionItems = [];

  options.forEach((opt, index) => {
    const colorClass = OPTION_COLOR_CLASSES[(index + 2) % OPTION_COLOR_CLASSES.length];
    const cleanName = opt.name.replace(/ /g, "");
    const scaleX = (cleanName.length * 0.52 + 1.6) * (opt.bannerScaleX || 1.0);
    const scaleY = opt.bannerScaleY || 3.2;
    const selectorTransform = `translate(-60, -9) rotate(8, 0, 100) scale(${scaleX}, ${scaleY})`;
    const maskId = `selector-mask-${index}`;

    const item = document.createElement("div");
    item.className = `option-item ${index === 0 ? "selected" : ""}`;
    item.id = `option-item-${index}`;
    item.style.zIndex = index === 0 ? 15 : opt.zIndex;

    item.innerHTML = `
      <button
        class="option-hitbox"
        data-index="${index}"
        aria-label="${opt.name}"
        aria-describedby="option-desc-${index}">
      </button>
      <span id="option-desc-${index}" class="visually-hidden">${opt.description}</span>

      <svg
        width="950"
        height="200"
        xmlns="http://www.w3.org/2000/svg"
        class="option-svg"
        aria-hidden="true"
        style="transform: translate(${opt.offsetX}px, ${opt.offsetY}px) rotate(${opt.rotation}deg);"
      >
        <defs>
          <mask
            id="${maskId}"
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="950"
            height="200"
          >
            <rect width="100%" height="100%" fill="black" />
            <g transform="${selectorTransform}" transform-origin="left center">
              <path fill="white" d="${selectorPath}" />
              <path class="pulse-anim" transform-origin="52 100" fill="white" d="${selectorBackgroundPath}" />
            </g>
          </mask>
        </defs>

        <!-- Selector banner (visible when selected) -->
        <g class="selector-group" transform="${selectorTransform}" transform-origin="left center">
          <path class="fill-pink pulse-anim" transform-origin="52 100" d="${selectorBackgroundPath}" />
          <path class="fill-fg" d="${selectorPath}" />
        </g>

        <!-- Base text -->
        <text
          x="150"
          y="122"
          class="option-text base-text ${colorClass}"
          style="font-size: ${opt.fontSize};"
        >
          ${opt.name}
        </text>

        <!-- Red text, masked so it only shows over the white selector -->
        <g class="masked-red-group" mask="url(#${maskId})">
          <text
            x="150"
            y="122"
            class="option-text fill-red"
            style="font-size: ${opt.fontSize};"
          >
            ${opt.name}
          </text>
        </g>
      </svg>
    `;

    const hitbox = item.querySelector(".option-hitbox");

    // Mouse hover and keyboard focus both move the selection; touch uses tap = click only.
    hitbox.addEventListener("mouseenter", () => {
      if (shouldHandleHover()) setIndex(index);
    });
    hitbox.addEventListener("focus", () => setIndex(index));

    // Touch / mouse press: the click (and the page transition) follows within ~100ms, so start
    // fetching the clip now. Counts as intent, hence allowed even in Save-Data mode.
    hitbox.addEventListener("pointerdown", () => warmPageVideo(index, true), { passive: true });

    hitbox.addEventListener("click", (e) => {
      setIndex(index);
      openPage(PAGE_KEYS[index], e);
    });

    optionsList.appendChild(item);
    cachedOptionItems.push(item);
  });
}

function setIndex(index) {
  if (index === selectedIndex && cachedOptionItems.length > 0) return;
  selectedIndex = index;

  playSFX();

  if (sideNumber) {
    sideNumber.textContent = (selectedIndex + 1).toString().padStart(2, "0");
  }

  // Speculatively preload the selected page's video just in time
  warmPageVideo(index);

  cachedOptionItems.forEach((item, idx) => {
    const isSelected = idx === selectedIndex;
    item.classList.toggle("selected", isSelected);
    item.style.zIndex = isSelected ? 15 : options[idx].zIndex;
  });
}

// --------------------------------------------------------------------------
// 7. Page Transition Engine (WAAPI clip-path ripple)
// --------------------------------------------------------------------------
function generateWavyPolygon(
  cx,
  cy,
  r,
  numPoints = 72,
  waves1 = 7,
  amp1 = 0.085,
  waves2 = 14,
  amp2 = 0.035,
  phase = 0.0,
  scaleX = 1.25,
  scaleY = 1.05
) {
  if (r <= 0.5) {
    const pt = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
    return `polygon(${new Array(numPoints).fill(pt).join(", ")})`;
  }
  const points = [];
  const step = (2 * Math.PI) / numPoints;
  for (let i = 0; i < numPoints; i++) {
    const theta = i * step;
    const wave = 1.0 + amp1 * Math.sin(waves1 * theta + phase) + amp2 * Math.cos(waves2 * theta + phase * 1.6);
    const px = cx + r * wave * Math.cos(theta) * scaleX;
    const py = cy + r * wave * Math.sin(theta) * scaleY;
    points.push(`${px.toFixed(1)}px ${py.toFixed(1)}px`);
  }
  return `polygon(${points.join(", ")})`;
}

// Radius that is guaranteed to cover the whole viewport from `origin`.
function calculateTargetRadius(origin) {
  const maxDist = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y)
  );
  return Math.ceil(maxDist * 1.85);
}

// Where the ripple opens from: the click point if there is one, else the option's text, else a fallback.
function getOptionCenter(optionIndex, clickEvent, fallbackXRatio = 0.56, fallbackYRatio = 0.48) {
  if (clickEvent && typeof clickEvent.clientX === "number" && (clickEvent.clientX > 0 || clickEvent.clientY > 0)) {
    return { x: clickEvent.clientX, y: clickEvent.clientY };
  }

  const optionItem = document.getElementById(`option-item-${optionIndex}`);
  if (optionItem) {
    const textEls = optionItem.querySelectorAll(".option-text");
    for (let i = 0; i < textEls.length; i++) {
      const tr = textEls[i].getBoundingClientRect();
      if (tr.width > 0 && tr.height > 0) {
        return { x: tr.left + tr.width * 0.5, y: tr.top + tr.height * 0.5 };
      }
    }
    const ir = optionItem.getBoundingClientRect();
    if (ir.width > 0 && ir.height > 0) {
      return { x: ir.left + ir.width * 0.45, y: ir.top + ir.height * 0.5 };
    }
  }

  return { x: window.innerWidth * fallbackXRatio, y: window.innerHeight * fallbackYRatio };
}

// Where the ripple closes to: the centre of the page's Close button, else a fallback corner.
function getExitOrigin(buttonEl, fallbackX, fallbackY) {
  if (buttonEl) {
    const r = buttonEl.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
    }
  }
  return { x: fallbackX, y: fallbackY };
}

function executeWavyReveal({
  pageEl,
  origin,
  bodyClass,
  videoEl,
  onStart,
  onComplete,
  duration = 520,
  easing = "cubic-bezier(0.2, 1, 0.35, 1)"
}) {
  if (!pageEl) {
    if (bodyClass) document.body.classList.add(bodyClass);
    if (onComplete) onComplete();
    return;
  }

  isWavyTransitionRunning = true;
  if (onStart) onStart();

  // Users who asked the OS for less motion get an (almost) instant reveal.
  const effectiveDuration = reducedMotionQuery.matches ? 1 : duration;

  const targetRadius = calculateTargetRadius(origin);

  pageEl.classList.remove("active");
  pageEl.classList.add("circle-transitioning");
  pageEl.setAttribute("aria-hidden", "false");

  // Pause the menu's background video while a page is displayed (avoids two videos decoding at once)
  if (bgVideoLoop && !bgVideoLoop.paused) {
    bgVideoLoop.pause();
  }

  if (videoEl) {
    ensureVideoSource(videoEl);
    videoEl.currentTime = 0;
    videoEl.muted = true;
    safePlay(videoEl);
  }

  const anim = pageEl.animate([
    {
      clipPath: generateWavyPolygon(origin.x, origin.y, 0, 72, 7, 0.085, 14, 0.035, 0.0, 1.25, 1.05)
    },
    {
      clipPath: generateWavyPolygon(origin.x + 22, origin.y - 12, targetRadius * 0.45, 72, 7, 0.09, 14, 0.035, 1.2, 1.25, 1.05),
      offset: 0.38
    },
    {
      clipPath: generateWavyPolygon(origin.x + 10, origin.y - 5, targetRadius * 0.85, 72, 7, 0.075, 14, 0.025, 2.2, 1.20, 1.05),
      offset: 0.70
    },
    {
      clipPath: generateWavyPolygon(origin.x, origin.y, targetRadius, 72, 7, 0.05, 14, 0.015, 3.4, 1.15, 1.02)
    }
  ], {
    duration: effectiveDuration,
    easing,
    fill: "forwards"
  });

  let settled = false;
  const finish = () => {
    if (settled) return;               // idempotent: finish / cancel / watchdog may all call it
    settled = true;
    clearTimeout(watchdog);
    pageEl.classList.remove("circle-transitioning");
    pageEl.classList.add("active");
    pageEl.style.clipPath = "";
    if (bodyClass) document.body.classList.add(bodyClass);
    try { anim.cancel(); } catch (_) {}
    isWavyTransitionRunning = false;
    if (onComplete) onComplete();
  };
  // Safety net: if the browser drops the finish event (tab hidden, interrupted
  // animation) the UI must never stay locked in "transition running".
  const watchdog = setTimeout(finish, effectiveDuration + 900);
  anim.onfinish = finish;
  anim.oncancel = finish;
}

function executeWavyClose({
  pageEl,
  exitOrigin,
  bodyClass,
  videoEl,
  onComplete,
  duration = 480,
  easing = "cubic-bezier(0.16, 1, 0.3, 1)"
}) {
  playCloseMenuSFX();

  if (!pageEl) {
    if (bodyClass) document.body.classList.remove(bodyClass);
    isWavyTransitionRunning = false;
    return;
  }

  isWavyTransitionRunning = true;
  const effectiveDuration = reducedMotionQuery.matches ? 1 : duration;
  const targetRadius = calculateTargetRadius(exitOrigin);

  if (bodyClass) document.body.classList.remove(bodyClass);

  pageEl.classList.remove("active");
  pageEl.classList.add("circle-transitioning");

  const anim = pageEl.animate([
    {
      clipPath: generateWavyPolygon(exitOrigin.x, exitOrigin.y, targetRadius, 72, 9, 0.07, 18, 0.025, 0.0, 1.15, 1.25)
    },
    {
      clipPath: generateWavyPolygon(exitOrigin.x - 20, exitOrigin.y - 12, targetRadius * 0.80, 72, 9, 0.08, 18, 0.03, 1.0, 1.15, 1.25),
      offset: 0.32
    },
    {
      clipPath: generateWavyPolygon(exitOrigin.x - 28, exitOrigin.y - 18, targetRadius * 0.42, 72, 9, 0.085, 18, 0.03, 2.0, 1.15, 1.25),
      offset: 0.65
    },
    {
      clipPath: generateWavyPolygon(exitOrigin.x, exitOrigin.y, 0, 72, 9, 0.08, 18, 0.025, 3.0, 1.15, 1.25)
    }
  ], {
    duration: effectiveDuration,
    easing,
    fill: "forwards"
  });

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(watchdog);
    pageEl.classList.remove("circle-transitioning", "active");
    pageEl.style.clipPath = "";
    pageEl.setAttribute("aria-hidden", "true");
    if (videoEl) {
      releaseVideo(videoEl);                          // lite tier: free decoder + buffers
      if (MEDIA_TIER !== "lite") videoEl.pause();     // full tier: keep the buffered clip, just pause
    }
    // Resume the menu's background video seamlessly
    if (bgVideoLoop && bgVideoLoop.paused) {
      safePlay(bgVideoLoop);
    }
    try { anim.cancel(); } catch (_) {}
    isWavyTransitionRunning = false;
    if (onComplete) onComplete();
  };
  const watchdog = setTimeout(finish, effectiveDuration + 900);
  anim.onfinish = finish;
  anim.oncancel = finish;
}

// --------------------------------------------------------------------------
// 8. Pages: Registry, Open / Close, and Per-Page UI
// --------------------------------------------------------------------------

// ---- PROJECT: social-link style card list ----
function renderSlinkCards() {
  if (!slinkCardsContainer) return;
  slinkCardsContainer.innerHTML = "";

  slinkData.forEach((item, idx) => {
    const card = document.createElement("button");
    const isActive = idx === selectedSlinkIndex;
    card.className = `slink-card ${isActive ? "active" : ""}`;
    card.id = `slink-card-${idx}`;
    card.setAttribute("role", "tab");
    card.setAttribute("aria-selected", isActive ? "true" : "false");
    card.style.setProperty("--card-idx", idx);

    card.innerHTML = `
      <span class="card-unified-row">
        <span class="card-numeral-box">
          <span class="card-numeral-text">${item.numeral}</span>
        </span>
        <span class="card-main-body">
          <span class="card-title-text">${item.title}</span>
          <span class="card-subtitle-text">${item.subtitle}</span>
          <span class="card-red-accent" aria-hidden="true"></span>
        </span>
      </span>
    `;

    card.addEventListener("mouseenter", () => {
      if (!shouldHandleHover()) return;   // touch: first tap selects, second tap confirms (see click below)
      if (activePage === "project" && !isWavyTransitionRunning && selectedSlinkIndex !== idx) {
        selectSlinkCard(idx);
      }
    });

    card.addEventListener("click", () => {
      if (activePage !== "project" || isWavyTransitionRunning) return;
      if (selectedSlinkIndex !== idx) {
        selectSlinkCard(idx);
      } else {
        confirmSlinkSelection();
      }
    });

    slinkCardsContainer.appendChild(card);
  });
}

function selectSlinkCard(index) {
  selectedSlinkIndex = index;
  document.querySelectorAll(".slink-card").forEach((card, idx) => {
    const isSelected = idx === selectedSlinkIndex;
    card.classList.toggle("active", isSelected);
    card.setAttribute("aria-selected", isSelected ? "true" : "false");
  });
  playSFX();
}

const cycleSlinkCard = (step) => selectSlinkCard((selectedSlinkIndex + step + slinkData.length) % slinkData.length);

function confirmSlinkSelection() {
  const item = slinkData[selectedSlinkIndex];
  playSFX();
  if (item && item.url && item.url !== "#") {
    setTimeout(() => { window.location.href = item.url; }, 200);   // let the sound start first
  }
}

// ---- SKILLS: category tabs + stat bars ----
function renderSkillsTabs() {
  if (!skillTabsNav) return;
  skillTabsNav.innerHTML = "";

  skillTabsList.forEach((tab) => {
    const btn = document.createElement("button");
    const isActive = tab.id === currentSkillTab;
    btn.className = `p3r-skill-tab ${isActive ? "active" : ""}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.innerHTML = `
      <span class="p3r-tab-tag">${tab.code}</span>
      <span class="p3r-tab-label">${tab.label}</span>
    `;

    btn.addEventListener("click", () => {
      if (currentSkillTab !== tab.id) setSkillTab(tab.id);
    });

    skillTabsNav.appendChild(btn);
  });
}

function setSkillTab(tabId) {
  currentSkillTab = tabId;
  playSFX();
  renderSkillsTabs();
  renderSkillStats(currentSkillTab);
}

function cycleSkillTab(step) {
  const currIdx = skillTabsList.findIndex((t) => t.id === currentSkillTab);
  const nextIdx = (currIdx + step + skillTabsList.length) % skillTabsList.length;
  setSkillTab(skillTabsList[nextIdx].id);
}

function renderSkillStats(category = "frontend") {
  if (!skillsContainer) return;
  skillsContainer.innerHTML = "";

  skillGroupsData.filter((g) => g.id === category).forEach((group) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "p3r-skill-group";
    groupDiv.id = `skill-group-${group.id}`;

    const rowsHTML = group.skills.map((skill, idx) => `
      <div class="p3r-stat-row" style="animation-delay: ${idx * 0.06}s;">
        <div class="p3r-stat-name-col">
          <span class="p3r-stat-name">${skill.name}</span>
        </div>
        <div class="p3r-stat-bar-track" role="img" aria-label="Level ${skill.level} of 100">
          <div class="p3r-stat-bar-fill" style="width: ${skill.level}%;">
            <div class="p3r-stat-bar-tip"></div>
          </div>
        </div>
      </div>
    `).join("");

    groupDiv.innerHTML = `
      <div class="p3r-skill-group-header">
        <h3 class="p3r-group-title">${group.title}</h3>
        <div class="p3r-group-line"></div>
      </div>
      <div class="p3r-skill-rows-list">
        ${rowsHTML}
      </div>
    `;

    skillsContainer.appendChild(groupDiv);
  });
}

// ---- CONTACT: mail rows ----
function selectContactRow(index) {
  if (!contactMailRows.length) return;
  selectedContactIndex = Math.max(0, Math.min(index, contactMailRows.length - 1));
  contactMailRows.forEach((row, i) => row.classList.toggle("active", i === selectedContactIndex));
  playSFX();
}

const cycleContactRow = (step) => selectContactRow((selectedContactIndex + step + contactMailRows.length) % contactMailRows.length);

function restartContactPhoneAnimation() {
  const phoneWrap = document.querySelector(".p3r-mail-phone-wrap");
  if (phoneWrap) {
    phoneWrap.style.animation = "none";
    void phoneWrap.offsetWidth;
    phoneWrap.style.animation = "";
  }
}

// ---- Page registry ----
/**
 * One entry per page; the key is also the URL hash (#project, #skills, ...).
 *   optionIndex     main-menu entry that opens it
 *   originFallback  [x, y] viewport ratios for the ripple when the option's position is unknown
 *   exitFallback()  [x, y] in px for the closing ripple when the Close button has no box
 *   onOpen()        render / reset the page UI (runs when the reveal starts)
 *   focusTarget()   element that receives keyboard focus once the page is open
 *   onKey(e, key)   page-specific keys; return true when the key was handled
 */
const bottomRight = () => [window.innerWidth - 120, window.innerHeight - 55];

const PAGES = {
  project: {
    optionIndex: 0,
    el: projectPage,
    header: projectHeader,
    video: slinkBgVideo,
    bodyClass: "project-screen-active",
    backBtn: slinkBackBtn,
    originFallback: [0.62, 0.38],
    exitFallback: bottomRight,
    onOpen() {
      selectedSlinkIndex = 0;
      renderSlinkCards();
      selectSlinkCard(0);
    },
    focusTarget: () => document.querySelector(".slink-card.active"),
    onKey(e, key) {
      if (e.key === "ArrowDown" || key === "s") cycleSlinkCard(1);
      else if (e.key === "ArrowUp" || key === "w") cycleSlinkCard(-1);
      else if (e.key === "Enter" || e.key === " " || key === "a") confirmSlinkSelection();
      else return false;
      return true;
    }
  },

  skills: {
    optionIndex: 1,
    el: skillPage,
    header: skillHeader,
    video: skillBgVideo,
    bodyClass: "skill-screen-active",
    backBtn: skillBackBtn,
    originFallback: [0.60, 0.48],
    exitFallback: bottomRight,
    onOpen() {
      renderSkillsTabs();
      renderSkillStats(currentSkillTab);
    },
    focusTarget: () => skillsContainer,
    onKey(e, key) {
      if (key === "q" || e.key === "ArrowLeft") cycleSkillTab(-1);
      else if (key === "e" || e.key === "ArrowRight") cycleSkillTab(1);
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") scrollPane(skillsContainer, e.key === "ArrowDown" ? 1 : -1);
      else return false;
      return true;
    }
  },

  about: {
    optionIndex: 2,
    el: aboutPage,
    header: aboutHeader,
    video: aboutBgVideo,
    bodyClass: "about-screen-active",
    backBtn: aboutBackBtn,
    originFallback: [0.58, 0.57],
    exitFallback: bottomRight,
    focusTarget: () => aboutCard,
    onKey(e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return false;
      scrollPane(aboutCard, e.key === "ArrowDown" ? 1 : -1);
      return true;
    }
  },

  contact: {
    optionIndex: 3,
    el: contactPage,
    video: contactBgVideo,
    bodyClass: "contact-screen-active",
    backBtn: contactBackBtn,
    originFallback: [0.57, 0.66],
    exitFallback: () => [80, window.innerHeight - 60],
    onOpen() {
      restartContactPhoneAnimation();
      selectContactRow(0);
    },
    focusTarget: () => contactMailRows[0],
    onKey(e, key) {
      if (e.key === "ArrowDown" || key === "s") cycleContactRow(1);
      else if (e.key === "ArrowUp" || key === "w") cycleContactRow(-1);
      else if (e.key === "Enter" || e.key === " ") {
        if (contactMailRows[selectedContactIndex]) contactMailRows[selectedContactIndex].click();
      } else return false;
      return true;
    }
  }
};

const PAGE_KEYS = Object.keys(PAGES);   // index = main-menu option index

// Keyboard focus follows the page: when a page opens from a focused menu option, focus moves into
// the page and returns to that option on close. The menu is `inert` while a page is open, so Tab
// cannot reach the hidden menu.
let focusWasInMenu = false;

function openPage(key, clickEvent) {
  const page = PAGES[key];
  if (!page || activePage || isWavyTransitionRunning) return;

  activePage = key;
  focusWasInMenu = !!appMain && appMain.contains(document.activeElement) && document.activeElement !== document.body;
  if (appMain) appMain.inert = true;
  pushPageState(key);
  playSFX();

  executeWavyReveal({
    pageEl: page.el,
    origin: getOptionCenter(page.optionIndex, clickEvent, ...page.originFallback),
    bodyClass: page.bodyClass,
    videoEl: page.video,
    onStart: () => {
      if (page.onOpen) page.onOpen();
      restartAnimation(page.header);
    },
    onComplete: () => {
      const target = page.focusTarget && page.focusTarget();
      if (focusWasInMenu && activePage === key && target) target.focus({ preventScroll: true });
    }
  });
}

function closePage(key) {
  const page = PAGES[key];
  if (!page || activePage !== key || isWavyTransitionRunning) return;

  activePage = null;
  popPageState();

  executeWavyClose({
    pageEl: page.el,
    exitOrigin: getExitOrigin(page.backBtn, ...page.exitFallback()),
    bodyClass: page.bodyClass,
    videoEl: page.video,
    onComplete: () => {
      if (appMain) appMain.inert = false;
      const hitbox = cachedOptionItems[page.optionIndex]?.querySelector(".option-hitbox");
      if (focusWasInMenu && hitbox) hitbox.focus({ preventScroll: true });
    }
  });
}

// ---- Page controls (HUD buttons, contact hover) ----
if (slinkConfirmBtn) slinkConfirmBtn.addEventListener("click", confirmSlinkSelection);
if (slinkBackBtn) slinkBackBtn.addEventListener("click", () => closePage("project"));
if (skillBackBtn) skillBackBtn.addEventListener("click", () => closePage("skills"));
if (skillTabPrevBtn) skillTabPrevBtn.addEventListener("click", () => cycleSkillTab(-1));
if (skillTabNextBtn) skillTabNextBtn.addEventListener("click", () => cycleSkillTab(1));
if (aboutBackBtn) aboutBackBtn.addEventListener("click", () => closePage("about"));
if (contactBackBtn) contactBackBtn.addEventListener("click", () => closePage("contact"));

contactMailRows.forEach((row, idx) => {
  row.addEventListener("mouseenter", () => {
    if (shouldHandleHover()) selectContactRow(idx);
  });
});

// Touch gestures (mouse and keyboard behaviour is unchanged)
bindSwipe(skillPage, {
  left: () => { if (activePage === "skills" && !isWavyTransitionRunning) cycleSkillTab(1); },
  right: () => { if (activePage === "skills" && !isWavyTransitionRunning) cycleSkillTab(-1); }
});
bindSwipe(projectPage, {
  up: () => { if (activePage === "project" && !isWavyTransitionRunning) cycleSlinkCard(1); },
  down: () => { if (activePage === "project" && !isWavyTransitionRunning) cycleSlinkCard(-1); }
});

// --------------------------------------------------------------------------
// 9. Menu Background Video (Intro -> Loop Seamless Cut)
// --------------------------------------------------------------------------
let hasSwitchedToLoop = false;

function switchToLoopVideo() {
  if (hasSwitchedToLoop) return;
  hasSwitchedToLoop = true;
  if (!bgVideoLoop) return;

  if (bgVideoLoop.preload !== "auto") bgVideoLoop.preload = "auto";
  bgVideoLoop.currentTime = 0;
  const playPromise = bgVideoLoop.play();

  if (playPromise === undefined) {
    if (bgVideoIntro) bgVideoIntro.classList.add("fade-out");
    return;
  }
  playPromise
    .then(() => {
      if (!bgVideoIntro) return;
      bgVideoIntro.classList.add("fade-out");
      setTimeout(() => {
        bgVideoIntro.pause();
        bgVideoIntro.style.display = "none";
      }, 300);
    })
    .catch((err) => {
      console.warn("Loop video playback notice:", err);
      if (bgVideoIntro) bgVideoIntro.classList.add("fade-out");
      armPlayRetry(bgVideoLoop);   // autoplay refused: the poster stays, play on the next touch
    });
}

if (bgVideoIntro) {
  bgVideoIntro.addEventListener("ended", switchToLoopVideo);
  bgVideoIntro.addEventListener("error", switchToLoopVideo);
  bgVideoIntro.addEventListener("timeupdate", () => {
    if (hasSwitchedToLoop || !(bgVideoIntro.duration > 0)) return;
    // 40% in: start buffering the loop clip so the cut is seamless
    if (bgVideoIntro.currentTime >= bgVideoIntro.duration * 0.4 && bgVideoLoop && bgVideoLoop.preload !== "auto") {
      bgVideoLoop.preload = "auto";
    }
    if (bgVideoIntro.currentTime >= bgVideoIntro.duration - 0.08) {
      switchToLoopVideo();
    }
  });
}

// --------------------------------------------------------------------------
// 10. Loading Screen & Entry
// --------------------------------------------------------------------------
let currentProgress = 0;
let targetProgress = 15;

function setProgress(val) {
  targetProgress = Math.min(100, Math.max(targetProgress, Math.round(val)));
}

function updateProgressUI(val) {
  const rounded = Math.min(100, Math.max(0, Math.round(val)));
  if (loadingBar) loadingBar.style.width = `${rounded}%`;
  if (loadingPercent) loadingPercent.textContent = `${rounded}%`;
  if (loadingTrack) loadingTrack.setAttribute("aria-valuenow", rounded);
}

// Eases the displayed percentage towards `targetProgress`; resolves at 100%.
function runProgressTicker() {
  return new Promise((resolve) => {
    function tick() {
      if (currentProgress < targetProgress) {
        const step = Math.max(1, Math.ceil((targetProgress - currentProgress) * 0.35));
        currentProgress = Math.min(targetProgress, currentProgress + step);
        updateProgressUI(currentProgress);
      }

      if (currentProgress >= 100) {
        updateProgressUI(100);
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  });
}

const isTouchOnlyDevice = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;

function waitForTapToStart() {
  return new Promise((resolve) => {
    if (loadingTitle) {
      loadingTitle.textContent = "TAP TO START";   // role="status": announced to screen readers
      loadingTitle.classList.add("is-ready");
    }
    const go = () => {
      window.removeEventListener("click", go);
      window.removeEventListener("keydown", go);
      resolve();
    };
    // "click" and "keydown" are what iOS Safari accepts as activation; the audio unlocker
    // (capture phase on window) has already run by the time this fires.
    window.addEventListener("click", go);
    window.addEventListener("keydown", go);
  });
}

async function startLoadingSequence() {
  const tickerPromise = runProgressTicker();

  [bgVideoIntro, bgVideoLoop].forEach((video) => {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
  });

  // Preload audio, fonts and the intro clip. The clip is awaited for at most 1.5s, so a slow
  // network never traps the user on this screen (and the intro starts without stalling).
  const audioReady = prefetchAudio();
  setProgress(35);
  const introReady = waitForVideoReady(bgVideoIntro, 1500);

  try {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 120))]);
    }
  } catch (_) {}
  setProgress(60);

  await Promise.race([audioReady, new Promise((r) => setTimeout(r, 1500))]);
  setProgress(80);
  await introReady;

  setProgress(100);
  await tickerPromise;
  updateProgressUI(100);
  isLoaded = true;

  await new Promise((r) => setTimeout(r, 60));

  // Touch-only devices cannot start audio (or, in Low Power Mode, video) without a gesture, and
  // loading finishes before anyone has touched the screen. Ask for one tap, then enter: the
  // jingle and the intro clip are then started from inside a real user gesture.
  if (REQUIRE_TAP_TO_START && isTouchOnlyDevice()) {
    await waitForTapToStart();
  } else {
    getAudioContext();   // also tries to resume; a no-op until the first gesture on strict browsers
  }

  enterExperience();
}

function skipLoadingScreen() {
  if (loadingScreen) loadingScreen.style.display = "none";
}

function enterExperience() {
  if (isStarted) return;
  isStarted = true;
  experienceEntryTime = Date.now();

  playMenuUtamaSFX();

  if (loadingScreen) {
    loadingScreen.classList.add("dismissed");
    setTimeout(skipLoadingScreen, 450);
  }

  document.getElementById("menu-column")?.classList.add("menu-entered");
  document.getElementById("menu-profile-header")?.classList.add("menu-entered");

  if (bgVideoIntro) {
    if (bgVideoIntro.preload !== "auto") bgVideoIntro.preload = "auto";
    bgVideoIntro.currentTime = 0;
    bgVideoIntro.muted = true;
    ensureVideoSource(bgVideoIntro);
    const playPromise = bgVideoIntro.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Intro playback notice:", err);
        switchToLoopVideo();
      });
    }
  }
}

// --------------------------------------------------------------------------
// 11. Keyboard Router
// --------------------------------------------------------------------------
const isCloseKey = (key) => key === "escape" || key === "b" || key === "backspace";

document.addEventListener("keydown", (e) => {
  if (!e.key) return;

  if (!isStarted) {
    if (isLoaded || e.key === "Enter" || e.key === " ") enterExperience();
    return;
  }

  // A focused HUD button or link activates natively on Enter / Space.
  if ((e.key === "Enter" || e.key === " ") && e.target.closest?.("button.slink-hud-btn, a[href]")) return;

  const key = e.key.toLowerCase();

  // A page is open: Esc / B / Backspace close it, everything else is page-specific.
  if (activePage) {
    if (isCloseKey(key)) {
      e.preventDefault();
      closePage(activePage);
    } else if (PAGES[activePage].onKey && PAGES[activePage].onKey(e, key)) {
      e.preventDefault();
    }
    return;
  }

  // Main menu
  if (e.key === "ArrowDown" || key === "s") {
    e.preventDefault();
    setIndex((selectedIndex + 1) % options.length);
  } else if (e.key === "ArrowUp" || key === "w") {
    e.preventDefault();
    setIndex((selectedIndex - 1 + options.length) % options.length);
  } else if (e.key === "Enter" || e.key === " " || key === "b") {
    e.preventDefault();
    openPage(PAGE_KEYS[selectedIndex]);
  } else if (e.key === "Escape" || key === "a") {
    playSFX();
  }
});

// --------------------------------------------------------------------------
// 12. Initialisation
// --------------------------------------------------------------------------
renderOptions();

// A leftover "#project" (e.g. returning from an external link) would not match the
// freshly loaded UI state, so start from the clean URL.
if (PAGE_KEYS.map((k) => `#${k}`).includes(location.hash)) {
  history.replaceState(null, "", location.pathname + location.search);
}

const urlParams = new URLSearchParams(window.location.search);
const initialSelect = parseInt(urlParams.get("select"), 10);
setIndex(initialSelect >= 0 && initialSelect < options.length ? initialSelect : 0);

// Public API for debugging, URL parameters and automated tests
window.openProjectPage = (evt) => openPage("project", evt);
window.closeProjectPage = () => closePage("project");
window.openSkillPage = (evt) => openPage("skills", evt);
window.closeSkillPage = () => closePage("skills");
window.openAboutPage = (evt) => openPage("about", evt);
window.closeAboutPage = () => closePage("about");
window.openContactPage = (evt) => openPage("contact", evt);
window.closeContactPage = () => closePage("contact");

// ?page=... aliases (both "skill" and "skills" work)
const PAGE_URL_ALIASES = new Map([["project", "project"], ["skill", "skills"], ["skills", "skills"], ["about", "about"], ["contact", "contact"]]);
const requestedPage = PAGE_URL_ALIASES.get(urlParams.get("page"));

if (requestedPage) {
  skipLoadingScreen();
  isStarted = true;
  isLoaded = true;
  const tabParam = urlParams.get("tab") || urlParams.get("cat");
  if (requestedPage === "skills" && tabParam && skillTabsList.some((t) => t.id === tabParam)) {
    currentSkillTab = tabParam;
  }
  openPage(requestedPage);
} else if (urlParams.get("skip_loading") === "1") {
  skipLoadingScreen();
  enterExperience();
  switchToLoopVideo();
} else {
  startLoadingSequence();
}
