// Vice Cover Studio v2 — the editor.
//
// Wires the page: a photo library (five image-model-made samples plus the user's
// own uploads), a live cover preview, per-panel grade controls, stickers and
// drag-and-drop positioning, and a one-click PNG export in the three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { GRADES, LAYOUTS, SIZES, exportCoverPNG, panelRects, renderCover } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier', src: 'samples/pier.jpg' },
  { id: 'rooftop', label: 'Rooftop', src: 'samples/rooftop.jpg' },
  { id: 'neon', label: 'Neon', src: 'samples/neon.jpg' },
  { id: 'party', label: 'Party', src: 'samples/party.jpg' },
];

const STICKER_TYPES = [
  { id: 'palm', label: 'Palm' },
  { id: 'sun', label: 'Sun' },
  { id: 'star', label: 'Star' },
  { id: 'bolt', label: 'Bolt' },
  { id: 'seal', label: 'Seal' },
];

const stage = document.getElementById('stage');
const status = document.getElementById('status');
const library = document.getElementById('library');
const panelGrade = document.getElementById('panel-grade');
const zoom = document.getElementById('zoom');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');

// One slot per panel: its photo, zoom, pan and grade. Every panel gets its own
// photo and its own grade wash — never the same photo twice in one cover.
const state = {
  layout: 'quad',
  size: 'wide',
  caption: 'Midnight Vice',
  subtitle: 'neon nights',
  titlePos: 'middle',
  titleSize: 1,
  titleColor: '#ffffff',
  slots: [],
  stickers: [],
  selected: 0,
  photos: [],
};

function slotCount() {
  return LAYOUTS[state.layout].panels;
}

function freshSlots() {
  return Array.from({ length: slotCount() }, (_, i) => ({
    img: state.photos[i % state.photos.length]?.img ?? null,
    photoId: state.photos[i % state.photos.length]?.id ?? null,
    zoom: 1,
    panX: 0,
    panY: 0,
    grade: 'sunset',
  }));
}

/** Assigns distinct photos to the panels, cycling the library without repeats. */
function fillDistinct() {
  const pool = [...state.photos];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  state.slots = freshSlots();
  state.slots.forEach((slot, i) => {
    slot.img = pool[i % pool.length].img;
    slot.photoId = pool[i % pool.length].id;
  });
  state.selected = 0;
  syncPanelControls();
  redraw();
}

function currentSize() {
  return SIZES[state.size];
}

/** The preview canvas keeps the export aspect at a handy on-screen size. */
function previewSize() {
  const { w, h } = currentSize();
  const long = 760;
  if (w >= h) return { w: long, h: Math.round((long * h) / w) };
  return { w: Math.round((long * w) / h), h: long };
}

function redraw() {
  const { w, h } = previewSize();
  stage.width = w;
  stage.height = h;
  renderCover(stage, {
    layout: state.layout,
    photos: state.slots,
    caption: state.caption,
    subtitle: state.subtitle,
    titlePos: state.titlePos,
    titleSize: state.titleSize,
    titleColor: state.titleColor,
    stickers: state.stickers,
  });
  drawSelection();
}

/** Outlines the selected panel on the preview so the grade/zoom controls read. */
function drawSelection() {
  const ctx = stage.getContext('2d');
  const rects = panelRects(state.layout, stage.width, stage.height);
  const rect = rects[state.selected];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#ff7ad9';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.setLineDash([]);
  ctx.restore();
}

function syncPanelControls() {
  const slot = state.slots[state.selected];
  if (!slot) return;
  panelGrade.value = slot.grade;
  zoom.value = String(Math.round((slot.zoom - 1) * 100));
  document.getElementById('panel-label').textContent = `Panel ${state.selected + 1} of ${slotCount()}`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function renderLibrary() {
  library.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.draggable = true;
    thumb.title = `Use ${photo.label} in the selected panel (or drag it onto a panel)`;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.label;
    img.draggable = false;
    thumb.append(img);
    const tag = document.createElement('span');
    tag.textContent = photo.label;
    thumb.append(tag);
    thumb.addEventListener('click', () => {
      assignPhoto(index, state.selected);
    });
    thumb.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/photo-index', String(index));
      e.dataTransfer.effectAllowed = 'copy';
    });
    library.append(thumb);
  });
}

