const state = {
  mode: "home",
  audioContext: null,
  tracks: [],
  pixelsPerSecond: 120,
  minPixelsPerSecond: 1,
  maxPixelsPerSecond: 24000,
  playheadTime: 0,
  duration: 0,
  isPlaying: false,
  playbackStartAt: 0,
  playbackOffset: 0,
  renderFrame: 0,
  playbackFrame: 0,
  rulerScrubActive: false,
  rulerScrubResumePlayback: false,
  meta: {
    audioFile: null,
    audioBuffer: null,
    waveformPeaks: null,
    coverFile: null,
    coverDataUrl: null,
    audioStats: null,
    payload: null,
    previewGainDb: 0,
    previewMode: null,
    previewSourceNode: null,
    previewGainNode: null,
    previewStartedAt: 0,
    previewFrame: 0,
    previewOffset: 0,
    previewScrubActive: false,
  },
};

const ZOOM_SLIDER_MAX = 1000;
const DEFAULT_RELEASE_YEAR = String(new Date().getFullYear());
const DEFAULT_ARTIST = "The Ravonix & Voltaris";
const DEFAULT_COPYRIGHT = DEFAULT_ARTIST;
const LOCKED_META_DEFAULTS = {
  artist: DEFAULT_ARTIST,
  "featured-artists": "",
  composer: DEFAULT_ARTIST,
  lyricist: DEFAULT_ARTIST,
  producer: DEFAULT_ARTIST,
  label: DEFAULT_ARTIST,
  year: DEFAULT_RELEASE_YEAR,
  copyright: DEFAULT_ARTIST,
};
const STYLE_PRESETS = {
  "dubstep-tribal": {
    brief: "Dubstep tribal, massive bass ritual, neon cyber drums, ancient tribal percussion, electric drops, futuristic underground rave energy, bright cyan and orange pulse.",
    coverPrompt: "Bright cyber music album cover, square composition, explosive dubstep tribal energy, massive bass shockwaves, glowing tribal symbols, futuristic drums, electric cyan, hot orange, magenta sparks, polished release artwork, high contrast, no readable text.",
  },
  "drumnbass-tribal": {
    brief: "Drumnbass tribal, fast breakbeats, cyber jungle rhythm, tribal drums, metallic percussion, high-speed nocturnal rave, vivid neon motion, electric green and blue atmosphere.",
    coverPrompt: "Bright cyber music album cover, square composition, drum and bass tribal velocity, kinetic breakbeat motion, jungle-tech energy, glowing tribal patterns, neon lime, cyan, deep blue, sharp light streaks, polished release artwork, high contrast, no readable text.",
  },
};
const RANDOM_COVER_PROMPTS = [
  "Square album cover, futuristic music iconography, radiant neon stage lights, chrome speaker forms, bold cyan and crimson, premium electronic artwork, no readable text.",
  "Square music artwork, surreal concert energy, luminous cables floating in dark space, holographic sound waves, vivid emerald and ultraviolet glow, polished release art, no readable text.",
  "Square cover art, brutalist music poster aesthetic, oversized speakers, fractured light beams, sharp black, white and acid orange contrast, editorial graphic feel, no readable text.",
  "Square album cover, glossy 3D music sculpture, liquid metal headphones, glowing equalizer bars, hot pink and electric blue reflections, premium streaming artwork, no readable text.",
  "Square cover art, cyber city rooftop concert mood, laser fog, giant sound system silhouettes, saturated magenta, cyan and amber, cinematic music visual, no readable text.",
  "Square music release artwork, abstract soundwave ribbons, iridescent gradients, translucent glass synth forms, vibrant aqua and sunset orange, high contrast, no readable text.",
  "Square album art, retro-future club flyer style, fluorescent grid, glowing cassette fragments, bold red and cyan energy, stylish music branding aesthetic, no readable text.",
  "Square cover art, celestial audio temple, luminous speakers among stars, golden resonance rings, deep blue and silver palette, epic music visual, no readable text.",
  "Square music artwork, glitch collage aesthetic, fragmented mixer knobs, scanlines, distorted light streaks, toxic lime and cobalt blue, sharp modern release art, no readable text.",
  "Square album cover, luxury nightlife mood, velvet darkness, radiant stage halo, crystalline sound particles, emerald, gold and black palette, premium music artwork, no readable text.",
  "Square cover art, anime-inspired music poster, dynamic motion, luminous headphones, bold sky blue, orange and white highlights, energetic modern artwork, no readable text.",
  "Square music artwork, industrial rave atmosphere, steel textures, sparks, illuminated subwoofers, fiery orange, graphite and teal tones, intense high-contrast cover, no readable text.",
  "Square album art, minimal Swiss-inspired music composition, strong geometry, bold waveform centerpiece, crisp coral, cream and midnight blue palette, clean poster feel, no readable text.",
  "Square cover art, maximalist pop music fantasy, candy neon gradients, mirrored disco forms, explosive color bloom, joyful saturated artwork, no readable text.",
  "Square music release image, underwater sound cathedral, glowing bubbles as notes, deep turquoise and violet light, ethereal cinematic composition, no readable text.",
  "Square album cover, desert festival at night, giant luminous speakers, dust illuminated by lasers, copper, purple and cyan palette, dramatic music artwork, no readable text.",
  "Square cover art, futuristic vinyl shrine, spinning light rings, holographic reflections, black chrome and electric mint palette, sleek premium release visual, no readable text.",
  "Square music artwork, painterly expressionist energy, thick luminous brush strokes shaped like sound waves, scarlet, cobalt and gold, emotional gallery-grade cover, no readable text.",
  "Square album art, dreamy cloud rave scene, floating sound systems, pastel neon sky, pink, blue and lemon glow, surreal music visual, no readable text.",
  "Square cover art, dark mode cyber broadcast studio, giant LED panels, pulse lines, ultraviolet, cyan and silver lighting, high-end music branding image, no readable text.",
];

const META_FIELD_IDS = [
  "meta-title",
  "meta-version",
  "meta-artist",
  "meta-featured-artists",
  "meta-album",
  "meta-release-type",
  "meta-genres",
  "meta-subgenre",
  "meta-mood",
  "meta-language",
  "meta-bpm",
  "meta-key",
  "meta-label",
  "meta-composer",
  "meta-lyricist",
  "meta-producer",
  "meta-isrc",
  "meta-upc",
  "meta-year",
  "meta-copyright",
  "meta-tags",
  "meta-short-description",
  "meta-description",
  "meta-marketing-hook",
  "meta-distribution-notes",
  "meta-style-brief",
];

