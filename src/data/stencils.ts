import type { SeasonPackManifest, StencilDefinition } from '../types';
import { maskToShapes } from '../lib/stencil';
import ghostMask from './ghost-mask.json';

const bytes = Uint8Array.from(atob(ghostMask.bits), character => character.charCodeAt(0));
const mask = new Uint8Array(ghostMask.size * ghostMask.size);
for (let index = 0; index < mask.length; index += 1) mask[index] = (bytes[index >> 3] >> (7 - (index & 7))) & 1;

export const ghostMoon: StencilDefinition = {
  id: 'ghost-moon-medium',
  title: 'Moonlit Ghost',
  category: 'Ghosts & Haunted',
  difficulty: 'Medium',
  shapes: maskToShapes(mask, ghostMask.size, ghostMask.size),
  attribution: 'AI generated source · stencil prepared by Contained Evolution · CC BY 4.0',
  minimumBridgeMm: 5
};

export const halloweenPack: SeasonPackManifest = {
  id: 'halloween', title: 'Halloween', version: '1.0.0', palette: ['#100704', '#f47b20', '#ffd43b'], stencils: [ghostMoon]
};

export const categoriesList = [ghostMoon.category];
