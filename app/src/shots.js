// Vice Cover Studio v2 — fixed scenes for screenshots.
//
// ?shot=cover renders the real exported PNG (the app's own export, at full post
// size) into a full-frame image in the browser, so the screenshot shows the PNG
// the app wrote. ?shot=editor shows the editor with a sample photo loaded.
// window.__shotReady is set once the scene has painted.
import { SIZES, exportCoverPNG } from './cover.js';

function parseStickers(raw) {
  if (!raw) return [];
  return raw.split('|').map((part) => {
    const [type, coords] = part.split(':');
    const [x, y] = (coords || '').split(',');
    return { type, x: Number(x) || 0.5, y: Number(y) || 0.5, scale: 1, rot: 0 };
  });
}

async function coverScene(query, state, helpers) {
  document.body.classList.add('shot-cover');
  const layout = query.get('layout') || 'quad';
  const grade = query.get('grade') || 'sunset';
  const size = SIZES[query.get('size')] || SIZES.wide;
  const wanted = (query.get('photos') || '').split(',').filter(Boolean);
  const panelTotal = layout === 'quad' || layout === 'strip' ? 4 : 3;
  // Distinct photos only: the wanted list, then unused library photos.
  const picked = [];
  for (const id of wanted) {
    if (!picked.includes(id)) picked.push(id);
  }
  for (const photo of state.photos) {
    if (picked.length >= panelTotal) break;
    if (!picked.includes(photo.id)) picked.push(photo.id);
  }
  const slots = [];
  for (let i = 0; i < panelTotal; i++) {
    const id = picked[i % picked.length];
    const photo = state.photos.find((p) => p.id === id) || state.photos[i % state.photos.length];
    slots.push({ img: photo.img, photoId: photo.id, zoom: 1, panX: 0, panY: 0, grade });
  }
  const spec = {
    layout,
    photos: slots,
    caption: query.get('caption') || 'Midnight Vice',
    subtitle: query.get('subtitle') || '',
    titlePos: query.get('title') || 'middle',
    titleSize: 1,
    titleColor: '#ffffff',
    stickers: parseStickers(query.get('stickers')),
  };
  const blob = await exportCoverPNG(spec, size);
  const img = document.getElementById('shot-img');
  img.src = URL.createObjectURL(blob);
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

async function editorScene(query, state, helpers) {
  const photo = state.photos.find((p) => p.id === query.get('photo')) || state.photos[0];
  const index = state.photos.indexOf(photo);
  // assignPhoto swaps instead of duplicating, so the cover keeps distinct photos.
  helpers.assignPhoto(index, 0);
  state.caption = query.get('caption') || 'Golden Hour';
  document.getElementById('caption').value = state.caption;
  helpers.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export async function runShot(shot, query, state, helpers) {
  if (shot === 'cover') return coverScene(query, state, helpers);
  if (shot === 'editor') return editorScene(query, state, helpers);
  window.__shotReady = true;
}