const elements = {
  views: {
    home: document.querySelector("#home-view"),
    meta: document.querySelector("#meta-view"),
    studio: document.querySelector("#studio-view"),
  },
  openModeButtons: document.querySelectorAll("[data-open-mode]"),
  backHomeButtons: document.querySelectorAll("[data-back-home]"),
  metaAudioInput: document.querySelector("#meta-audio-input"),
  metaCoverInput: document.querySelector("#meta-cover-input"),
  metaAudioName: document.querySelector("#meta-audio-name"),
  metaCoverName: document.querySelector("#meta-cover-name"),
  metaCoverPreview: document.querySelector("#meta-cover-preview"),
  metaCoverEmpty: document.querySelector("#meta-cover-empty"),
  metaAudioStats: document.querySelector("#meta-audio-stats"),
  metaNormalizeEnabled: document.querySelector("#meta-normalize-enabled"),
  metaNormalizeTarget: document.querySelector("#meta-normalize-target"),
  metaNormalizeGain: document.querySelector("#meta-normalize-gain"),
  metaNormalizeGainText: document.querySelector("#meta-normalize-gain-text"),
  metaNormalizeReset: document.querySelector("#meta-normalize-reset"),
  metaNormalizeWaveform: document.querySelector("#meta-normalize-waveform"),
  metaNormalizeEmpty: document.querySelector("#meta-normalize-empty"),
  metaNormalizeCurrent: document.querySelector("#meta-normalize-current"),
  metaNormalizeTargetDisplay: document.querySelector("#meta-normalize-target-display"),
  metaNormalizeGainDisplay: document.querySelector("#meta-normalize-gain-display"),
  metaNormalizeProjected: document.querySelector("#meta-normalize-projected"),
  metaNormalizeNote: document.querySelector("#meta-normalize-note"),
  metaPreviewOriginal: document.querySelector("#meta-preview-original"),
  metaPreviewNormalized: document.querySelector("#meta-preview-normalized"),
  metaPreviewStop: document.querySelector("#meta-preview-stop"),
  metaExplicit: document.querySelector("#meta-explicit"),
  metaStylePreset: document.querySelector("#meta-style-preset"),
  metaAiFill: document.querySelector("#meta-ai-fill"),
  metaAiImage: document.querySelector("#meta-ai-image"),
  metaSendTelegram: document.querySelector("#meta-send-telegram"),
  metaExportAudio: document.querySelector("#meta-export-audio"),
  metaTelegramProgress: document.querySelector("#meta-telegram-progress"),
  metaTelegramProgressFill: document.querySelector("#meta-telegram-progress-fill"),
  metaTelegramProgressText: document.querySelector("#meta-telegram-progress-text"),
  metaStatus: document.querySelector("#meta-status"),
  metaPayloadPreview: document.querySelector("#meta-payload-preview"),
  tracksContainer: document.querySelector("#tracks-container"),
  rulerCanvas: document.querySelector("#ruler-canvas"),
  scrollHost: document.querySelector("#scroll-host"),
  scrollSpacer: document.querySelector("#scroll-spacer"),
  zoomSlider: document.querySelector("#zoom-slider"),
  zoomLabel: document.querySelector("#zoom-label"),
  playheadLabel: document.querySelector("#playhead-label"),
  projectLength: document.querySelector("#project-length"),
  trackCount: document.querySelector("#track-count"),
  addFiles: document.querySelector("#add-files"),
  fileInput: document.querySelector("#file-input"),
  togglePlay: document.querySelector("#toggle-play"),
  pause: document.querySelector("#pause"),
  rewind: document.querySelector("#rewind"),
  zoomIn: document.querySelector("#zoom-in"),
  zoomOut: document.querySelector("#zoom-out"),
  fitAll: document.querySelector("#fit-all"),
  trackTemplate: document.querySelector("#track-template"),
  metaFields: Object.fromEntries(META_FIELD_IDS.map((id) => [id, document.querySelector(`#${id}`)])),
};

