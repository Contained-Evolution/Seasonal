import { useEffect, useMemo, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { PumpkinViewer, pumpkinProfiles } from './components/PumpkinViewer';
import { StencilPreview } from './components/StencilPreview';
import { UploadEditor } from './components/UploadEditor';
import { PumpkinGlow } from './components/PumpkinGlow';
import { categoriesList, halloweenPack } from './data/stencils';
import { downloadStencilPdf } from './lib/pdf';
import { validateStencil } from './lib/stencil';
import type { StencilDefinition, ValidationResult } from './types';

function LightItUp({ onOpen }: { onOpen: () => void }) {
  return <button className="light-it-up" onClick={onOpen} aria-label="Light it up: open the phone lighting test">
    <svg className="light-arch" viewBox="0 0 180 70" aria-hidden="true">
      <defs><path id="light-curve" d="M 18 60 Q 90 -2 162 60" /></defs>
      <text><textPath href="#light-curve" startOffset="50%" textAnchor="middle">LIGHT IT UP</textPath></text>
    </svg>
    <span className="glowing-pumpkin" aria-hidden="true"><i /><b>▲</b><b>▲</b><em>⌣</em></span>
    <small>PHONE TEST</small>
  </button>;
}

function SpiderHelper() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [open, setOpen] = useState(false);
  const [motion, setMotion] = useState(!reduceMotion);
  const [height, setHeight] = useState(31);
  const busy = useRef(false);

  useEffect(() => {
    const move = () => {
      if (!motion || busy.current) return;
      busy.current = true;
      window.setTimeout(() => {
        setHeight(18 + Math.random() * 58);
        busy.current = false;
      }, 180);
    };
    window.addEventListener('scroll', move, { passive: true });
    return () => window.removeEventListener('scroll', move);
  }, [motion]);

  return <>
    <div className={`spider-follower ${motion ? 'moving' : ''}`} style={{ '--spider-height': `${height}vh` } as React.CSSProperties}>
      <span className="spider-thread" aria-hidden="true" />
      <button className="helper-spider" onClick={() => setOpen(true)} aria-label="Open help and settings">🕷️</button>
    </div>
    {open && <div className="help-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setOpen(false); }}>
      <section className="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <button className="panel-close" onClick={() => setOpen(false)} aria-label="Close help and settings">×</button>
        <span className="eyebrow">YOUR WEB GUIDE</span>
        <h2 id="help-title">Help &amp; settings</h2>
        <div className="help-list">
          <p><strong>Pick.</strong> Choose a stencil or upload an image. Your upload stays in this browser.</p>
          <p><strong>Preview.</strong> Rotate the pumpkin and use Preview glow to check every connector.</p>
          <p><strong>Print.</strong> Download the PDF, print at 100%, and verify its 100 mm scale line. Tape the sheet to the pumpkin with its center over the carving face.</p>
          <p><strong>Connections.</strong> None required. Seasonal has no account, login, or cloud upload.</p>
        </div>
        <label className="motion-setting"><input type="checkbox" checked={motion} onChange={event => setMotion(event.target.checked)} /> Let the spider follow while I scroll</label>
      </section>
    </div>}
  </>;
}

