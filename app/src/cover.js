// Vice Cover Studio v2 — the cover renderer.
//
// Draws a multi-panel GTA-style poster cover onto a 2D canvas: every panel holds a
// different photo, every panel carries a colour grade (no ungraded daylight panel),
// and a bold outlined title overlaps the panel grid. Nothing here loads anything
// over the network; the fonts are local files under app/fonts/.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    stops: [
      [0, 'rgba(255, 150, 70, 0.16)'],
      [0.55, 'rgba(255, 95, 110, 0.26)'],
      [1, 'rgba(190, 45, 140, 0.52)'],
    ],
    vignette: 0.26,
  },
  neon: {
    label: 'Neon',
    stops: [
      [0, 'rgba(255, 70, 190, 0.2)'],
      [0.5, 'rgba(0, 225, 205, 0.2)'],
      [1, 'rgba(110, 45, 205, 0.5)'],
    ],
    vignette: 0.3,
  },
  night: {
    label: 'Night Shift',
    stops: [
      [0, 'rgba(8, 10, 42, 0.34)'],
      [0.55, 'rgba(38, 28, 92, 0.36)'],
      [1, 'rgba(6, 6, 26, 0.58)'],
    ],
    vignette: 0.38,
  },
  plain: {
    label: 'Clean',
    stops: [
      [0, 'rgba(0, 0, 0, 0)'],
      [1, 'rgba(0, 0, 0, 0.06)'],
    ],
    vignette: 0.16,
  },
};

export const LAYOUTS = {
  poster: { label: 'Poster', panels: 3 },
  quad: { label: 'Quad', panels: 4 },
  hero: { label: 'Hero', panels: 3 },
  strip: { label: 'Strip', panels: 4 },
};

export const SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

/** Panel rectangles for a layout, in pixels, with white gutters between them. */
export function panelRects(layout, w, h) {
  const g = Math.max(6, Math.round(Math.min(w, h) * 0.012));
  const m = g;
  const innerW = w - m * 2;
  const innerH = h - m * 2;
  if (layout === 'quad') {
    const pw = (innerW - g) / 2;
    const ph = (innerH - g) / 2;
    return [
      { x: m, y: m, w: pw, h: ph },
      { x: m + pw + g, y: m, w: pw, h: ph },
      { x: m, y: m + ph + g, w: pw, h: ph },
      { x: m + pw + g, y: m + ph + g, w: pw, h: ph },
    ];
  }
  if (layout === 'hero') {
    const bigW = innerW * 0.58;
    const sideW = innerW - bigW - g;
    const sideH = (innerH - g) / 2;
    return [
      { x: m, y: m, w: bigW, h: innerH },
      { x: m + bigW + g, y: m, w: sideW, h: sideH },
      { x: m + bigW + g, y: m + sideH + g, w: sideW, h: sideH },
    ];
  }
  if (layout === 'strip') {
    const pw = (innerW - g * 3) / 4;
    return [0, 1, 2, 3].map((i) => ({ x: m + i * (pw + g), y: m, w: pw, h: innerH }));
  }
  // poster: three tall panels side by side.
  const pw = (innerW - g * 2) / 3;
  return [0, 1, 2].map((i) => ({ x: m + i * (pw + g), y: m, w: pw, h: innerH }));
}

/** Cover-fits one photo into a panel rect, honouring its zoom and pan. */
function drawPhotoInto(ctx, img, rect, zoom, panX, panY) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const cx = rect.x + rect.w / 2 + panX * rect.w;
  const cy = rect.y + rect.h / 2 + panY * rect.h;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