function ensureAudioContext() {
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
  }

  return state.audioContext;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMilliseconds = Math.round(safe * 1000);
  const minutes = Math.floor(totalMilliseconds / 60000);
  const remainder = totalMilliseconds % 60000;
  const secs = Math.floor(remainder / 1000);
  const millis = remainder % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function formatDb(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} dB`;
}

function dbToLinear(value) {
  return Math.pow(10, value / 20);
}

function linearToDb(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return -Infinity;
  }

  return 20 * Math.log10(value);
}

function enforceMetaDefaults() {
  for (const [key, value] of Object.entries(LOCKED_META_DEFAULTS)) {
    const field = elements.metaFields[`meta-${key}`];
    if (field) {
      field.value = value;
    }
  }
}

function getStylePresetConfig(presetKey) {
  if (!presetKey || presetKey === "custom") {
    return null;
  }

  return STYLE_PRESETS[presetKey] || null;
}

function applyStylePreset(presetKey, options = {}) {
  const { force = false } = options;
  const preset = getStylePresetConfig(presetKey);
  if (!preset) {
    return;
  }

  const styleBriefField = elements.metaFields["meta-style-brief"];
  if (!styleBriefField) {
    return;
  }

  if (force || !styleBriefField.value.trim() || Object.values(STYLE_PRESETS).some((entry) => entry.brief === styleBriefField.value.trim())) {
    styleBriefField.value = preset.brief;
  }
}

function syncStylePresetFromBrief() {
  const styleBriefField = elements.metaFields["meta-style-brief"];
  if (!styleBriefField || !elements.metaStylePreset) {
    return;
  }

  const currentBrief = styleBriefField.value.trim();
  const matchedPreset = Object.entries(STYLE_PRESETS).find(([, preset]) => preset.brief === currentBrief);
  elements.metaStylePreset.value = matchedPreset ? matchedPreset[0] : "custom";
}

function buildCoverPrompt() {
  const description = elements.metaFields["meta-description"]?.value.trim();
  const styleBrief = elements.metaFields["meta-style-brief"]?.value.trim();
  const randomBasePrompt = RANDOM_COVER_PROMPTS[Math.floor(Math.random() * RANDOM_COVER_PROMPTS.length)];

  const parts = [
    randomBasePrompt,
    "Bright, luminous, premium album art. Avoid dark, gloomy, muddy, black-dominant, low-energy scenes.",
    "No text, no letters, no words, no logo, no watermark, no typography of any kind.",
    styleBrief ? `Style brief: ${styleBrief}.` : "",
    description ? `Mood and scene: ${description}.` : "",
  ];

  return parts.filter(Boolean).join(" ");
}

function getNormalizationSettings() {
  const targetPeakDb = Number(elements.metaNormalizeTarget?.value || -1);
  const gainDb = Number(elements.metaNormalizeGain?.value || 0);
  const enabled = Boolean(elements.metaNormalizeEnabled?.checked);
  const currentPeakDb = state.meta.audioStats?.peakDb ?? -Infinity;
  const currentPeakLinear = state.meta.audioStats?.peak ?? 0;
  const appliedGainDb = enabled ? gainDb : 0;
  const projectedPeakLinear = Math.min(1, currentPeakLinear * dbToLinear(appliedGainDb));
  const projectedPeakDb = linearToDb(projectedPeakLinear);
  const overshootDb = currentPeakDb + gainDb > 0 ? currentPeakDb + gainDb : null;

  return {
    enabled,
    targetPeakDb,
    gainDb,
    appliedGainDb,
    currentPeakDb,
    currentPeakLinear,
    projectedPeakDb,
    projectedPeakLinear,
    clipped: currentPeakLinear * dbToLinear(appliedGainDb) > 1,
    suggestedGainDb: state.meta.audioStats?.suggestedGainDb ?? 0,
    overshootDb,
  };
}

function setNormalizeGain(value, options = {}) {
  const { silent = false } = options;
  const safeValue = clamp(Number(value), -6, 18);
  state.meta.previewGainDb = safeValue;
  if (elements.metaNormalizeGain) {
    elements.metaNormalizeGain.value = safeValue.toFixed(1);
  }
  if (!silent) {
    updateNormalizationUi();
    updateMetaPayloadPreview("Normalization gain updated.");
  }
}

function drawMetaWaveform() {
  const canvas = elements.metaNormalizeWaveform;
  if (!canvas) {
    return;
  }

  const { width, height } = resizeCanvas(canvas, 220);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const buffer = state.meta.audioBuffer;
  const peakLevels = state.meta.waveformPeaks;
  if (!buffer || !peakLevels?.length) {
    return;
  }

  const settings = getNormalizationSettings();
  const midY = height / 2;
  const usableHeight = height * 0.38;
  const samplesPerPixel = buffer.length / Math.max(1, width);
  const level = choosePeakLevel({ peakLevels }, samplesPerPixel);
  const gainLinear = dbToLinear(settings.appliedGainDb);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(width, midY);
  ctx.stroke();

  ctx.fillStyle = "rgba(109, 208, 255, 0.34)";
  for (let x = 0; x < width; x += 1) {
    const startSample = Math.floor(x * samplesPerPixel);
    const endSample = Math.min(buffer.length, Math.ceil((x + 1) * samplesPerPixel));
    const startBlock = Math.floor(startSample / level.blockSize);
    const endBlock = Math.max(startBlock + 1, Math.ceil(endSample / level.blockSize));
    let localMin = 1;
    let localMax = -1;

    for (let blockIndex = startBlock; blockIndex < endBlock; blockIndex += 1) {
      localMin = Math.min(localMin, level.min[blockIndex] ?? localMin);
      localMax = Math.max(localMax, level.max[blockIndex] ?? localMax);
    }

    const y = midY - localMax * usableHeight;
    const barHeight = Math.max(1, (localMax - localMin) * usableHeight);
    ctx.fillRect(x, y, 1, barHeight);
  }

  ctx.fillStyle = settings.clipped ? "rgba(255, 145, 89, 0.7)" : "rgba(159, 255, 154, 0.62)";
  for (let x = 0; x < width; x += 1) {
    const startSample = Math.floor(x * samplesPerPixel);
    const endSample = Math.min(buffer.length, Math.ceil((x + 1) * samplesPerPixel));
    const startBlock = Math.floor(startSample / level.blockSize);
    const endBlock = Math.max(startBlock + 1, Math.ceil(endSample / level.blockSize));
    let localMin = 1;
    let localMax = -1;

    for (let blockIndex = startBlock; blockIndex < endBlock; blockIndex += 1) {
      localMin = Math.min(localMin, level.min[blockIndex] ?? localMin);
      localMax = Math.max(localMax, level.max[blockIndex] ?? localMax);
    }

    const normalizedMin = clamp(localMin * gainLinear, -1, 1);
    const normalizedMax = clamp(localMax * gainLinear, -1, 1);
    const y = midY - normalizedMax * usableHeight;
    const barHeight = Math.max(1, (normalizedMax - normalizedMin) * usableHeight);
    ctx.fillRect(x, y, 1, barHeight);
  }

  const previewTime = getMetaPreviewTime();
  if (buffer.duration > 0) {
    const playheadX = (previewTime / buffer.duration) * width;
    ctx.strokeStyle = "rgba(255, 145, 89, 0.96)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function getMetaPreviewTime() {
  if (!state.meta.audioBuffer) {
    return 0;
  }

  if (!state.meta.previewMode || !state.audioContext) {
    return clamp(state.meta.previewOffset, 0, state.meta.audioBuffer.duration);
  }

  const elapsed = Math.max(0, state.audioContext.currentTime - state.meta.previewStartedAt);
  return clamp(state.meta.previewOffset + elapsed, 0, state.meta.audioBuffer.duration);
}

function stopMetaPreview(options = {}) {
  const { preserveOffset = true } = options;
  if (preserveOffset && state.meta.audioBuffer) {
    state.meta.previewOffset = getMetaPreviewTime();
  }

  if (state.meta.previewSourceNode) {
    try {
      state.meta.previewSourceNode.stop();
    } catch (_error) {
      // No-op if already stopped.
    }
  }

  state.meta.previewSourceNode = null;
  state.meta.previewGainNode = null;
  state.meta.previewMode = null;
  cancelAnimationFrame(state.meta.previewFrame);
  state.meta.previewFrame = 0;
  drawMetaWaveform();
}

function tickMetaPreview() {
  if (!state.meta.previewMode || !state.audioContext || !state.meta.audioBuffer) {
    return;
  }

  const previewTime = getMetaPreviewTime();
  if (previewTime >= state.meta.audioBuffer.duration) {
    state.meta.previewOffset = state.meta.audioBuffer.duration;
    stopMetaPreview({ preserveOffset: true });
    return;
  }

  drawMetaWaveform();
  state.meta.previewFrame = requestAnimationFrame(tickMetaPreview);
}

async function startMetaPreview(mode, startAt = state.meta.previewOffset) {
  if (!state.meta.audioBuffer) {
    elements.metaStatus.textContent = "Спочатку завантаж аудіо для preview нормалізації.";
    return;
  }

  const audioContext = ensureAudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  stopMetaPreview({ preserveOffset: false });

  const sourceNode = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  const settings = getNormalizationSettings();
  const gainDb = mode === "normalized" ? settings.appliedGainDb : 0;
  const offset = clamp(startAt, 0, state.meta.audioBuffer.duration);

  sourceNode.buffer = state.meta.audioBuffer;
  gainNode.gain.value = dbToLinear(gainDb);
  sourceNode.connect(gainNode);
  gainNode.connect(audioContext.destination);
  sourceNode.start(0, offset);

  state.meta.previewSourceNode = sourceNode;
  state.meta.previewGainNode = gainNode;
  state.meta.previewMode = mode;
  state.meta.previewStartedAt = audioContext.currentTime;
  state.meta.previewOffset = offset;

  sourceNode.onended = () => {
    if (state.meta.previewSourceNode === sourceNode) {
      state.meta.previewOffset = state.meta.audioBuffer?.duration || 0;
      stopMetaPreview({ preserveOffset: true });
    }
  };

  drawMetaWaveform();
  tickMetaPreview();
}

function syncLiveNormalizationPreview() {
  if (!state.meta.previewGainNode || !state.audioContext) {
    return;
  }

  const settings = getNormalizationSettings();
  const nextGainDb = settings.appliedGainDb;
  const nextGainLinear = dbToLinear(nextGainDb);
  const now = state.audioContext.currentTime;

  state.meta.previewGainNode.gain.cancelScheduledValues(now);
  state.meta.previewGainNode.gain.setValueAtTime(state.meta.previewGainNode.gain.value, now);
  state.meta.previewGainNode.gain.linearRampToValueAtTime(nextGainLinear, now + 0.04);
}

function shouldCaptureSpaceShortcut(event) {
  const isEditingField = event.target instanceof HTMLInputElement
    || event.target instanceof HTMLTextAreaElement
    || event.target instanceof HTMLSelectElement
    || Boolean(event.target instanceof HTMLElement && event.target.isContentEditable);

  if (isEditingField) {
    return false;
  }

  return state.mode === "studio" || state.mode === "meta";
}

function handleSpaceShortcut(event) {
  if (!shouldCaptureSpaceShortcut(event)) {
    return;
  }

  event.preventDefault();

  if (state.mode === "studio") {
    togglePlayback();
    return;
  }

  if (state.mode === "meta" && state.meta.audioBuffer) {
    if (state.meta.previewMode) {
      stopMetaPreview();
    } else {
      startMetaPreview("normalized");
    }
  }
}

function updateNormalizationUi() {
  const hasAudio = Boolean(state.meta.audioBuffer && state.meta.audioStats);
  elements.metaNormalizeEmpty?.classList.toggle("is-hidden", hasAudio);

  const settings = getNormalizationSettings();
  if (elements.metaNormalizeGainText) {
    elements.metaNormalizeGainText.textContent = formatDb(settings.gainDb);
  }
  if (elements.metaNormalizeCurrent) {
    elements.metaNormalizeCurrent.textContent = hasAudio ? formatDb(settings.currentPeakDb) : "-";
  }
  if (elements.metaNormalizeTargetDisplay) {
    elements.metaNormalizeTargetDisplay.textContent = formatDb(settings.targetPeakDb);
  }
  if (elements.metaNormalizeGainDisplay) {
    elements.metaNormalizeGainDisplay.textContent = formatDb(settings.appliedGainDb);
  }
  if (elements.metaNormalizeProjected) {
    elements.metaNormalizeProjected.textContent = hasAudio ? formatDb(settings.projectedPeakDb) : "-";
  }
  if (elements.metaNormalizeNote) {
    if (!hasAudio) {
      elements.metaNormalizeNote.textContent = "Поточний preview покаже, наскільки треба підняти трек до target peak.";
    } else if (settings.clipped) {
      elements.metaNormalizeNote.textContent = `Після підсилення очікується кліппінг. Зменш gain або натисни Match target peak (${formatDb(settings.suggestedGainDb)}).`;
    } else if (!settings.enabled) {
      elements.metaNormalizeNote.textContent = `Нормалізація вимкнена. Поточний suggested gain до ${formatDb(settings.targetPeakDb)}: ${formatDb(settings.suggestedGainDb)}.`;
    } else {
      elements.metaNormalizeNote.textContent = `Peak зараз ${formatDb(settings.currentPeakDb)}. Після підсилення на ${formatDb(settings.gainDb)} отримаєш приблизно ${formatDb(settings.projectedPeakDb)}.`;
    }
  }

  syncLiveNormalizationPreview();
  drawMetaWaveform();
}

function getMetaTimeFromPointer(event) {
  const canvas = elements.metaNormalizeWaveform;
  const buffer = state.meta.audioBuffer;
  if (!canvas || !buffer) {
    return 0;
  }

  const rect = canvas.getBoundingClientRect();
  const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  return ratio * buffer.duration;
}

function seekMetaPreview(time) {
  if (!state.meta.audioBuffer) {
    return;
  }

  const nextTime = clamp(time, 0, state.meta.audioBuffer.duration);
  const activeMode = state.meta.previewMode;
  state.meta.previewOffset = nextTime;
  elements.metaStatus.textContent = `Preview jump: ${formatTime(nextTime)}`;
  drawMetaWaveform();

  if (activeMode) {
    startMetaPreview(activeMode, nextTime);
  }
}

function beginMetaWaveformScrub(event) {
  if (!state.meta.audioBuffer || !elements.metaNormalizeWaveform) {
    return;
  }

  state.meta.previewScrubActive = true;
  elements.metaNormalizeWaveform.setPointerCapture(event.pointerId);
  seekMetaPreview(getMetaTimeFromPointer(event));
}

function updateMetaWaveformScrub(event) {
  if (!state.meta.previewScrubActive) {
    return;
  }

  seekMetaPreview(getMetaTimeFromPointer(event));
}

function endMetaWaveformScrub(event) {
  if (!state.meta.previewScrubActive || !elements.metaNormalizeWaveform) {
    return;
  }

  if (event && elements.metaNormalizeWaveform.hasPointerCapture(event.pointerId)) {
    elements.metaNormalizeWaveform.releasePointerCapture(event.pointerId);
  }

  state.meta.previewScrubActive = false;
}

function switchMode(mode) {
  state.mode = mode;
  Object.entries(elements.views).forEach(([key, view]) => {
    view.classList.toggle("is-active", key === mode);
  });

  if (mode === "studio") {
    requestRender();
  }
}

function zoomToSliderValue(zoom) {
  const minLog = Math.log(state.minPixelsPerSecond);
  const maxLog = Math.log(state.maxPixelsPerSecond);
  const safeZoom = clamp(zoom, state.minPixelsPerSecond, state.maxPixelsPerSecond);
  const ratio = (Math.log(safeZoom) - minLog) / (maxLog - minLog);
  return String(Math.round(ratio * ZOOM_SLIDER_MAX));
}

function sliderValueToZoom(value) {
  const minLog = Math.log(state.minPixelsPerSecond);
  const maxLog = Math.log(state.maxPixelsPerSecond);
  const ratio = clamp(Number(value), 0, ZOOM_SLIDER_MAX) / ZOOM_SLIDER_MAX;
  return Math.exp(minLog + ratio * (maxLog - minLog));
}

function resizeCanvas(canvas, cssHeight) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return { dpr, width, height };
}

function getViewportWidth() {
  const stage = elements.rulerCanvas.parentElement;
  return stage ? stage.clientWidth : window.innerWidth;
}

function getVisibleTimeRange() {
  const viewportWidth = getViewportWidth();
  const scrollLeft = elements.scrollHost.scrollLeft;
  return {
    viewportWidth,
    scrollLeft,
    startTime: scrollLeft / state.pixelsPerSecond,
    endTime: (scrollLeft + viewportWidth) / state.pixelsPerSecond,
  };
}

function updateProjectStats() {
  state.duration = state.tracks.reduce((max, track) => Math.max(max, track.buffer.duration), 0);
  elements.playheadLabel.textContent = formatTime(state.playheadTime);
  elements.projectLength.textContent = formatTime(state.duration);
  elements.trackCount.textContent = String(state.tracks.length);
  elements.zoomLabel.textContent = `${Math.round(state.pixelsPerSecond)} px/s`;
  elements.zoomSlider.value = zoomToSliderValue(state.pixelsPerSecond);
  elements.scrollSpacer.style.width = `${Math.max(getViewportWidth(), Math.ceil(state.duration * state.pixelsPerSecond))}px`;
}

function scrollPlayheadIntoView(mode = "keep-visible") {
  const viewportWidth = getViewportWidth();
  const projectWidth = Math.max(viewportWidth, Math.ceil(state.duration * state.pixelsPerSecond));
  const maxScrollLeft = Math.max(0, projectWidth - viewportWidth);
  const targetX = state.playheadTime * state.pixelsPerSecond;

  if (mode === "center") {
    elements.scrollHost.scrollLeft = clamp(targetX - viewportWidth / 2, 0, maxScrollLeft);
    return;
  }

  const margin = viewportWidth * 0.2;
  const left = elements.scrollHost.scrollLeft;
  const right = left + viewportWidth;

  if (targetX > right - margin) {
    elements.scrollHost.scrollLeft = clamp(targetX - viewportWidth + margin, 0, maxScrollLeft);
  } else if (targetX < left + margin) {
    elements.scrollHost.scrollLeft = clamp(targetX - margin, 0, maxScrollLeft);
  }
}

function choosePeakLevel(track, samplesPerPixel) {
  let chosen = track.peakLevels[0];
  for (const level of track.peakLevels) {
    chosen = level;
    if (level.blockSize >= samplesPerPixel * 0.9) {
      break;
    }
  }
  return chosen;
}

function createPeakLevels(buffer) {
  const channelCount = buffer.numberOfChannels;
  const totalSamples = buffer.length;
  const mixed = new Float32Array(totalSamples);

  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const data = buffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += 1) {
      mixed[sampleIndex] += data[sampleIndex] / channelCount;
    }
  }

  const levels = [];
  let blockSize = 64;
  let min = new Float32Array(Math.ceil(totalSamples / blockSize));
  let max = new Float32Array(Math.ceil(totalSamples / blockSize));

  for (let blockIndex = 0; blockIndex < min.length; blockIndex += 1) {
    const start = blockIndex * blockSize;
    const end = Math.min(totalSamples, start + blockSize);
    let localMin = 1;
    let localMax = -1;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const sample = mixed[sampleIndex];
      if (sample < localMin) {
        localMin = sample;
      }
      if (sample > localMax) {
        localMax = sample;
      }
    }

    min[blockIndex] = localMin;
    max[blockIndex] = localMax;
  }

  levels.push({ blockSize, min, max });

  while (min.length > 32) {
    const nextMin = new Float32Array(Math.ceil(min.length / 2));
    const nextMax = new Float32Array(Math.ceil(max.length / 2));

    for (let index = 0; index < nextMin.length; index += 1) {
      const leftIndex = index * 2;
      const rightIndex = Math.min(leftIndex + 1, min.length - 1);
      nextMin[index] = Math.min(min[leftIndex], min[rightIndex]);
      nextMax[index] = Math.max(max[leftIndex], max[rightIndex]);
    }

    blockSize *= 2;
    min = nextMin;
    max = nextMax;
    levels.push({ blockSize, min, max });
  }

  return levels;
}

function createTrackNode(track) {
  const fragment = elements.trackTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".track-row");
  const name = fragment.querySelector(".track-name");
  const kind = fragment.querySelector(".track-kind");
  const duration = fragment.querySelector(".track-duration");
  const canvas = fragment.querySelector(".track-canvas");
  const removeButton = fragment.querySelector(".remove-track");
  const muteButton = fragment.querySelector(".mute-track");
  const volumeInput = fragment.querySelector(".volume-track");

  root.dataset.trackId = track.id;
  name.textContent = track.name;
  kind.textContent = track.source;
  duration.textContent = formatTime(track.buffer.duration);

  removeButton.addEventListener("click", () => removeTrack(track.id));
  muteButton.addEventListener("click", () => toggleMute(track.id));
  volumeInput.addEventListener("input", (event) => {
    track.gainValue = Number(event.target.value);
    if (track.gainNode) {
      track.gainNode.gain.value = track.muted ? 0 : track.gainValue;
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    seek(getTimeFromPointer(event, canvas));
  });
  canvas.addEventListener("wheel", (event) => handleTrackWheel(event));

  track.elements = { root, canvas, muteButton, volumeInput, duration };
  elements.tracksContainer.appendChild(fragment);
}

function updateTrackUi(track) {
  if (!track.elements) {
    return;
  }
  track.elements.root.classList.toggle("is-muted", track.muted);
  track.elements.muteButton.textContent = track.muted ? "Unmute" : "Mute";
  track.elements.duration.textContent = `${formatTime(track.buffer.duration)} · ${track.buffer.sampleRate} Hz`;
}

function addTrack({ name, buffer, source }) {
  const track = {
    id: crypto.randomUUID(),
    name,
    buffer,
    source,
    peakLevels: createPeakLevels(buffer),
    muted: false,
    gainValue: 1,
    gainNode: null,
    sourceNode: null,
    elements: null,
  };

  state.tracks.push(track);
  createTrackNode(track);
  updateTrackUi(track);
  updateProjectStats();
  fitAllIfNeeded();
  ensureStudioEmptyState();
  requestRender();
}

function cleanupTrackPlayback(track) {
  if (track.sourceNode) {
    try {
      track.sourceNode.stop();
    } catch (_error) {
      // Already stopped.
    }
  }
  track.sourceNode = null;
  if (track.gainNode) {
    track.gainNode.disconnect();
  }
  track.gainNode = null;
}

function removeTrack(trackId) {
  const trackIndex = state.tracks.findIndex((track) => track.id === trackId);
  if (trackIndex === -1) {
    return;
  }

  const [track] = state.tracks.splice(trackIndex, 1);
  cleanupTrackPlayback(track);
  track.elements?.root.remove();

  if (!state.tracks.length) {
    stopPlayback();
    state.playheadTime = 0;
  }

  updateProjectStats();
  ensureStudioEmptyState();
  requestRender();
}

function toggleMute(trackId) {
  const track = state.tracks.find((item) => item.id === trackId);
  if (!track) {
    return;
  }

  track.muted = !track.muted;
  if (track.gainNode) {
    track.gainNode.gain.value = track.muted ? 0 : track.gainValue;
  }
  updateTrackUi(track);
}

function ensureStudioEmptyState() {
  let empty = elements.tracksContainer.querySelector(".is-empty");

  if (!state.tracks.length) {
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "is-empty";
      empty.innerHTML = "<p>Додай аудіо, щоб відкрити timeline, waveform і transport для студійної перевірки матеріалу.</p>";
      elements.tracksContainer.appendChild(empty);
    }
  } else if (empty) {
    empty.remove();
  }
}

function drawRuler() {
  const canvas = elements.rulerCanvas;
  const { dpr, width, height } = resizeCanvas(canvas, 56);
  const context = canvas.getContext("2d");
  const { startTime, endTime } = getVisibleTimeRange();
  const canvasWidth = width / dpr;
  const canvasHeight = height / dpr;

  context.save();
  context.scale(dpr, dpr);
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = "rgba(5, 11, 21, 0.72)";
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  const step = chooseRulerStep(state.pixelsPerSecond);
  const start = Math.floor(startTime / step) * step;
  context.strokeStyle = "rgba(159, 191, 255, 0.12)";
  context.lineWidth = 1;
  context.fillStyle = "#9bb0d7";
  context.font = '11px "IBM Plex Mono", monospace';

  for (let time = start; time <= endTime + step; time += step) {
    const x = (time - startTime) * state.pixelsPerSecond;
    context.beginPath();
    context.moveTo(x + 0.5, 22);
    context.lineTo(x + 0.5, canvasHeight);
    context.stroke();
    context.fillText(formatRulerTime(time, step), x + 6, 16);
  }

  const playheadX = (state.playheadTime - startTime) * state.pixelsPerSecond;
  drawPlayheadLine(context, playheadX, canvasHeight, canvasWidth);
  context.restore();
}

function chooseRulerStep(pixelsPerSecond) {
  const targetSeconds = 110 / pixelsPerSecond;
  const steps = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
  return steps.find((step) => step >= targetSeconds) || 60;
}

function formatRulerTime(time, step) {
  const safe = Math.max(0, time);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (step < 1) {
    return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(3).padStart(6, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds)).padStart(2, "0")}`;
}

