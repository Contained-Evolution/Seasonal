import { PDFDocument, StandardFonts, grayscale, rgb } from 'pdf-lib';
import type { Shape, StencilDefinition, TransferPlan } from '../types';
import { sampleTransferPoints, shapePolygon } from './stencil';

const PT_PER_MM = 72 / 25.4;
const paperSizes = {
  Letter: [215.9, 279.4] as const,
  A4: [210, 297] as const
};

export interface PdfOptions {
  paper: 'Letter' | 'A4';
  widthMm: number;
  heightMm: number;
}

export function createTransferPlan(stencil: StencilDefinition, options: PdfOptions): TransferPlan {
  return { ...options, gridPitchMm: 5, points: sampleTransferPoints(stencil.shapes, options.widthMm, options.heightMm, 2) };
}

function mapPoint(point: readonly [number, number], originX: number, originY: number, widthMm: number, heightMm: number): [number, number] {
  return [originX + (point[0] / 100) * widthMm * PT_PER_MM, originY + ((100 - point[1]) / 100) * heightMm * PT_PER_MM];
}

function drawShape(page: ReturnType<PDFDocument['addPage']>, shape: Shape, originX: number, originY: number, widthMm: number, heightMm: number) {
  const points = shapePolygon(shape, 64);
  const path = points.map((point, index) => {
    const x = (point[0] / 100) * widthMm * PT_PER_MM;
    const y = (point[1] / 100) * heightMm * PT_PER_MM;
    return `${index ? 'L' : 'M'} ${x.toFixed(3)} ${y.toFixed(3)}`;
  }).join(' ') + ' Z';
  page.drawSvgPath(path, { x: originX, y: originY + heightMm * PT_PER_MM, color: grayscale(0) });
}

