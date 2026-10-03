import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { halloweenPack } from '../src/data/stencils';
import { buildStencilPdf, createTransferPlan } from '../src/lib/pdf';
import { polygon } from '../src/lib/stencil';

describe('print PDF', () => {
  it.each([['Letter', 612, 792], ['A4', 595.28, 841.89]] as const)('builds a one-page calibrated %s document', async (paper, expectedWidth, expectedHeight) => {
    const bytes = await buildStencilPdf(halloweenPack.stencils[0], { paper, widthMm: 160, heightMm: 160 });
    expect(bytes.byteLength).toBeGreaterThan(3000);
    const document = await PDFDocument.load(bytes); const [page] = document.getPages();
    expect(document.getPageCount()).toBe(1); expect(page.getWidth()).toBeCloseTo(expectedWidth, 0); expect(page.getHeight()).toBeCloseTo(expectedHeight, 0);
  });

  it('places puncture tips no more than 2 mm apart on a cut edge', () => {
    const stencil = { ...halloweenPack.stencils[0], shapes: [polygon([[10, 10], [90, 10], [90, 90], [10, 90]])] };
    const points = createTransferPlan(stencil, { paper: 'Letter', widthMm: 160, heightMm: 160 }).points;
    expect(points.length).toBeGreaterThan(250);
    for (let i = 1; i < points.length; i += 1) {
      const distance = Math.hypot((points[i].x - points[i - 1].x) * 1.6, (points[i].y - points[i - 1].y) * 1.6);
      expect(distance).toBeLessThanOrEqual(2.01);
    }
  });

  it('rejects oversized paper output instead of shrinking it', async () => {
    await expect(buildStencilPdf(halloweenPack.stencils[0], { paper: 'Letter', widthMm: 200, heightMm: 230 })).rejects.toThrow(/actual size/);
  });
});