function drawPlayheadLine(context, x, height, width) {
  if (x < -1 || x > width + 1) {
    return;
  }
  context.save();
  context.strokeStyle = "#ff9159";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + 0.5, 0);
  context.lineTo(x + 0.5, height);
  context.stroke();
  context.restore();
}

function drawTrack(track) {
  if (!track.elements?.canvas) {
    return;
  }

  const canvas = track.elements.canvas;
  const { dpr, width, height } = resizeCanvas(canvas, 112);
  const context = canvas.getContext("2d");
  const { startTime } = getVisibleTimeRange();
  const samplesPerPixel = track.buffer.sampleRate / state.pixelsPerSecond;
  const peakLevel = choosePeakLevel(track, samplesPerPixel);
  const visibleStartSample = Math.floor(startTime * track.buffer.sampleRate);
  const channelMid = (height / dpr) / 2;
  const waveHeight = (height / dpr) * 0.42;
  const canvasWidth = width / dpr;
  const canvasHeight = height / dpr;

  context.save();
  context.scale(dpr, dpr);
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  const gradient = context.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  gradient.addColorStop(0, "rgba(7, 16, 29, 0.96)");
  gradient.addColorStop(1, "rgba(13, 28, 48, 0.96)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  context.strokeStyle = "rgba(255, 255, 255, 0.07)";
  context.beginPath();
  context.moveTo(0, channelMid + 0.5);
  context.lineTo(canvasWidth, channelMid + 0.5);
  context.stroke();

  context.fillStyle = "#9fff9a";
  for (let x = 0; x < canvasWidth; x += 1) {
    const startSample = visibleStartSample + Math.floor(x * samplesPerPixel);
    const endSample = startSample + Math.max(1, Math.ceil(samplesPerPixel));
    const startBlock = Math.floor(startSample / peakLevel.blockSize);
    const endBlock = Math.min(peakLevel.min.length - 1, Math.ceil(endSample / peakLevel.blockSize));
    let minValue = 1;
    let maxValue = -1;

    for (let blockIndex = startBlock; blockIndex <= endBlock; blockIndex += 1) {
      if (blockIndex < 0) {
        continue;
      }
      minValue = Math.min(minValue, peakLevel.min[blockIndex]);
      maxValue = Math.max(maxValue, peakLevel.max[blockIndex]);
    }

    if (maxValue === -1 && minValue === 1) {
      continue;
    }

    const top = channelMid - maxValue * waveHeight;
    const bottom = channelMid - minValue * waveHeight;
    context.fillRect(x, top, 1, Math.max(1, bottom - top));
  }

  const trackEndX = (track.buffer.duration - startTime) * state.pixelsPerSecond;
  if (trackEndX >= 0 && trackEndX <= canvasWidth) {
    context.fillStyle = "rgba(255, 255, 255, 0.07)";
    context.fillRect(trackEndX, 0, canvasWidth - trackEndX, canvasHeight);
  }

  const playheadX = (state.playheadTime - startTime) * state.pixelsPerSecond;
  drawPlayheadLine(context, playheadX, canvasHeight, canvasWidth);
  context.restore();
}

function render() {
  if (state.mode !== "studio") {
    return;
  }

  drawRuler();
  state.tracks.forEach(drawTrack);
  updateProjectStats();
}

function requestRender() {
  cancelAnimationFrame(state.renderFrame);
  state.renderFrame = requestAnimationFrame(render);
}

function fitAllIfNeeded() {
  if (!state.duration) {
    return;
  }
  const viewportWidth = getViewportWidth();
  const suggested = clamp(viewportWidth / state.duration, state.minPixelsPerSecond, state.maxPixelsPerSecond);
  if (state.tracks.length <= 1 || state.pixelsPerSecond < 50) {
    state.pixelsPerSecond = suggested;
  }
}

function seek(time, options = {}) {
  const { scrollMode = "none" } = options;
  state.playheadTime = clamp(time, 0, state.duration || 0);
  if (scrollMode !== "none") {
    scrollPlayheadIntoView(scrollMode);
  }
  elements.playheadLabel.textContent = formatTime(state.playheadTime);
  requestRender();
}

function getTimeFromPointer(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  return (elements.scrollHost.scrollLeft + x) / state.pixelsPerSecond;
}

function setZoom(nextPixelsPerSecond, anchorClientX = null) {
  const previous = state.pixelsPerSecond;
  const next = clamp(nextPixelsPerSecond, state.minPixelsPerSecond, state.maxPixelsPerSecond);
  if (Math.abs(next - previous) < 0.001) {
    return;
  }

  const viewportWidth = getViewportWidth();
  const scrollLeft = elements.scrollHost.scrollLeft;
  const anchorX = anchorClientX === null ? viewportWidth / 2 : anchorClientX - elements.rulerCanvas.getBoundingClientRect().left;
  const anchorTime = (scrollLeft + anchorX) / previous;
  state.pixelsPerSecond = next;
  updateProjectStats();
  elements.scrollHost.scrollLeft = Math.max(0, anchorTime * next - anchorX);
  requestRender();
}

function handleTrackWheel(event) {
  event.preventDefault();
  if (event.ctrlKey || event.metaKey || event.shiftKey) {
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(state.pixelsPerSecond * factor, event.clientX);
    return;
  }
  elements.scrollHost.scrollLeft += event.deltaY;
}

function startPlayback() {
  if (!state.tracks.length || state.isPlaying) {
    return;
  }

  const audioContext = ensureAudioContext();
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  state.isPlaying = true;
  state.playbackOffset = state.playheadTime;
  state.playbackStartAt = audioContext.currentTime;

  for (const track of state.tracks) {
    if (state.playheadTime >= track.buffer.duration) {
      track.gainNode = null;
      track.sourceNode = null;
      continue;
    }

    const gainNode = audioContext.createGain();
    gainNode.gain.value = track.muted ? 0 : track.gainValue;
    gainNode.connect(audioContext.destination);

    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = track.buffer;
    sourceNode.connect(gainNode);
    sourceNode.start(0, Math.min(track.buffer.duration, state.playheadTime));

    track.gainNode = gainNode;
    track.sourceNode = sourceNode;
  }

  elements.togglePlay.innerHTML = '<i class="fa-solid fa-stop"></i><span>Stop</span>';
  tickPlayback();
}

function stopPlayback(options = {}) {
  const { suppressRender = false } = options;
  state.isPlaying = false;
  for (const track of state.tracks) {
    cleanupTrackPlayback(track);
  }
  elements.togglePlay.innerHTML = '<i class="fa-solid fa-play"></i><span>Play</span>';
  cancelAnimationFrame(state.playbackFrame);
  if (!suppressRender) {
    requestRender();
  }
}

function tickPlayback() {
  if (!state.isPlaying || !state.audioContext) {
    return;
  }

  state.playheadTime = state.playbackOffset + (state.audioContext.currentTime - state.playbackStartAt);
  if (state.playheadTime >= state.duration) {
    state.playheadTime = state.duration;
    stopPlayback();
    return;
  }

  scrollPlayheadIntoView("keep-visible");
  render();
  state.playbackFrame = requestAnimationFrame(tickPlayback);
}

function togglePlayback() {
  if (state.isPlaying) {
    stopPlayback();
    return;
  }
  startPlayback();
}

async function addFilesToStudio(fileList) {
  const audioContext = ensureAudioContext();
  for (const file of fileList) {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    addTrack({ name: file.name.replace(/\.[^.]+$/, ""), buffer: decoded, source: "upload" });
  }
}

function fitProjectToViewport() {
  if (!state.duration) {
    return;
  }
  const viewportWidth = getViewportWidth();
  state.pixelsPerSecond = clamp((viewportWidth - 24) / state.duration, state.minPixelsPerSecond, state.maxPixelsPerSecond);
  elements.scrollHost.scrollLeft = 0;
  updateProjectStats();
  requestRender();
}

function beginRulerScrub(event) {
  if (!state.tracks.length) {
    return;
  }
  state.rulerScrubActive = true;
  state.rulerScrubResumePlayback = state.isPlaying;
  if (state.isPlaying) {
    stopPlayback({ suppressRender: true });
  }
  elements.rulerCanvas.setPointerCapture(event.pointerId);
  seek(getTimeFromPointer(event, elements.rulerCanvas));
}

function updateRulerScrub(event) {
  if (!state.rulerScrubActive) {
    return;
  }
  seek(getTimeFromPointer(event, elements.rulerCanvas));
}

function endRulerScrub(event) {
  if (!state.rulerScrubActive) {
    return;
  }
  if (event && elements.rulerCanvas.hasPointerCapture(event.pointerId)) {
    elements.rulerCanvas.releasePointerCapture(event.pointerId);
  }
  state.rulerScrubActive = false;
  const shouldResumePlayback = state.rulerScrubResumePlayback;
  state.rulerScrubResumePlayback = false;
  if (shouldResumePlayback) {
    startPlayback();
    return;
  }
  requestRender();
}

function computeAudioStats(buffer, targetPeakDb) {
  const channelCount = buffer.numberOfChannels;
  let peak = 0;
  let sumSquares = 0;
  let sampleCount = 0;

  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const data = buffer.getChannelData(channelIndex);
    for (let index = 0; index < data.length; index += 1) {
      const sample = data[index];
      const absolute = Math.abs(sample);
      peak = Math.max(peak, absolute);
      sumSquares += sample * sample;
      sampleCount += 1;
    }
  }

  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  const targetLinear = Math.pow(10, targetPeakDb / 20);
  const suggestedGainDb = peak > 0 ? 20 * Math.log10(targetLinear / peak) : 0;

  return {
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    peak,
    peakDb,
    rms: sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0,
    suggestedGainDb,
  };
}

