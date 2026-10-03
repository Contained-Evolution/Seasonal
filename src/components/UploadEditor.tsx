import { useEffect, useRef, useState } from 'react';
import type { StencilDefinition, ValidationResult } from '../types';
import { GRID_SIZE, maskToShapes, validateMask } from '../lib/stencil';

type PaintMode = 'cut' | 'keep';

function smoothMask(source: Uint8Array, amount: number): Uint8Array {
  let mask = source;
  for (let pass = 0; pass < amount; pass += 1) {
    const next = new Uint8Array(mask.length);
    for (let y = 0; y < GRID_SIZE; y += 1) for (let x = 0; x < GRID_SIZE; x += 1) {
      let total = 0; let count = 0;
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        const nx = x + ox; const ny = y + oy;
        if (nx >= 0 && ny >= 0 && nx < GRID_SIZE && ny < GRID_SIZE) { total += mask[ny * GRID_SIZE + nx]; count += 1; }
      }
      next[y * GRID_SIZE + x] = total / count >= 0.5 ? 1 : 0;
    }
    mask = next;
  }
  return mask;
}

function repair(mask: Uint8Array): Uint8Array {
  const next = new Uint8Array(mask);
  for (let y = 2; y < GRID_SIZE - 2; y += 1) for (let x = 2; x < GRID_SIZE - 2; x += 1) {
    const index = y * GRID_SIZE + x;
    if (mask[index]) continue;
    const nearbyCut = mask[index - 1] + mask[index + 1] + mask[index - GRID_SIZE] + mask[index + GRID_SIZE];
    if (nearbyCut >= 3) next[index] = 1;
  }
  return next;
}

export function UploadEditor({ onUse }: { onUse: (stencil: StencilDefinition, validation: ValidationResult) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<ImageData | null>(null);
  const [mask, setMask] = useState<Uint8Array>(() => new Uint8Array(GRID_SIZE * GRID_SIZE));
  const [threshold, setThreshold] = useState(128);
  const [smoothing, setSmoothing] = useState(1);
  const [invert, setInvert] = useState(false);
  const [mode, setMode] = useState<PaintMode>('cut');
  const [fileName, setFileName] = useState('');
  const validation = validateMask(mask, GRID_SIZE, GRID_SIZE, 3);

  const publish = (next: Uint8Array) => {
    setMask(next);
    onUse({ id: 'custom-upload', title: fileName || 'My stencil', category: 'My upload', difficulty: 'Medium', shapes: maskToShapes(next, GRID_SIZE, GRID_SIZE), attribution: 'User-created locally', minimumBridgeMm: 4 }, validateMask(next, GRID_SIZE, GRID_SIZE, 3));
  };

  const processSource = (nextThreshold = threshold, nextSmoothing = smoothing, nextInvert = invert) => {
    const image = sourceRef.current; if (!image) return;
    const next = new Uint8Array(GRID_SIZE * GRID_SIZE);
    for (let index = 0; index < next.length; index += 1) {
      const offset = index * 4; const luminance = image.data[offset] * 0.2126 + image.data[offset + 1] * 0.7152 + image.data[offset + 2] * 0.0722;
      next[index] = (nextInvert ? luminance > nextThreshold : luminance < nextThreshold) ? 1 : 0;
    }
    publish(smoothMask(next, nextSmoothing));
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const context = canvas.getContext('2d'); if (!context) return;
    context.imageSmoothingEnabled = false; context.fillStyle = '#fff'; context.fillRect(0, 0, GRID_SIZE, GRID_SIZE); context.fillStyle = '#080302';
    for (let y = 0; y < GRID_SIZE; y += 1) for (let x = 0; x < GRID_SIZE; x += 1) if (mask[y * GRID_SIZE + x]) context.fillRect(x, y, 1, 1);
  }, [mask]);

  const loadFile = (file?: File) => {
    if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return;
    setFileName(file.name.replace(/\.[^.]+$/, ''));
    const image = new Image(); const url = URL.createObjectURL(file);
    image.onload = () => {
      const scratch = document.createElement('canvas'); scratch.width = GRID_SIZE; scratch.height = GRID_SIZE; const context = scratch.getContext('2d')!;
      context.fillStyle = '#fff'; context.fillRect(0, 0, GRID_SIZE, GRID_SIZE);
      const scale = Math.min(GRID_SIZE / image.width, GRID_SIZE / image.height); const width = image.width * scale; const height = image.height * scale;
      context.drawImage(image, (GRID_SIZE - width) / 2, (GRID_SIZE - height) / 2, width, height); sourceRef.current = context.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
      URL.revokeObjectURL(url); processSource();
    };
    image.src = url;
  };

  const paint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!fileName || !(event.buttons & 1)) return; const bounds = event.currentTarget.getBoundingClientRect();
    const cx = Math.floor(((event.clientX - bounds.left) / bounds.width) * GRID_SIZE); const cy = Math.floor(((event.clientY - bounds.top) / bounds.height) * GRID_SIZE); const next = new Uint8Array(mask);
    for (let y = cy - 3; y <= cy + 3; y += 1) for (let x = cx - 3; x <= cx + 3; x += 1) if (x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE && Math.hypot(x - cx, y - cy) <= 3) next[y * GRID_SIZE + x] = mode === 'cut' ? 1 : 0;
    publish(next);
  };

  return <section className="tool-card upload-editor" aria-labelledby="upload-title">
    <div className="section-heading"><div><span className="eyebrow">PRIVATE BY DESIGN</span><h2 id="upload-title">Turn your image into a stencil</h2></div><span className="privacy-pill">Never uploaded</span></div>
    <p>Your picture stays in this browser. Use a high-contrast image, then repair any floating pieces before printing.</p>
    <label className="file-button">Choose PNG, JPEG, or WebP<input data-testid="image-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => loadFile(event.target.files?.[0])} /></label>
    {fileName && <div className="editor-layout">
      <canvas ref={canvasRef} width={GRID_SIZE} height={GRID_SIZE} aria-label="Editable black and white stencil" onPointerDown={paint} onPointerMove={paint} />
      <div className="editor-controls">
        <label>Threshold <output>{threshold}</output><input type="range" min="25" max="230" value={threshold} onChange={event => { const value = Number(event.target.value); setThreshold(value); processSource(value, smoothing, invert); }} /></label>
        <label>Smoothing <output>{smoothing}</output><input type="range" min="0" max="3" value={smoothing} onChange={event => { const value = Number(event.target.value); setSmoothing(value); processSource(threshold, value, invert); }} /></label>
        <label className="check"><input type="checkbox" checked={invert} onChange={event => { setInvert(event.target.checked); processSource(threshold, smoothing, event.target.checked); }} /> Invert cut/keep</label>
        <div className="segmented" aria-label="Paint mode"><button className={mode === 'cut' ? 'active' : ''} onClick={() => setMode('cut')}>Paint cut</button><button className={mode === 'keep' ? 'active' : ''} onClick={() => setMode('keep')}>Paint keep</button></div>
        <button className="secondary" onClick={() => publish(repair(mask))}>Repair thin gaps</button>
        <div className={`validation ${validation.valid ? 'valid' : 'invalid'}`} role="status"><strong>{validation.valid ? '✓ Carve-ready' : '⚠ Needs connectors'}</strong><span>{validation.message || 'Add solid bridges so every retained piece stays attached.'}</span></div>
      </div>
    </div>}
  </section>;
}
