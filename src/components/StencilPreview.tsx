import type { Shape, StencilDefinition } from '../types';
import { shapePolygon } from '../lib/stencil';

function ShapeElement({ shape }: { shape: Shape }) {
  if (shape.type === 'ellipse') return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
  if (shape.type === 'rect') return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} />;
  return <polygon points={shape.points.map(point => point.join(',')).join(' ')} />;
}

export function StencilPreview({ stencil, className = '' }: { stencil: StencilDefinition; className?: string }) {
  return <svg className={className} viewBox="0 0 100 100" role="img" aria-label={`${stencil.title} cutout preview`}>
    <g fill="currentColor" stroke="currentColor" strokeWidth="0.8">{stencil.shapes.map((shape, index) => <ShapeElement key={`${stencil.id}-${index}-${shapePolygon(shape).length}`} shape={shape} />)}</g>
  </svg>;
}