function updateMetaStatsView() {
  const statValues = elements.metaAudioStats.querySelectorAll("dd");
  const stats = state.meta.audioStats;
  if (!stats) {
    statValues[0].textContent = "00:00.000";
    statValues[1].textContent = "-";
    statValues[2].textContent = "-";
    statValues[3].textContent = "-";
    updateNormalizationUi();
    return;
  }
  statValues[0].textContent = formatTime(stats.duration);
  statValues[1].textContent = `${stats.sampleRate} Hz`;
  statValues[2].textContent = formatDb(stats.peakDb);
  statValues[3].textContent = formatDb(stats.suggestedGainDb);
  updateNormalizationUi();
}

function getMetaFieldValues() {
  const payload = {};
  for (const [id, element] of Object.entries(elements.metaFields)) {
    payload[id.replace(/^meta-/, "")] = element ? element.value : "";
  }
  Object.assign(payload, LOCKED_META_DEFAULTS);
  payload.normalizeEnabled = elements.metaNormalizeEnabled.checked;
  payload.normalizeTarget = elements.metaNormalizeTarget.value;
  payload.normalizeGainDb = Number(elements.metaNormalizeGain?.value || 0);
  payload.explicit = elements.metaExplicit.checked;
  return payload;
}

function getProcessedGainDb() {
  return getNormalizationSettings().appliedGainDb;
}