function assignPhoto(photoIndex, panelIndex) {
  const photo = state.photos[photoIndex];
  if (!photo || !state.slots[panelIndex]) return;
  const slot = state.slots[panelIndex];
  // Keep every panel on a different photo: if another panel already shows
  // this one, hand it the photo this panel is giving up.
  const clash = state.slots.findIndex((s, i) => i !== panelIndex && s.photoId === photo.id);
  if (clash >= 0) {
    const other = state.slots[clash];
    other.img = slot.img;
    other.photoId = slot.photoId;
    other.zoom = 1;
    other.panX = 0;
    other.panY = 0;
  }
  slot.img = photo.img;
  slot.photoId = photo.id;
  slot.zoom = 1;
  slot.panX = 0;
  slot.panY = 0;
  state.selected = panelIndex;
  syncPanelControls();
  redraw();
}

function panelAt(clientX, clientY) {
  const box = stage.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * stage.width;
  const y = ((clientY - box.top) / box.height) * stage.height;
  return panelRects(state.layout, stage.width, stage.height).findIndex(
    (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
  );
}

// Click a panel to select it; drag inside it to pan its photo.
let drag = null;
stage.addEventListener('pointerdown', (e) => {
  const panel = panelAt(e.clientX, e.clientY);
  if (panel < 0) return;
  state.selected = panel;
  syncPanelControls();
  drag = { panel, x: e.clientX, y: e.clientY, moved: false };
  stage.setPointerCapture(e.pointerId);
  redraw();
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const box = stage.getBoundingClientRect();
  const slot = state.slots[drag.panel];
  const rects = panelRects(state.layout, stage.width, stage.height);
  const rect = rects[drag.panel];
  slot.panX += ((e.clientX - drag.x) / box.width) * (stage.width / rect.w);
  slot.panY += ((e.clientY - drag.y) / box.height) * (stage.height / rect.h);
  slot.panX = Math.max(-0.5, Math.min(0.5, slot.panX));
  slot.panY = Math.max(-0.5, Math.min(0.5, slot.panY));
  drag.x = e.clientX;
  drag.y = e.clientY;
  drag.moved = true;
  redraw();
});
stage.addEventListener('pointerup', () => {
  drag = null;
});

// Drop a library photo, or a file from the machine, onto a panel.
stage.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  const panel = panelAt(e.clientX, e.clientY);
  if (panel < 0) return;
  const index = e.dataTransfer.getData('text/photo-index');
  if (index !== '') {
    assignPhoto(Number(index), panel);
    return;
  }
  const file = e.dataTransfer.files?.[0];
  if (file && file.type.startsWith('image/')) {
    const img = await loadImage(URL.createObjectURL(file));
    addUpload(file.name.replace(/\.[^.]+$/, ''), img, URL.createObjectURL(file));
    assignPhoto(state.photos.length - 1, panel);
  }
});

function addUpload(label, img, thumb) {
  state.photos.push({ id: `upload-${state.photos.length}`, label, img, thumb });
  renderLibrary();
}

document.getElementById('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files || []) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    addUpload(file.name.replace(/\.[^.]+$/, ''), img, url);
  }
  e.target.value = '';
  status.textContent = `${state.photos.length - SAMPLES.length} photo(s) added from this machine.`;
});

document.getElementById('fill-distinct').addEventListener('click', fillDistinct);

for (const [key, layout] of Object.entries(LAYOUTS)) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'choice';
  if (key === state.layout) btn.classList.add('on');
  btn.textContent = layout.label;
  btn.dataset.layout = key;
  btn.addEventListener('click', () => {
    const old = state.slots.map((s) => ({ ...s }));
    state.layout = key;
    state.slots = freshSlots();
    state.slots.forEach((slot, i) => {
      if (old[i]) Object.assign(slot, old[i]);
    });
    state.selected = 0;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b === btn));
    syncPanelControls();
    redraw();
  });
  document.getElementById('layouts').append(btn);
}

for (const [key, size] of Object.entries(SIZES)) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'choice';
  if (key === state.size) btn.classList.add('on');
  btn.textContent = size.label;
  btn.dataset.size = key;
  btn.addEventListener('click', () => {
    state.size = key;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b === btn));
    redraw();
  });
  document.getElementById('sizes').append(btn);
}

