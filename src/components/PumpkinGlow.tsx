import { useEffect, useRef, useState } from 'react';

const colors = ['#ffd43b', '#ff7b22', '#ef476f', '#62d9ff', '#a57cff'];

export function PumpkinGlow({ onClose }: { onClose: () => void }) {
  const [color, setColor] = useState(colors[0]); const [flicker, setFlicker] = useState(true); const [minutes, setMinutes] = useState(10); const [remaining, setRemaining] = useState(10 * 60); const lock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => { setRemaining(minutes * 60); }, [minutes]);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(value => { if (value <= 1) { onClose(); return 0; } return value - 1; }), 1000);
    void navigator.wakeLock?.request('screen').then(value => { lock.current = value; }).catch(() => undefined);
    return () => { window.clearInterval(timer); void lock.current?.release(); };
  }, [onClose]);
  const fullscreen = () => document.documentElement.requestFullscreen?.().catch(() => undefined);
  return <div className={`glow-screen ${flicker ? 'flicker' : ''}`} style={{ '--glow': color } as React.CSSProperties} role="dialog" aria-modal="true" aria-label="Pumpkin Glow">
    <div className="glow-center"><span className="glow-mark">CE</span><strong>Light It Up</strong><p>Temporarily place your phone inside the empty pumpkin to test the cuts. Adjust the carving until it looks right, then remove your phone and use a battery tea light in the finished pumpkin.</p><time>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</time></div>
    <div className="glow-controls">
      <div className="color-row" aria-label="Glow color">{colors.map(value => <button key={value} aria-label={`Use ${value}`} className={color === value ? 'selected' : ''} style={{ background: value }} onClick={() => setColor(value)} />)}</div>
      <label><input type="checkbox" checked={flicker} onChange={event => setFlicker(event.target.checked)} /> Gentle flicker</label>
      <label>Timer <select value={minutes} onChange={event => setMinutes(Number(event.target.value))}><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></label>
      <button onClick={fullscreen}>Fullscreen</button><button onClick={onClose}>End glow</button>
      <small>Preview only. Use an empty, dry pumpkin; remove the phone after testing. Never place a phone near an open flame, moisture, or trapped heat.</small>
    </div>
  </div>;
}