function buildExportFileName(extension = "wav") {
  const explicitTitle = elements.metaFields["meta-title"]?.value.trim();
  const audioFileName = state.meta.audioFile?.name ? state.meta.audioFile.name.replace(/\.[^.]+$/, "") : "audio";
  const baseName = (explicitTitle || audioFileName || "audio")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${baseName || "audio"}-export.${extension}`;
}

function createProcessedAudioData() {
  if (!state.meta.audioBuffer) {
    throw new Error("Audio buffer is not loaded");
  }

  const buffer = state.meta.audioBuffer;
  const gainLinear = dbToLinear(getProcessedGainDb());
  const channels = [];

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const source = buffer.getChannelData(channelIndex);
    const output = new Float32Array(source.length);
    for (let sampleIndex = 0; sampleIndex < source.length; sampleIndex += 1) {
      output[sampleIndex] = clamp(source[sampleIndex] * gainLinear, -1, 1);
    }
    channels.push(output);
  }

  return {
    sampleRate: buffer.sampleRate,
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    channels,
  };
}

function encodeWav(processedAudio) {
  const { sampleRate, numberOfChannels, length, channels } = processedAudio;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + length * blockAlign);
  const view = new DataView(buffer);

  function writeString(offset, text) {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * blockAlign, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * blockAlign, true);

  let offset = 44;
  for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
      const sample = clamp(channels[channelIndex][sampleIndex], -1, 1);
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

async function getCoverPayload() {
  if (state.meta.coverFile) {
    return {
      name: state.meta.coverFile.name || "cover.png",
      mimeType: state.meta.coverFile.type || "image/png",
      dataBase64: await blobToBase64(state.meta.coverFile),
    };
  }

  if (state.meta.coverDataUrl) {
    const match = String(state.meta.coverDataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        name: "cover.png",
        mimeType: match[1] || "image/png",
        dataBase64: match[2],
      };
    }
  }

  return null;
}

async function getSourceAudioPayload() {
  if (!state.meta.audioFile) {
    throw new Error("Source audio file is missing");
  }

  const audioBase64 = await blobToBase64(state.meta.audioFile);
  return {
    name: state.meta.audioFile.name || buildExportFileName("mp3"),
    mimeType: state.meta.audioFile.type || "audio/mpeg",
    dataBase64: audioBase64,
    gainDb: getProcessedGainDb(),
  };
}

async function exportAudioFile() {
  if (!state.meta.audioBuffer || !state.meta.audioFile) {
    elements.metaStatus.textContent = "Спочатку завантаж аудіо для експорту.";
    return;
  }

  setMetaBusy(elements.metaExportAudio, true, "Експортую MP3");
  try {
    const data = await callJsonApi("/api/export-audio", {
      audio: await getSourceAudioPayload(),
      metadata: getMetaFieldValues(),
      cover: await getCoverPayload(),
    });

    const mp3Blob = base64ToBlob(data.audioBase64, data.mimeType || "audio/mpeg");
    downloadBlob(mp3Blob, data.fileName || buildExportFileName("mp3"));
    updateMetaPayloadPreview("Processed audio exported as MP3.");
  } catch (error) {
    elements.metaStatus.textContent = `MP3 export failed: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    setMetaBusy(elements.metaExportAudio, false);
  }
}

