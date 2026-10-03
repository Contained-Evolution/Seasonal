import { describe, expect, it } from 'vitest';
import { categoriesList, halloweenPack } from '../src/data/stencils';
import { createTransferPlan } from '../src/lib/pdf';
import { pointInShape, validateMask, validateStencil } from '../src/lib/stencil';

describe('Halloween pack', () => {
  it('ships the AI-generated medium practice design', () => {
    expect(categoriesList).toEqual(['Ghosts & Haunted']);
    expect(halloweenPack.stencils).toHaveLength(1);
    expect(halloweenPack.stencils[0]).toMatchObject({ title: 'Moonlit Ghost', difficulty: 'Medium' });
  });

  it('ships only structurally valid built-in stencils', () => {
    const invalid = halloweenPack.stencils.map(stencil => ({ title: stencil.title, ...validateStencil(stencil) })).filter(result => !result.valid);
    expect(invalid).toEqual([]);
  });

  it('has eye cutouts and no loose ghost face', () => {
    const item = halloweenPack.stencils[0];
    expect(item.shapes.some(shape => pointInShape(56, 31, shape))).toBe(true);
    expect(item.shapes.some(shape => pointInShape(66, 35, shape))).toBe(true);
    expect(item.shapes.some(shape => pointInShape(62, 32, shape))).toBe(false);
    expect(validateStencil(item).islandCount).toBe(0);
  });

  it('detects a retained island surrounded by cuts', () => {
    const width = 20; const mask = new Uint8Array(width * width);
    for (let x = 5; x <= 14; x += 1) { mask[5 * width + x] = 1; mask[14 * width + x] = 1; }
    for (let y = 5; y <= 14; y += 1) { mask[y * width + 5] = 1; mask[y * width + 14] = 1; }
    expect(validateMask(mask, width, width)).toMatchObject({ valid: false, islandCount: 1 });
  });

  it('gives every transfer point a lower-left numeric grid coordinate', () => {
    const plan = createTransferPlan(halloweenPack.stencils[0], { paper: 'Letter', widthMm: 160, heightMm: 160 });
    expect(plan.points.length).toBeGreaterThan(30);
    for (const point of plan.points) {
      expect(point.row).toBe(Math.floor(((160 - point.y * 1.6) / 5)) + 1);
      expect(point.column).toBe(Math.floor((point.x * 1.6) / 5) + 1);
    }
  });
});