/** Washes a panel with its grade and darkens its corners. */
function washPanel(ctx, rect, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  for (const [at, colour] of grade.stops) wash.addColorStop(at, colour);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.hypot(rect.w, rect.h) / 2;
  const vig = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, `rgba(0, 0, 0, ${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Splits a caption into at most two lines that fit maxWidth at the given size. */
function wrapTitle(ctx, text, maxWidth, size) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  ctx.font = `${size}px Anton, sans-serif`;
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** The bold outlined title block, slanted a touch, overlapping the panel grid. */
function drawTitleBlock(ctx, w, h, spec) {
  const text = (spec.caption || '').trim();
  if (!text) return;
  const bandY = spec.titlePos === 'top' ? h * 0.3 : spec.titlePos === 'bottom' ? h * 0.78 : h * 0.58;
  const maxWidth = w * 0.88;
  let size = h * (spec.titleSize || 1) * 0.115;
  let lines = wrapTitle(ctx, text, maxWidth, size);
  while (lines.length > 2 && size > 18) {
    size -= 4;
    lines = wrapTitle(ctx, text, maxWidth, size);
  }
  while (lines.length && ctx.measureText(lines[0]).width > maxWidth && size > 18) {
    size -= 4;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  if (!lines.length) return;
  const lineHeight = size * 1.02;
  const blockH = lines.length * lineHeight;
  ctx.save();
  ctx.translate(w / 2, bandY);
  ctx.rotate(-0.035);
  // Dark band behind the lettering so it reads over any photo.
  ctx.fillStyle = 'rgba(12, 6, 24, 0.62)';
  const bandW = Math.min(w * 0.94, Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 0.9);
  ctx.fillRect(-bandW / 2, -lineHeight * 0.72, bandW, blockH + lineHeight * 0.42);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  lines.forEach((line, i) => {
    const y = -blockH / 2 + lineHeight * (i + 0.5) + lineHeight * 0.08;
    ctx.strokeStyle = '#160a24';
    ctx.lineWidth = Math.max(4, size * 0.16);
    ctx.strokeText(line, 0, y);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.05;
    ctx.fillStyle = spec.titleColor || '#ffffff';
    ctx.fillText(line, 0, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  });
  // Script subtitle under the title, in neon pink.
  const sub = (spec.subtitle || '').trim();
  if (sub) {
    const subSize = Math.max(16, size * 0.34);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ff7ad9';
    ctx.shadowColor = 'rgba(255, 60, 180, 0.8)';
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillText(sub, 0, blockH / 2 + lineHeight * 0.55);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function starPath(ctx, x, y, r, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function palmPath(ctx, x, y, s) {
  ctx.beginPath();
  // Tapering trunk curving up to the crown.
  ctx.moveTo(x - s * 0.06, y + s);
  ctx.quadraticCurveTo(x - s * 0.1, y + s * 0.2, x + s * 0.22, y - s * 0.68);
  ctx.lineTo(x + s * 0.34, y - s * 0.68);
  ctx.quadraticCurveTo(x + s * 0.06, y + s * 0.2, x + s * 0.1, y + s);
  ctx.closePath();
  // Long leaves fanning out from the crown.
  const crownX = x + s * 0.28;
  const crownY = y - s * 0.72;
  for (const a of [-2.6, -2.1, -1.6, -1.05, -0.55, -0.1]) {
    ctx.moveTo(crownX, crownY);
    ctx.ellipse(
      crownX + Math.cos(a) * s * 0.42,
      crownY + Math.sin(a) * s * 0.42,
      s * 0.42,
      s * 0.1,
      a,
      0,
      Math.PI * 2,
    );
  }
}

/** One vector sticker, drawn at cover coordinates. */
export function drawSticker(ctx, sticker, w, h) {
  const s = Math.min(w, h) * 0.09 * (sticker.scale || 1);
  const x = sticker.x * w;
  const y = sticker.y * h;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sticker.rot || 0);
  ctx.lineJoin = 'round';
  if (sticker.type === 'palm') {
    ctx.fillStyle = '#0e4d33';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, s * 0.06);
    palmPath(ctx, 0, 0, s);
    ctx.fill();
    ctx.stroke();
  } else if (sticker.type === 'sun') {
    const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.62);
    g.addColorStop(0, '#ffe066');
    g.addColorStop(1, '#ff7b2f');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ff7b2f';
    ctx.lineWidth = Math.max(2, s * 0.09);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.78);
      ctx.lineTo(Math.cos(a) * s * 1.02, Math.sin(a) * s * 1.02);
      ctx.stroke();
    }
  } else if (sticker.type === 'bolt') {
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#160a24';
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(s * 0.15, -s);
    ctx.lineTo(-s * 0.45, s * 0.15);
    ctx.lineTo(-s * 0.02, s * 0.15);
    ctx.lineTo(-s * 0.15, s);
    ctx.lineTo(s * 0.45, -s * 0.15);
    ctx.lineTo(s * 0.02, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (sticker.type === 'seal') {
    ctx.fillStyle = '#e83e8c';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    starPath(ctx, 0, 0, s * 0.34);
    ctx.fill();
  } else {
    // star
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#160a24';
    ctx.lineWidth = Math.max(2, s * 0.07);
    starPath(ctx, 0, 0, s * 0.8);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Renders a whole cover onto a canvas of the export size.
 * spec: { layout, photos: [{img, zoom, panX, panY, grade}], caption, subtitle,
 *         titlePos, titleSize, titleColor, stickers: [{type, x, y, scale, rot}] }
 * Every panel gets its own photo and its own grade wash.
 */
export function renderCover(canvas, spec) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(spec.layout, w, h);
  const border = Math.max(3, Math.round(w * 0.004));
  rects.forEach((rect, i) => {
    const slot = spec.photos[i] || {};
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (slot.img) {
      drawPhotoInto(ctx, slot.img, rect, slot.zoom || 1, slot.panX || 0, slot.panY || 0);
    } else {
      ctx.fillStyle = '#241a33';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    washPanel(ctx, rect, GRADES[slot.grade || 'sunset']);
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = border;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  drawTitleBlock(ctx, w, h, spec);
  for (const sticker of spec.stickers || []) drawSticker(ctx, sticker, w, h);
  return canvas;
}

/** Renders the cover at full export size and returns a PNG blob. */
export function exportCoverPNG(spec, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas, spec);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('export failed'))), 'image/png');
  });
}