function buildTelegramCaption() {
  const fields = getMetaFieldValues();
  const lines = [
    fields.title ? `${fields.title}` : "New release",
    fields.artist ? `Artist: ${fields.artist}` : "",
    fields.version ? `Version: ${fields.version}` : "",
    fields.genres ? `Genre: ${fields.genres}` : "",
    fields.subgenre ? `Subgenre: ${fields.subgenre}` : "",
    fields.bpm ? `BPM: ${fields.bpm}` : "",
    fields.key ? `Key: ${fields.key}` : "",
    fields.shortDescription || "",
  ].filter(Boolean);

  return lines.join("\n").slice(0, 1000);
}

async function sendToTelegram() {
  if (!state.meta.audioBuffer || !state.meta.audioFile) {
    elements.metaStatus.textContent = "Спочатку завантаж аудіо перед відправкою в Telegram.";
    return;
  }

  setMetaBusy(elements.metaSendTelegram, true, "Відправляю в Telegram");
  setTelegramProgress({ visible: true, value: 0, text: "Готую upload...", processing: false });
  try {
    const cover = await getCoverPayload();

    const data = await callJsonApiWithProgress("/api/send-telegram", {
      channelUrl: "https://t.me/wonchoe_music",
      metadata: getMetaFieldValues(),
      caption: buildTelegramCaption(),
      audio: await getSourceAudioPayload(),
      cover,
    }, {
      onUploadProgress: (ratio) => {
        if (ratio === null) {
          setTelegramProgress({ visible: true, value: 12, text: "Завантажую реліз...", processing: false });
          return;
        }

        const percent = Math.round(ratio * 100);
        setTelegramProgress({ visible: true, value: percent, text: `Upload: ${percent}%`, processing: false });
      },
      onProcessing: () => {
        setTelegramProgress({ visible: true, value: 100, text: "Upload complete. Sending to Telegram...", processing: true });
      },
    });

    elements.metaStatus.textContent = data.message || "MP3 release sent to Telegram.";
    updateMetaPayloadPreview("MP3 release sent to Telegram channel.");
    setTelegramProgress({ visible: true, value: 100, text: "Sent to Telegram successfully.", processing: false });
  } catch (error) {
    elements.metaStatus.textContent = `Telegram send failed: ${error instanceof Error ? error.message : String(error)}`;
    setTelegramProgress({ visible: true, value: 100, text: `Send failed: ${error instanceof Error ? error.message : String(error)}`, processing: false });
  } finally {
    setMetaBusy(elements.metaSendTelegram, false);
  }
}

function applyMetaFields(values) {
  for (const [key, value] of Object.entries(values || {})) {
    if (Object.hasOwn(LOCKED_META_DEFAULTS, key)) {
      continue;
    }
    const field = elements.metaFields[`meta-${key}`];
    if (field && typeof value !== "undefined" && value !== null) {
      field.value = String(value);
    }
  }

  enforceMetaDefaults();
}

function getMetaPayload() {
  return {
    ...getMetaFieldValues(),
    audio: state.meta.audioFile
      ? {
          name: state.meta.audioFile.name,
          size: state.meta.audioFile.size,
          type: state.meta.audioFile.type,
          stats: state.meta.audioStats,
        }
      : null,
    cover: state.meta.coverFile
      ? {
          name: state.meta.coverFile.name,
          size: state.meta.coverFile.size,
          type: state.meta.coverFile.type,
        }
      : state.meta.coverDataUrl
        ? { generated: true }
        : null,
  };
}

function updateMetaPayloadPreview(message = "Payload оновлено.") {
  state.meta.payload = getMetaPayload();
  elements.metaPayloadPreview.textContent = JSON.stringify(state.meta.payload, null, 2);
  elements.metaStatus.textContent = message;
}