export default function App() {
  const [selected, setSelected] = useState<StencilDefinition>(halloweenPack.stencils[0]);
  const [validation, setValidation] = useState<ValidationResult>(() => validateStencil(halloweenPack.stencils[0]));
  const [profileId, setProfileId] = useState('round');
  const [lit, setLit] = useState(false);
  const [category, setCategory] = useState('All');
  const [paper, setPaper] = useState<'Letter' | 'A4'>('Letter');
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(160);
  const [glow, setGlow] = useState(false);
  const profile = pumpkinProfiles.find(item => item.id === profileId)!;
  const visible = useMemo(() => category === 'All' ? halloweenPack.stencils : halloweenPack.stencils.filter(item => item.category === category), [category]);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const choose = (item: StencilDefinition, result = validateStencil(item)) => {
    setSelected(item);
    setValidation(result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <>
    <div className="ambient" aria-hidden="true"><span>👻</span><span>🐈‍⬛</span><span>🦇</span></div>
    <SpiderHelper />
    <main id="top">
      <section className="halloween-masthead" aria-label="Happy Halloween">
        <a className="logo-home" href="#top" aria-label="Contained Evolution Seasonal home">
          <img src="/contained-evolution-logo.png" alt="Contained Evolution" />
          <span className="logo-web" aria-hidden="true">🕸️</span>
        </a>
        <div className="halloween-title"><span aria-hidden="true">🦇</span><h2>Happy Halloween</h2><span aria-hidden="true">🦇</span><i aria-hidden="true">🕸️</i></div>
        <LightItUp onOpen={() => setGlow(true)} />
      </section>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">HALLOWEEN · FREE FOREVER</span>
          <h1>Halloween is here!<br /><em>Let&apos;s carve out some time for crafts.</em></h1>
          <p>Start with the Moonlit Ghost practice stencil, or turn your own high-contrast image into a cut pattern in your browser.</p>
        </div>
        <div className="pumpkin-stage"><PumpkinViewer stencil={selected} profile={profile} lit={lit} /><div className="selected-label"><span>NOW PREVIEWING</span><strong>{selected.title}</strong><small>{selected.category} · {selected.difficulty}</small></div></div>
      </section>

      <section className="control-deck" aria-label="Pumpkin preview controls">
        <div><span className="control-label">Pumpkin shape</span><div className="segmented">{pumpkinProfiles.map(item => <button key={item.id} className={profileId === item.id ? 'active' : ''} onClick={() => setProfileId(item.id)}>{item.label}</button>)}</div></div>
        <label className="light-toggle"><input type="checkbox" checked={lit} onChange={event => setLit(event.target.checked)} /><span>Preview glow</span></label>
      </section>

      <section className="library" aria-labelledby="library-title"><div className="section-heading"><div><span className="eyebrow">FIRST PRACTICE DESIGN</span><h2 id="library-title">Pick your stencil</h2></div><p>The black shapes are the holes to cut. The ghost face stays attached by two uncut bridges.</p></div>
        <div className="filters"><button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>All</button>{categoriesList.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="stencil-grid">{visible.map(item => <button data-testid="stencil-card" key={item.id} className={`stencil-card ${selected.id === item.id ? 'selected' : ''}`} onClick={() => choose(item)}><StencilPreview stencil={item} /><span><strong>{item.title}</strong><small>{item.difficulty}</small></span></button>)}</div>
      </section>

      <UploadEditor onUse={choose} />

      <section className="tool-card print-card" aria-labelledby="print-title"><div className="section-heading"><div><span className="eyebrow">CALIBRATED TRANSFER SHEET</span><h2 id="print-title">Print {selected.title}</h2></div><div className={`validation compact ${validation.valid ? 'valid' : 'invalid'}`}><strong>{validation.valid ? '✓ Carve-ready' : '⚠ Fix connectors first'}</strong></div></div>
        <figure className="print-art-preview"><StencilPreview stencil={selected} /><figcaption><strong>This is the picture you will carve.</strong><span>Black shapes become holes. White stays pumpkin skin. The PDF adds the numbered grid, puncture dots, and arrows.</span></figcaption></figure>
        <div className="print-controls"><label>Paper<select value={paper} onChange={event => setPaper(event.target.value as 'Letter' | 'A4')}><option>Letter</option><option>A4</option></select></label><label>Carving width (mm)<input type="number" min="60" max="200" value={width} onChange={event => setWidth(Math.max(60, Math.min(200, Number(event.target.value))))} /></label><label>Carving height (mm)<input type="number" min="60" max="220" value={height} onChange={event => setHeight(Math.max(60, Math.min(220, Number(event.target.value))))} /></label><button className="primary" disabled={!validation.valid} onClick={() => void downloadStencilPdf(selected, { paper, widthMm: width, heightMm: height })}>Download print PDF</button></div>
        <p className="print-note">Print at 100% and check the 100 mm line. Center the design on a smooth pumpkin face, tape the paper flat, then puncture each dot about 2 mm apart. Remove the black areas, following the arrows along each edge. Leave the two white bridges uncut so the ghost face stays attached.</p>
      </section>
    </main>
    <footer><div className="candy-line" aria-hidden="true">🍬 ◼︎ 🍭 ▲ 🍬 ▲ 🍫 ▲ 🍭 ◼︎ 🍬 ▲ 🍫 ▲ 🍬 ◼︎ 🍭</div><strong>Seasonal by Contained Evolution</strong><span>Private. Accountless. Made to be used.</span><small>Adult supervision required for carving. AI generated practice art CC BY 4.0 · App code Apache-2.0.</small></footer>
    {needRefresh && <div className="update-toast" role="status">A fresh version is ready.<button onClick={() => void updateServiceWorker(true)}>Update now</button></div>}
    {glow && <PumpkinGlow onClose={() => setGlow(false)} />}
  </>;
}
