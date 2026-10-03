import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { PumpkinProfile, StencilDefinition } from '../types';
import { shapePolygon } from '../lib/stencil';

export const pumpkinProfiles: PumpkinProfile[] = [
  { id: 'round', label: 'Round', scale: [1, 0.92, 0.88], ridges: 12 },
  { id: 'tall', label: 'Tall', scale: [0.82, 1.15, 0.78], ridges: 11 },
  { id: 'wide', label: 'Wide', scale: [1.2, 0.78, 0.88], ridges: 13 },
  { id: 'ribbed', label: 'Deep ribbed', scale: [1.02, 0.9, 0.9], ridges: 16 }
];

function textureFor(stencil: StencilDefinition, lit: boolean) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512; const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(512, 205, 40, 512, 250, 450); gradient.addColorStop(0, '#ffad32'); gradient.addColorStop(0.65, '#ec6418'); gradient.addColorStop(1, '#87300b'); context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);
  context.save(); context.translate(512 - 155, 105); context.scale(3.1, 3.1); context.fillStyle = lit ? '#ffd43b' : '#080302'; context.shadowColor = lit ? '#ffb000' : 'transparent'; context.shadowBlur = lit ? 15 : 0;
  for (const shape of stencil.shapes) { const points = shapePolygon(shape, 64); context.beginPath(); points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y)); context.closePath(); context.fill(); }
  context.restore();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function PumpkinViewer({ stencil, profile, lit }: { stencil: StencilDefinition; profile: PumpkinProfile; lit: boolean }) {
  const host = useRef<HTMLDivElement>(null); const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current) return; const target = host.current; target.replaceChildren(); let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(target.clientWidth, target.clientHeight); target.append(renderer.domElement);
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(34, target.clientWidth / target.clientHeight, 0.1, 100); camera.position.set(0, 0.05, 6.2);
    const geometry = new THREE.SphereGeometry(1.65, 96, 64); const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index); const angle = Math.atan2(z, x); const ridge = 1 + 0.055 * Math.cos(angle * profile.ridges) * (1 - Math.abs(y) / 1.9);
      positions.setXYZ(index, x * ridge * profile.scale[0], y * profile.scale[1], z * ridge * profile.scale[2]);
    }
    geometry.computeVertexNormals(); const texture = textureFor(stencil, lit); texture.wrapS = THREE.RepeatWrapping; texture.repeat.x = 1;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.72, metalness: 0.02, emissive: lit ? new THREE.Color('#5a2300') : new THREE.Color('#000000'), emissiveIntensity: lit ? 0.45 : 0 });
    const pumpkin = new THREE.Mesh(geometry, material); pumpkin.rotation.y = -Math.PI / 2; scene.add(pumpkin);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.62, 12), new THREE.MeshStandardMaterial({ color: '#56652c', roughness: 1 })); stem.position.y = 1.65 * profile.scale[1]; stem.rotation.z = -0.08; scene.add(stem);
    scene.add(new THREE.HemisphereLight(lit ? '#ffcf65' : '#fff1dc', '#1c0802', lit ? 2.8 : 2)); const key = new THREE.DirectionalLight('#ff8a2c', 3); key.position.set(3, 4, 5); scene.add(key);
    let dragging = false, previous = 0;
    const down = (event: PointerEvent) => { dragging = true; previous = event.clientX; renderer.domElement.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => { if (!dragging) return; pumpkin.rotation.y += (event.clientX - previous) * 0.008; previous = event.clientX; };
    const up = () => { dragging = false; };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerup', up);
    let frame = 0; const draw = () => { frame = requestAnimationFrame(draw); renderer.render(scene, camera); }; draw();
    const observer = new ResizeObserver(() => { if (!target.clientWidth || !target.clientHeight) return; renderer.setSize(target.clientWidth, target.clientHeight); camera.aspect = target.clientWidth / target.clientHeight; camera.updateProjectionMatrix(); }); observer.observe(target);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); texture.dispose(); geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [stencil, profile, lit]);
  return <div className="viewer-canvas" ref={host} role="img" aria-label={`Rotatable ${profile.label.toLowerCase()} pumpkin showing ${stencil.title}`}>
    {failed && <div className="viewer-fallback"><span>🎃</span><strong>{stencil.title}</strong><small>3D preview unavailable; printing still works.</small></div>}
  </div>;
}