function setMetaBusy(button, busy, busyLabel) {
  if (!button) {
    return;
  }
  button.disabled = busy;
  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>${busyLabel}</span>`;
  } else if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
}

async function handleMetaAudioFile(file) {
  state.meta.audioFile = file;
  elements.metaAudioName.textContent = file ? file.name : "Ще не вибрано";
  stopMetaPreview();

  if (!file) {
    state.meta.audioBuffer = null;
    state.meta.waveformPeaks = null;
    state.meta.audioStats = null;
    state.meta.previewOffset = 0;
    updateMetaStatsView();
    updateMetaPayloadPreview("Audio file removed.");
    return;
  }

  const audioContext = ensureAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  state.meta.audioBuffer = decoded;
  state.meta.waveformPeaks = createPeakLevels(decoded);
  state.meta.audioStats = computeAudioStats(decoded, Number(elements.metaNormalizeTarget.value));
  state.meta.previewOffset = 0;
  setNormalizeGain(state.meta.audioStats.suggestedGainDb, { silent: true });
  updateMetaStatsView();
  updateMetaPayloadPreview("Audio file analyzed and payload refreshed.");
}

function setCoverPreview(dataUrl) {
  state.meta.coverDataUrl = dataUrl || null;
  if (!dataUrl) {
    elements.metaCoverPreview.src = "";
    elements.metaCoverPreview.classList.add("is-hidden");
    elements.metaCoverEmpty.classList.remove("is-hidden");
    return;
  }
  elements.metaCoverPreview.src = dataUrl;
  elements.metaCoverPreview.classList.remove("is-hidden");
  elements.metaCoverEmpty.classList.add("is-hidden");
}

function handleMetaCoverFile(file) {
  state.meta.coverFile = file;
  elements.metaCoverName.textContent = file ? file.name : "Ще не вибрано";

  if (!file) {
    setCoverPreview(null);
    updateMetaPayloadPreview("Cover removed.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    setCoverPreview(String(reader.result));
    updateMetaPayloadPreview("Cover loaded and payload refreshed.");
  };
  reader.readAsDataURL(file);
}

async function callJsonApi(url, body, options = {}) {
  const { timeoutMs = 90000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && (error.name === "AbortError" || error.message === "timeout")) {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  }

  clearTimeout(timeoutId);

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    data = { raw: text };
  }

  if (!response.ok) {
    const errorMessage = data && data.error ? data.error : `Request failed with ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

function callJsonApiWithProgress(url, body, callbacks = {}) {
  const { onUploadProgress, onProcessing } = callbacks;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.upload.addEventListener("progress", (event) => {
      if (!onUploadProgress) {
        return;
      }

      if (event.lengthComputable) {
        onUploadProgress(event.loaded / event.total);
        return;
      }

      onUploadProgress(null);
    });

    xhr.upload.addEventListener("load", () => {
      onProcessing?.();
    });

    xhr.addEventListener("load", () => {
      const text = xhr.responseText || "";
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch (_error) {
        data = { raw: text };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      reject(new Error(data && data.error ? data.error : `Request failed with ${xhr.status}`));
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.send(JSON.stringify(body));
  });
}

function setTelegramProgress({ visible = true, value = 0, text = "", processing = false } = {}) {
  if (!elements.metaTelegramProgress || !elements.metaTelegramProgressFill || !elements.metaTelegramProgressText) {
    return;
  }

  elements.metaTelegramProgress.classList.toggle("is-hidden", !visible);
  elements.metaTelegramProgress.classList.toggle("is-processing", processing);
  elements.metaTelegramProgressFill.style.width = `${clamp(value, 0, 100)}%`;
  elements.metaTelegramProgressText.textContent = text;
}

async function aiFillMetadata() {
  if (!state.meta.audioFile && !elements.metaFields["meta-style-brief"]?.value.trim()) {
    elements.metaStatus.textContent = "Додай аудіо або хоча б style brief перед AI-заповненням.";
    return;
  }

  setMetaBusy(elements.metaAiFill, true, "Генерую поля");
  elements.metaStatus.textContent = "AI генерує metadata fields...";
  try {
    const data = await callJsonApi("/api/ai-fill", {
      styleBrief: elements.metaFields["meta-style-brief"]?.value || "",
      current: getMetaFieldValues(),
      audioStats: state.meta.audioStats,
      fileName: state.meta.audioFile ? state.meta.audioFile.name : null,
    }, { timeoutMs: 90000 });

    applyMetaFields(data.fields || data);
    updateMetaPayloadPreview("AI заповнив metadata fields.");
  } catch (error) {
    elements.metaStatus.textContent = `AI autofill недоступний: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    setMetaBusy(elements.metaAiFill, false);
  }
}

async function aiGenerateCover() {
  const fallbackPrompt = elements.metaFields["meta-style-brief"]?.value.trim() || elements.metaFields["meta-description"]?.value.trim() || elements.metaFields["meta-title"]?.value.trim();
  if (!fallbackPrompt) {
    elements.metaStatus.textContent = "Вкажи style brief або опис перед генерацією cover.";
    return;
  }

  const prompt = buildCoverPrompt();

  setMetaBusy(elements.metaAiImage, true, "Генерую cover");
  elements.metaStatus.textContent = "AI генерує cover image...";
  try {
    const data = await callJsonApi("/api/generate-cover", {
      prompt,
      title: elements.metaFields["meta-title"]?.value || "",
      artist: elements.metaFields["meta-artist"]?.value || "",
    }, { timeoutMs: 120000 });

    if (data.imageBase64) {
      setCoverPreview(`data:image/png;base64,${data.imageBase64}`);
      state.meta.coverFile = null;
      elements.metaCoverName.textContent = "AI generated cover";
      updateMetaPayloadPreview("AI cover generated.");
    } else if (data.imageUrl) {
      setCoverPreview(data.imageUrl);
      state.meta.coverFile = null;
      elements.metaCoverName.textContent = "AI generated cover";
      updateMetaPayloadPreview("AI cover generated.");
    } else {
      throw new Error("No image returned from API");
    }
  } catch (error) {
    elements.metaStatus.textContent = `AI cover generation недоступна: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    setMetaBusy(elements.metaAiImage, false);
  }
}

function bindModeNavigation() {
  elements.openModeButtons.forEach((card) => {
    card.addEventListener("click", () => switchMode(card.dataset.openMode));
  });
  elements.backHomeButtons.forEach((button) => {
    button.addEventListener("click", () => switchMode("home"));
  });
}

function bindMetaWorkspace() {
  elements.metaAudioInput.addEventListener("change", async (event) => {
    const [file] = Array.from(event.target.files || []);
    await handleMetaAudioFile(file || null);
  });

  elements.metaCoverInput.addEventListener("change", (event) => {
    const [file] = Array.from(event.target.files || []);
    handleMetaCoverFile(file || null);
  });

  elements.metaStylePreset?.addEventListener("change", () => {
    applyStylePreset(elements.metaStylePreset.value, { force: true });
    updateMetaPayloadPreview("Style preset applied.");
  });

  Object.values(elements.metaFields).forEach((field) => {
    field?.addEventListener("input", () => updateMetaPayloadPreview("Payload refreshed from metadata fields."));
    field?.addEventListener("change", () => updateMetaPayloadPreview("Payload refreshed from metadata fields."));
  });

  elements.metaFields["meta-style-brief"]?.addEventListener("input", syncStylePresetFromBrief);
  elements.metaFields["meta-style-brief"]?.addEventListener("change", syncStylePresetFromBrief);
  elements.metaFields["meta-artist"]?.addEventListener("input", enforceMetaDefaults);
  elements.metaFields["meta-artist"]?.addEventListener("change", enforceMetaDefaults);
  elements.metaFields["meta-composer"]?.addEventListener("input", enforceMetaDefaults);
  elements.metaFields["meta-composer"]?.addEventListener("change", enforceMetaDefaults);
  elements.metaFields["meta-lyricist"]?.addEventListener("input", enforceMetaDefaults);
  elements.metaFields["meta-lyricist"]?.addEventListener("change", enforceMetaDefaults);
  elements.metaFields["meta-producer"]?.addEventListener("input", enforceMetaDefaults);
  elements.metaFields["meta-producer"]?.addEventListener("change", enforceMetaDefaults);
  elements.metaFields["meta-label"]?.addEventListener("input", enforceMetaDefaults);
  elements.metaFields["meta-label"]?.addEventListener("change", enforceMetaDefaults);
  elements.metaFields["meta-year"]?.addEventListener("input", enforceMetaDefaults);
  elements.metaFields["meta-year"]?.addEventListener("change", enforceMetaDefaults);
  elements.metaFields["meta-copyright"]?.addEventListener("input", enforceMetaDefaults);
  elements.metaFields["meta-copyright"]?.addEventListener("change", enforceMetaDefaults);

  elements.metaNormalizeEnabled.addEventListener("change", () => {
    updateNormalizationUi();
    updateMetaPayloadPreview("Normalization settings updated.");
  });
  elements.metaExplicit.addEventListener("change", () => updateMetaPayloadPreview("Explicit flag updated."));
  elements.metaNormalizeTarget.addEventListener("change", () => {
    if (state.meta.audioBuffer) {
      state.meta.audioStats = computeAudioStats(state.meta.audioBuffer, Number(elements.metaNormalizeTarget.value));
      setNormalizeGain(state.meta.audioStats.suggestedGainDb, { silent: true });
      updateMetaStatsView();
    }
    updateMetaPayloadPreview("Normalization target updated.");
  });
  elements.metaNormalizeGain?.addEventListener("input", () => setNormalizeGain(elements.metaNormalizeGain.value));
  elements.metaNormalizeReset?.addEventListener("click", () => {
    if (state.meta.audioStats) {
      setNormalizeGain(state.meta.audioStats.suggestedGainDb);
    }
  });
  elements.metaNormalizeWaveform?.addEventListener("pointerdown", beginMetaWaveformScrub);
  elements.metaNormalizeWaveform?.addEventListener("pointermove", updateMetaWaveformScrub);
  elements.metaNormalizeWaveform?.addEventListener("pointerup", endMetaWaveformScrub);
  elements.metaNormalizeWaveform?.addEventListener("pointercancel", endMetaWaveformScrub);
  elements.metaPreviewOriginal?.addEventListener("click", () => startMetaPreview("original"));
  elements.metaPreviewNormalized?.addEventListener("click", () => startMetaPreview("normalized"));
  elements.metaPreviewStop?.addEventListener("click", stopMetaPreview);
  elements.metaAiFill.addEventListener("click", aiFillMetadata);
  elements.metaAiImage.addEventListener("click", aiGenerateCover);
  elements.metaSendTelegram?.addEventListener("click", sendToTelegram);
  elements.metaExportAudio?.addEventListener("click", exportAudioFile);
}

function bindStudioWorkspace() {
  elements.addFiles.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    await addFilesToStudio(files);
    event.target.value = "";
  });

  elements.togglePlay.addEventListener("click", togglePlayback);
  elements.pause.addEventListener("click", stopPlayback);
  elements.rewind.addEventListener("click", () => {
    stopPlayback();
    seek(0);
  });
  elements.zoomSlider.addEventListener("input", (event) => {
    setZoom(sliderValueToZoom(event.target.value));
  });
  elements.zoomIn.addEventListener("click", () => setZoom(state.pixelsPerSecond * 1.4));
  elements.zoomOut.addEventListener("click", () => setZoom(state.pixelsPerSecond / 1.4));
  elements.fitAll.addEventListener("click", fitProjectToViewport);
  elements.scrollHost.addEventListener("scroll", requestRender);
  elements.rulerCanvas.addEventListener("pointerdown", beginRulerScrub);
  elements.rulerCanvas.addEventListener("pointermove", updateRulerScrub);
  elements.rulerCanvas.addEventListener("pointerup", endRulerScrub);
  elements.rulerCanvas.addEventListener("pointercancel", endRulerScrub);
  elements.rulerCanvas.addEventListener("wheel", (event) => handleTrackWheel(event));
  document.querySelectorAll("[data-zoom]").forEach((button) => {
    button.addEventListener("click", () => setZoom(Number(button.dataset.zoom)));
  });
}

function bindGlobalEvents() {
  window.addEventListener("resize", requestRender);
  window.addEventListener("resize", updateNormalizationUi);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.key === " ") {
      handleSpaceShortcut(event);
    }
  }, true);
  window.addEventListener("keyup", (event) => {
    if ((event.code === "Space" || event.key === " ") && shouldCaptureSpaceShortcut(event)) {
      event.preventDefault();
    }
  }, true);
}

function init() {
  bindModeNavigation();
  bindMetaWorkspace();
  bindStudioWorkspace();
  bindGlobalEvents();
  applyStylePreset(elements.metaStylePreset?.value || "dubstep-tribal", { force: true });
  syncStylePresetFromBrief();
  enforceMetaDefaults();
  switchMode("home");
  ensureStudioEmptyState();
  updateProjectStats();
  updateMetaStatsView();
  updateMetaPayloadPreview("Заповни поля або завантаж файли, щоб зібрати payload.");
  requestRender();
}

init();