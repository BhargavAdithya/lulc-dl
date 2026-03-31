'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

type PredictionResult = {
  segmentation_mask: string;
  overlay: string;
  annotated: string;
  class_stats: Record<string, number>;
};

const CLASS_COLORS: Record<string, string> = {
  Barren_Land:     '#f4a460',
  'Built-up_Area': '#dc143c',
  Crop:            '#ffff00',
  Forest:          '#008000',
  Water:           '#0000ff',
  Unclassified:    '#000000',
};

const TABS = [
  { key: 'segmentation_mask', label: 'Segmentation Mask' },
  { key: 'overlay',           label: 'RGB + Overlay'     },
  { key: 'annotated',         label: 'Annotated'         },
] as const;

type TabKey = typeof TABS[number]['key'];

const STEPS = [
  { id: 1, label: 'Preprocessing bands',        duration: 6000  },
  { id: 2, label: 'Sliding window prediction',  duration: 10000 },
  { id: 3, label: 'Generating outputs',         duration: 4000  },
];

function downloadImage(b64: string, filename: string) {
  const link    = document.createElement('a');
  link.href     = `data:image/png;base64,${b64}`;
  link.download = filename;
  link.click();
}

export default function Home() {
  const [file,        setFile]        = useState<File | null>(null);
  const [result,      setResult]      = useState<PredictionResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<TabKey>('segmentation_mask');
  const [drag,        setDrag]        = useState(false);
  const [activeStep,  setActiveStep]  = useState(0);   // 0 = none, 1/2/3 = step index
  const inputRef   = useRef<HTMLInputElement>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear timers on unmount
  useEffect(() => () => stepTimers.current.forEach(clearTimeout), []);

  const startStepAnimation = () => {
    setActiveStep(1);
    let elapsed = 0;
    STEPS.forEach((step, i) => {
      const t = setTimeout(() => setActiveStep(i + 1), elapsed);
      stepTimers.current.push(t);
      elapsed += step.duration;
    });
  };

  const stopStepAnimation = () => {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
    setActiveStep(0);
  };

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.tif')) {
      setError('Please upload a .tif file.');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const predict = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    startStepAnimation();

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${BACKEND}/api/predict`, {
        method: 'POST',
        body:   form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data: PredictionResult = await res.json();
      stopStepAnimation();
      setResult(data);
      setActiveTab('segmentation_mask');
    } catch (e: unknown) {
      stopStepAnimation();
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <main className="root">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">

          {/* Left logos */}
          <div className="header-logos">
            <img src="https://iittnif.com/images/logos/IITT_InIf_svg2-01.png" alt="IITT NIF" className="header-logo" />
            <img src="https://cse.iittp.ac.in/assets/images/iittp-logo.png"    alt="IIT Tirupati" className="header-logo" />
          </div>

          {/* Centre title */}
          <div className="header-center">
            <div className="logo-mark">🛰️</div>
            <div>
              <h1 className="site-title">LandCover<span className="accent">AI</span></h1>
              <p className="site-sub">Sentinel-2 Land Use Classification</p>
            </div>
          </div>

          {/* Right logos */}
          <div className="header-logos">
            <img src="https://d35xcwcl37xo08.cloudfront.net/current-affairs-wp-uploads/2025/03/national_mission_in_interdisciplinary_cyber_physical_systems_nm_icps-scaled.jpg" alt="NM-ICPS"      className="header-logo" />
            <img src="https://results.siddhartha.edu.in/SAHE-Logo-01-results.jpg"                                                                                           alt="Siddhartha" className="header-logo" />
          </div>

        </div>
      </header>

      <div className="page-body">

        {/* ── Upload Card ── */}
        <section className="card upload-card">
          <h2 className="card-title">Upload Satellite Image</h2>
          <p className="card-desc">
            Upload a <strong>Sentinel-2 13-band .TIF</strong> image. The model will segment it
            into 6 land cover classes using a U-Net architecture.
          </p>

          <div
            className={`drop-zone ${drag ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".tif,.tiff"
              style={{ display: 'none' }}
              onChange={onInputChange}
            />
            {file ? (
              <div className="file-info">
                <span className="file-icon">🗂️</span>
                <div>
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  className="remove-btn"
                  onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
                >✕</button>
              </div>
            ) : (
              <div className="drop-prompt">
                <span className="drop-icon">📡</span>
                <p className="drop-text">Drag &amp; drop or <span className="link-text">browse</span></p>
                <p className="drop-hint">Sentinel-2 .TIF · 13 bands · up to 500 MB</p>
              </div>
            )}
          </div>

          {error && <div className="error-box">⚠️ {error}</div>}

          <button
            className={`predict-btn ${loading ? 'loading' : ''}`}
            disabled={!file || loading}
            onClick={predict}
          >
            {loading ? (
              <><span className="spinner" />Analysing Image…</>
            ) : (
              <>🔍 Run Prediction</>
            )}
          </button>

          {/* ── Sequential Steps ── */}
          {loading && (
            <div className="steps-container">
              {STEPS.map((step, i) => {
                const stepNum  = i + 1;
                const isDone   = activeStep > stepNum;
                const isActive = activeStep === stepNum;
                return (
                  <div
                    key={step.id}
                    className={`step-row ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                  >
                    <div className="step-icon">
                      {isDone
                        ? '✅'
                        : isActive
                          ? <span className="step-spinner" />
                          : <span className="step-dot" />}
                    </div>
                    <span className="step-label">{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Results ── */}
        {result && (
          <section className="card results-card">
            <h2 className="card-title">Prediction Results</h2>

            {/* Stat pills */}
            <div className="stats-grid">
              {Object.entries(result.class_stats)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([cls, pct]) => (
                  <div key={cls} className="stat-pill">
                    <span className="stat-dot" style={{ background: CLASS_COLORS[cls] ?? '#888' }} />
                    <span className="stat-cls">{cls.replace('_', ' ')}</span>
                    <span className="stat-pct">{pct.toFixed(1)}%</span>
                  </div>
                ))}
            </div>

            {/* Bar chart */}
            <div className="bar-chart">
              {Object.entries(result.class_stats)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([cls, pct]) => (
                  <div key={cls} className="bar-row">
                    <span className="bar-label">{cls.replace('_', ' ')}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: CLASS_COLORS[cls] ?? '#888' }} />
                    </div>
                    <span className="bar-pct">{pct.toFixed(1)}%</span>
                  </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
              {TABS.map(t => (
                <button
                  key={t.key}
                  className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Image + download only for active tab */}
            <div className="image-panel">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${result[activeTab]}`}
                alt={activeTab}
                className="result-img"
              />
              <button
                className="download-btn"
                onClick={() => downloadImage(
                  result[activeTab],
                  `${activeTab}.png`
                )}
              >
                ⬇ Download {TABS.find(t => t.key === activeTab)?.label}
              </button>
            </div>

          </section>
        )}
      </div>

      {/* ── Sidebar Legend ── */}
      <aside className="legend-sidebar">
        <h3 className="legend-title">Classes</h3>
        {Object.entries(CLASS_COLORS).map(([cls, color]) => (
          <div key={cls} className="legend-item">
            <span className="legend-swatch" style={{ background: color }} />
            <span className="legend-name">{cls.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="legend-divider" />
        <p className="legend-note">
          Model: U-Net<br />
          Input: 16 features<br />
          (13 bands + NDVI, NDWI, NDBI)
        </p>
      </aside>

    </main>

    {/* ── Footer ── */}
    <footer className="footer">
      <p className="footer-heart">Made with <span className="heart">❤️</span> for geospatial analysis</p>
      <p className="footer-powered">Powered by <span className="footer-brand">Geointell Labs</span> · <span className="footer-sub">STAR-PNT Labs</span></p>
    </footer>
    </>
  );
}