export async function buildStencilPdf(stencil: StencilDefinition, options: PdfOptions): Promise<Uint8Array> {
  const document = await PDFDocument.create(); const font = await document.embedFont(StandardFonts.Helvetica); const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const [paperWidthMm, paperHeightMm] = paperSizes[options.paper]; const page = document.addPage([paperWidthMm * PT_PER_MM, paperHeightMm * PT_PER_MM]);
  const marginMm = 5; const headerMm = 25; const footerMm = 27;
  const availableWidth = Math.min(200, paperWidthMm - marginMm * 2); const availableHeight = paperHeightMm - headerMm - footerMm;
  if (!Number.isFinite(options.widthMm) || !Number.isFinite(options.heightMm) || options.widthMm < 60 || options.heightMm < 60 || options.widthMm > availableWidth || options.heightMm > availableHeight) {
    throw new RangeError(`Design must fit ${Math.floor(availableWidth)} x ${Math.floor(availableHeight)} mm on ${options.paper} at actual size.`);
  }
  const widthMm = options.widthMm; const heightMm = options.heightMm;
  const originX = ((paperWidthMm - widthMm) / 2) * PT_PER_MM; const originY = footerMm * PT_PER_MM + ((availableHeight - heightMm) / 2) * PT_PER_MM;

  page.drawText(`${stencil.title} · ${stencil.difficulty}`, { x: marginMm * PT_PER_MM, y: (paperHeightMm - 12) * PT_PER_MM, size: 17, font: bold, color: grayscale(0) });
  page.drawText('BLACK = REMOVE · WHITE = KEEP · PUNCTURE THE DOTS · CUT IN ARROW DIRECTION', { x: marginMm * PT_PER_MM, y: (paperHeightMm - 19) * PT_PER_MM, size: 7.3, font: bold, color: grayscale(0.1) });
  page.drawText(`Print at 100% · actual design ${widthMm.toFixed(0)} × ${heightMm.toFixed(0)} mm · ${stencil.attribution}`, { x: marginMm * PT_PER_MM, y: (paperHeightMm - 23.5) * PT_PER_MM, size: 6.4, font, color: grayscale(0.3) });

  const gridPitchPt = 5 * PT_PER_MM;
  for (let x = originX; x <= originX + widthMm * PT_PER_MM + 0.1; x += gridPitchPt) page.drawLine({ start: { x, y: originY }, end: { x, y: originY + heightMm * PT_PER_MM }, thickness: 0.2, color: grayscale(0.82) });
  for (let y = originY; y <= originY + heightMm * PT_PER_MM + 0.1; y += gridPitchPt) page.drawLine({ start: { x: originX, y }, end: { x: originX + widthMm * PT_PER_MM, y }, thickness: 0.2, color: grayscale(0.82) });
  for (let row = 0; row <= Math.floor(heightMm / 5); row += 5) {
    page.drawText(String(row + 1), { x: originX - 4.2 * PT_PER_MM, y: originY + row * gridPitchPt - 0.6 * PT_PER_MM, size: 5.5, font: bold, color: grayscale(0.3) });
  }
  for (let column = 0; column <= Math.floor(widthMm / 5); column += 5) page.drawText(String(column + 1), { x: originX + column * gridPitchPt, y: originY - 3.2 * PT_PER_MM, size: 5.5, font: bold, color: grayscale(0.3) });
  page.drawText('X', { x: originX + widthMm * PT_PER_MM + 1.5 * PT_PER_MM, y: originY - 3.2 * PT_PER_MM, size: 6, font: bold, color: grayscale(0) });
  page.drawText('Y', { x: originX - 4.2 * PT_PER_MM, y: originY + heightMm * PT_PER_MM + 1.5 * PT_PER_MM, size: 6, font: bold, color: grayscale(0) });

  for (const shape of stencil.shapes) drawShape(page, shape, originX, originY, widthMm, heightMm);
  for (const shape of stencil.shapes) {
    const transfer = sampleTransferPoints([shape], widthMm, heightMm, 2);
    for (let index = 0; index < transfer.length; index += 1) {
    const point = transfer[index];
    const [x, y] = mapPoint([point.x, point.y], originX, originY, widthMm, heightMm);
    page.drawCircle({ x, y, size: 0.42 * PT_PER_MM, color: grayscale(1), borderColor: grayscale(0), borderWidth: 0.17 * PT_PER_MM });
    if (index % 35 !== 17) continue;
    const dx = point.directionX; const dy = point.directionY;
    const length = Math.hypot(dx, dy) || 1; const ux = dx / length; const uy = dy / length;
    const nx = -uy; const ny = ux; const size = PT_PER_MM;
    const cx = x + nx * 2.5 * size; const cy = y + ny * 2.5 * size;
    const tail = { x: cx - ux * 2.5 * size, y: cy - uy * 2.5 * size };
    const tip = { x: cx + ux * 2.5 * size, y: cy + uy * 2.5 * size };
    page.drawLine({ start: tail, end: tip, thickness: 0.45 * size, color: grayscale(0) });
    for (const side of [-1, 1]) page.drawLine({ start: tip, end: { x: tip.x - ux * 1.3 * size + nx * side * 0.8 * size, y: tip.y - uy * 1.3 * size + ny * side * 0.8 * size }, thickness: 0.45 * size, color: grayscale(0) });
    }
  }

  const calibrationY = 14 * PT_PER_MM; const calibrationX = ((paperWidthMm - 100) / 2) * PT_PER_MM;
  page.drawLine({ start: { x: calibrationX, y: calibrationY }, end: { x: calibrationX + 100 * PT_PER_MM, y: calibrationY }, thickness: 1, color: grayscale(0) });
  page.drawLine({ start: { x: calibrationX, y: calibrationY - 2 * PT_PER_MM }, end: { x: calibrationX, y: calibrationY + 2 * PT_PER_MM }, thickness: 1, color: grayscale(0) });
  page.drawLine({ start: { x: calibrationX + 100 * PT_PER_MM, y: calibrationY - 2 * PT_PER_MM }, end: { x: calibrationX + 100 * PT_PER_MM, y: calibrationY + 2 * PT_PER_MM }, thickness: 1, color: grayscale(0) });
  page.drawText('This line must measure exactly 100 mm. Turn off “Fit to page.”', { x: calibrationX, y: calibrationY - 5 * PT_PER_MM, size: 6.5, font, color: grayscale(0.2) });
  page.drawText('Adult supervision required. Use a pumpkin carving tool; protect hands and work surface.', { x: marginMm * PT_PER_MM, y: 3.5 * PT_PER_MM, size: 6.2, font, color: grayscale(0.25) });
  return document.save();
}

export async function downloadStencilPdf(stencil: StencilDefinition, options: PdfOptions): Promise<void> {
  const bytes = await buildStencilPdf(stencil, options);
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }); const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${stencil.id}-${options.paper.toLowerCase()}.pdf`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
