import { useEffect, useRef, useState } from 'react';
import { SurroundEngine } from './surround-engine.js';

/**
 * Drop-in surround-sound control panel for the Theatre player.
 *
 *   <SurroundPanel />                      finds the first <video> on the page
 *   <SurroundPanel videoRef={myRef} />     or use your own ref
 *   <SurroundPanel selector="#movie" />    or a CSS selector
 *
 * It floats in the bottom-right corner. If your player goes fullscreen by
 * fullscreening a container <div> (not the <video> itself), render the panel
 * INSIDE that container so it stays visible in fullscreen.
 */

const PRESETS = [
  ['cinema', '🎬 Cinema'],
  ['music', '🎵 Music'],
  ['dialogue', '🗣 Dialogue'],
  ['night', '🌙 Night']
];

const SLIDERS = [
  ['bass', 'Bass'],
  ['space', 'Room'],
  ['height', 'Height'],
  ['dialogue', 'Dialogue']
];

const css = {
  wrap: { position: 'fixed', right: 16, bottom: 16, zIndex: 2147483000, fontFamily: 'Segoe UI, Arial, sans-serif', color: '#e2e8f0' },
  toggle: { padding: '10px 16px', borderRadius: 999, border: '1px solid #334155', background: 'rgba(15,23,42,.92)', color: '#e2e8f0', cursor: 'pointer', fontWeight: 700, backdropFilter: 'blur(6px)' },
  toggleOn: { background: '#2563eb', border: '1px solid #3b82f6' },
  panel: { width: 300, marginBottom: 10, padding: 14, borderRadius: 14, background: 'rgba(15,23,42,.96)', border: '1px solid #23324f', boxShadow: '0 12px 40px rgba(0,0,0,.5)' },
  title: { margin: '0 0 8px', fontSize: 15, color: '#93c5fd' },
  status: { margin: '0 0 10px', fontSize: 12, color: '#a5b4fc', lineHeight: 1.5 },
  row: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  btn: { padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 },
  btnOn: { background: '#2563eb', border: '1px solid #3b82f6' },
  select: { width: '100%', padding: 6, marginBottom: 8, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 },
  label: { display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 6 },
  range: { width: '100%' },
  warn: { margin: '0 0 10px', padding: 8, borderRadius: 8, background: 'rgba(245,158,11,.15)', border: '1px solid #f59e0b', fontSize: 12, lineHeight: 1.45, color: '#fde68a' },
  err: { margin: '0 0 10px', padding: 8, borderRadius: 8, background: 'rgba(239,68,68,.15)', border: '1px solid #ef4444', fontSize: 12, color: '#fecaca' }
};

// Web Audio mutes media that comes from another origin unless CORS is set up
function crossOriginProblem(el) {
  try {
    const src = el.currentSrc || el.src;
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) return null;
    const url = new URL(src, window.location.href);
    if (url.origin !== window.location.origin && !el.crossOrigin) return url.origin;
  } catch (e) {
    /* ignore */
  }
  return null;
}

export default function SurroundPanel({
  videoRef,
  selector = 'video',
  defaultOpen = false,
  engine: providedEngine = null
}) {
  const [engine, setEngine] = useState(null);
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(defaultOpen);
  const [error, setError] = useState('');
  const [corsOrigin, setCorsOrigin] = useState(null);
  const wanted = useRef({ preset: 'off', mode: 'speakers', params: null });

  // Reuse the TheatrePlayer-owned engine when supplied.
  // This is critical: do not create a second MediaElementSourceNode.
  useEffect(() => {
    let current = null;
    let unsubscribe = null;

    const look = () => {
      const el =
        (videoRef && videoRef.current) ||
        document.querySelector(selector);

      if (!el) return;

      if (el === current && engine) return;

      current = el;

      if (unsubscribe) unsubscribe();

      const eng =
        providedEngine ||
        el.__surroundEngine ||
        SurroundEngine.attach(el);

      unsubscribe = eng.onChange((s) => {
        wanted.current = {
          preset: s.preset,
          mode: s.requestedMode,
          params: s.params
        };

        setState(s);
      });

      const w = wanted.current;

      if (w.preset !== 'off' && !eng.getState().active) {
        eng.setOutputMode(w.mode);

        eng.enable(w.preset)
          .then(() => {
            if (w.params) {
              Object.entries(w.params).forEach(([k, v]) => {
                eng.setParam(k, v);
              });
            }
          })
          .catch((e) =>
            setError(String(e.message || e))
          );
      }

      setEngine(eng);
      setState(eng.getState());
    };

    look();

    // Keep support for a media element being replaced by React.
    const id = setInterval(look, 700);

    return () => {
      clearInterval(id);

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [videoRef, selector, providedEngine, engine]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  const choose = (name) =>
    run(async () => {
      if (name === 'off') engine.disable();
      else await engine.enable(name);
      setCorsOrigin(name === 'off' ? null : crossOriginProblem(engine.el));
    });

  const active = !!(state && state.active);

  return (
    <div style={css.wrap}>
      {open && (
        <div style={css.panel}>
          <h3 style={css.title}>🔊 Surround Sound</h3>

          {!engine && <p style={css.status}>Waiting for the video player…</p>}

          {engine && state && (
            <>
              <p style={css.status}>
                {active ? `ON · ${state.preset}` : 'Off (original sound)'}
                <br />
                Output: {state.outputMode} · Source: {state.layout}
                {state.requestedMode !== state.outputMode && state.requestedMode !== 'auto'
                  ? ` · this device has only ${state.maxChannels} channels`
                  : ''}
              </p>

              {corsOrigin && (
                <p style={css.warn}>
                  ⚠ This video comes from {corsOrigin}. Add crossOrigin="anonymous" to the &lt;video&gt;
                  and enable CORS on that server, otherwise the browser will play it silent while
                  Surround is on.
                </p>
              )}
              {error && <p style={css.err}>{error}</p>}

              <div style={css.row}>
                {PRESETS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    style={{ ...css.btn, ...(active && state.preset === id ? css.btnOn : null) }}
                    onClick={() => choose(id)}
                  >
                    {label}
                  </button>
                ))}
                <button type="button" style={css.btn} onClick={() => choose('off')}>
                  Off
                </button>
              </div>

              <select
                style={css.select}
                value={state.requestedMode}
                onChange={(e) => run(async () => engine.setOutputMode(e.target.value))}
              >
                <option value="speakers">Stereo tower speakers / TV</option>
                <option value="headphones">Headphones (binaural)</option>
                <option value="multichannel">5.1 speakers / receiver (HDMI)</option>
                <option value="auto">Auto</option>
              </select>

              <select
                style={css.select}
                value={state.layoutForced ? state.layout : 'auto'}
                onChange={(e) => engine.setSourceLayout(e.target.value)}
              >
                <option value="auto">Source: auto-detect</option>
                <option value="stereo">Source: stereo (up-mix)</option>
                <option value="5.1">Source: real 5.1</option>
              </select>

              {SLIDERS.map(([key, label]) => (
                <label key={key} style={css.label}>
                  {label}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    style={css.range}
                    value={state.params[key]}
                    onChange={(e) => engine.setParam(key, e.target.value)}
                  />
                </label>
              ))}
            </>
          )}
        </div>
      )}

      <button
        type="button"
        style={{ ...css.toggle, ...(active ? css.toggleOn : null) }}
        onClick={() => setOpen((o) => !o)}
      >
        🔊 Surround{active ? ' ON' : ''}
      </button>
    </div>
  );
}