for (const [key, grade] of Object.entries(GRADES)) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'choice';
  if (key === 'sunset') btn.classList.add('on');
  btn.textContent = grade.label;
  btn.dataset.grade = key;
  btn.addEventListener('click', () => {
    // One grade for every panel at once — no panel is left ungraded.
    state.slots.forEach((slot) => {
      slot.grade = key;
    });
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b === btn));
    syncPanelControls();
    redraw();
  });
  document.getElementById('grades').append(btn);
}

// Per-panel grade: only the selected panel changes.
panelGrade.addEventListener('change', () => {
  const slot = state.slots[state.selected];
  if (slot) slot.grade = panelGrade.value;
  redraw();
});
zoom.addEventListener('input', () => {
  const slot = state.slots[state.selected];
  if (slot) slot.zoom = 1 + Number(zoom.value) / 100;
  redraw();
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
document.getElementById('title-pos').addEventListener('change', (e) => {
  state.titlePos = e.target.value;
  redraw();
});
document.getElementById('title-size').addEventListener('input', (e) => {
  state.titleSize = Number(e.target.value) / 100;
  redraw();
});
document.querySelectorAll('[data-color]').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    state.titleColor = swatch.dataset.color;
    document.querySelectorAll('[data-color]').forEach((s) => s.classList.toggle('on', s === swatch));
    redraw();
  });
});

for (const sticker of STICKER_TYPES) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'choice';
  btn.textContent = sticker.label;
  btn.addEventListener('click', () => {
    state.stickers.push({
      type: sticker.id,
      x: 0.5 + (Math.random() - 0.5) * 0.3,
      y: 0.5 + (Math.random() - 0.5) * 0.3,
      scale: 1,
      rot: (Math.random() - 0.5) * 0.5,
    });
    status.textContent = `${sticker.label} sticker added — drag it on the cover to move it.`;
    redraw();
  });
  document.getElementById('stickers').append(btn);
}
document.getElementById('clear-stickers').addEventListener('click', () => {
  state.stickers = [];
  redraw();
});

// Drag a sticker on the preview to move it; click one to remove it with Delete.
let stickerDrag = null;
stage.addEventListener('pointerdown', (e) => {
  const box = stage.getBoundingClientRect();
  const x = (e.clientX - box.left) / box.width;
  const y = (e.clientY - box.top) / box.height;
  const hit = state.stickers.findIndex((s) => Math.hypot(s.x - x, s.y - y) < 0.07);
  if (hit >= 0) {
    stickerDrag = { index: hit, x, y, ox: state.stickers[hit].x, oy: state.stickers[hit].y };
  }
});
stage.addEventListener('pointermove', (e) => {
  if (!stickerDrag) return;
  const box = stage.getBoundingClientRect();
  const x = (e.clientX - box.left) / box.width;
  const y = (e.clientY - box.top) / box.height;
  state.stickers[stickerDrag.index].x = stickerDrag.ox + (x - stickerDrag.x);
  state.stickers[stickerDrag.index].y = stickerDrag.oy + (y - stickerDrag.y);
  redraw();
});
stage.addEventListener('pointerup', () => {
  stickerDrag = null;
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.stickers.length) {
    state.stickers.pop();
    redraw();
  }
});

document.getElementById('export').addEventListener('click', async () => {
  const size = currentSize();
  status.textContent = 'Exporting…';
  try {
    const blob = await exportCoverPNG(
      {
        layout: state.layout,
        photos: state.slots,
        caption: state.caption,
        subtitle: state.subtitle,
        titlePos: state.titlePos,
        titleSize: state.titleSize,
        titleColor: state.titleColor,
        stickers: state.stickers,
      },
      size,
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KiB).`;
    window.__lastExport = { bytes: blob.size, w: size.w, h: size.h };
  } catch (err) {
    status.textContent = `Export failed: ${err.message}`;
  }
});

/** Loads the sample photos, then fills the cover with distinct ones. */
async function boot() {
  await Promise.all([document.fonts.load('16px Anton'), document.fonts.load('16px Pacifico')]);
  for (const sample of SAMPLES) {
    const img = await loadImage(sample.src);
    state.photos.push({ ...sample, img, thumb: sample.src });
  }
  renderLibrary();
  fillDistinct();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), state, { loadImage, redraw, assignPhoto });
  }
}

boot();
