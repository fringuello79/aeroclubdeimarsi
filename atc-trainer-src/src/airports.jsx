// ============================================================
// AEROCLUB DEI MARSI — Mappa Abruzzo v1.5 (geografia realistica)
// Sistema di coordinate SVG globali: 5500 × 3800
// Centro Abruzzo ≈ (2750, 1900). 1 unità ≈ 0.038 km.
// ============================================================
import React from "react";

export const WORLD = { w: 5500, h: 3800 };

// ============================================================
// HELPER: trasforma punto locale in coordinate globali
// ============================================================
export function localToGlobal(lx, ly, center, localCenter, rotationDeg, scale) {
  const sx = (lx - localCenter.x) * scale;
  const sy = (ly - localCenter.y) * scale;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = sx * cos - sy * sin;
  const ry = sx * sin + sy * cos;
  return { x: center.x + rx, y: center.y + ry };
}

// ============================================================
// MAPPATURA FREQUENZE → ABBREVIAZIONI per targhette compatte
// ============================================================
export const FREQ_ABBR = {
  "121.800": "GND",
  "118.450": "TWR",
  "120.050": "AP",
  "130.000": "TRF",
  "124.200": "RMI",
  "121.500": "EMG",
};
export const freqAbbr = (f) => FREQ_ABBR[f] || (f ? String(f).slice(0,4) : "—");

// ============================================================
// LIBP — PESCARA · pista 04/22 (040°/220°)
// Pescara città/aeroporto: ~42.43°N 14.18°E (sulla costa adriatica)
// ============================================================
const LIBP_LOCAL_PARKING_DEF = [
  { id: "N4", lx: 130, ly: 400 },
  { id: "N5", lx: 230, ly: 400 },
  { id: "N6", lx: 330, ly: 400 },
  { id: "N1", lx: 130, ly: 530 },
  { id: "N2", lx: 230, ly: 530 },
  { id: "N3", lx: 330, ly: 530 },
  { id: "C1", lx: 540, ly: 460 },
  { id: "C2", lx: 615, ly: 460 },
  { id: "C3", lx: 690, ly: 460 },
  { id: "C4", lx: 765, ly: 460 },
  { id: "W1", lx: 910, ly: 440 },
  { id: "W2", lx: 910, ly: 545 },
];

const LIBP_LOCAL_CENTER = { x: 500, y: 220 };
const LIBP_CENTER = { x: 3220, y: 1500 };     // entroterra rispetto alla costa, NE Abruzzo
const LIBP_ROTATION = -50;                     // pista 04 → 040° bussola
const LIBP_SCALE = 0.85;

const LIBP_PARKING = LIBP_LOCAL_PARKING_DEF.map((p) => {
  const g = localToGlobal(p.lx, p.ly, LIBP_CENTER, LIBP_LOCAL_CENTER, LIBP_ROTATION, LIBP_SCALE);
  return { id: p.id, x: g.x, y: g.y };
});

function LIBPBackground() {
  return (
    <g transform={`translate(${LIBP_CENTER.x} ${LIBP_CENTER.y}) rotate(${LIBP_ROTATION}) scale(${LIBP_SCALE}) translate(${-LIBP_LOCAL_CENTER.x} ${-LIBP_LOCAL_CENTER.y})`}>
      {/* APRON polygons (paralleli alla pista) */}
      <rect x="70" y="355" width="345" height="225" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <rect x="475" y="410" width="330" height="90" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <rect x="865" y="400" width="90" height="180" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />

      <text x={240} y={385} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>APRON N</text>
      <text x={640} y={395} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>APRON C</text>
      <text x={910} y={415} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>APRON W</text>

      <rect x="500" y="600" width="350" height="50" fill="#2d4358" stroke="#5d7896" strokeWidth="1.5" />
      <text x={675} y={625} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#cbd5e1", fontSize: 17, fontWeight: 700, letterSpacing: 2 }}>AEROSTAZIONE</text>

      {/* TAXIWAY E (parallelo alla pista) */}
      <rect x="75" y="310" width="855" height="20" fill="#5a4815" />
      <line x1="80" y1="320" x2="925" y2="320" stroke="#facc15" strokeWidth="1.2" strokeDasharray="6 4" />

      {/* Aree verdi - rettangoli precisi */}
      <rect x="155" y="245" width="210" height="65" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.6" opacity="0.5" />
      <rect x="410" y="245" width="205" height="65" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.6" opacity="0.5" />
      <rect x="665" y="245" width="205" height="65" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.6" opacity="0.5" />

      {/* Raccordi A B C D */}
      {[
        { name: "D", x: 130, labelX: 100 },
        { name: "C", x: 385, labelX: 360 },
        { name: "B", x: 640, labelX: 612 },
        { name: "A", x: 895, labelX: 870 },
      ].map((c) => (
        <g key={c.name}>
          <rect x={c.x - 12} y="240" width="24" height="80" fill="#5a4815" />
          <line x1={c.x} y1="245" x2={c.x} y2="315" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
          <text x={c.labelX} y={280} dominantBaseline="central" transform={`rotate(50 ${c.labelX} 280)`} className="mono" style={{ fill: "#facc15", fontSize: 18, fontWeight: 700 }}>{c.name}</text>
        </g>
      ))}

      {/* Etichette TAXIWAY E (orientate con la pista per stare leggibili in zoom) */}
      <text x={250} y={342} dominantBaseline="central" transform="rotate(50 250 342)" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>E</text>
      <text x={530} y={342} dominantBaseline="central" transform="rotate(50 530 342)" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>E</text>
      <text x={790} y={342} dominantBaseline="central" transform="rotate(50 790 342)" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>E</text>

      <rect x="430" y="320" width="20" height="260" fill="#5a4815" />
      <line x1="440" y1="325" x2="440" y2="575" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <text x={462} y={470} dominantBaseline="central" transform="rotate(50 462 470)" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>H</text>

      <rect x="820" y="320" width="20" height="190" fill="#5a4815" />
      <line x1="830" y1="325" x2="830" y2="505" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <text x={852} y={430} dominantBaseline="central" transform="rotate(50 852 430)" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>G</text>

      <rect x="820" y="500" width="120" height="20" fill="#5a4815" />
      <line x1="825" y1="510" x2="935" y2="510" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <text x={870} y={492} dominantBaseline="central" transform="rotate(50 870 492)" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>F</text>

      {/* PISTA 04/22 */}
      <rect x="70" y="195" width="860" height="50" fill="#1a2a3a" stroke="#2c4e70" strokeWidth="1" />
      {/* Soglie azzurre stile MFD */}
      <rect x="70" y="195" width="5" height="50" fill="#5ac8f5" opacity="0.85" />
      <rect x="925" y="195" width="5" height="50" fill="#5ac8f5" opacity="0.85" />
      <line x1="85" y1="220" x2="915" y2="220" stroke="#fff" strokeWidth="1.8" strokeDasharray="20 16" opacity="0.85" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t04-${i}`} x1={78} y1={200 + i * 11} x2={92} y2={200 + i * 11} stroke="#fff" strokeWidth="2.5" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t22-${i}`} x1={908} y1={200 + i * 11} x2={922} y2={200 + i * 11} stroke="#fff" strokeWidth="2.5" />
      ))}
      {/* Numeri pista PERPENDICOLARI (leggibili da chi atterra) */}
      <text x={115} y={220} textAnchor="middle" dominantBaseline="central" transform="rotate(90 115 220)" className="mono" style={{ fill: "#fff", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>04</text>
      <text x={885} y={220} textAnchor="middle" dominantBaseline="central" transform="rotate(-90 885 220)" className="mono" style={{ fill: "#fff", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>22</text>

      {/* Stand */}
      {LIBP_LOCAL_PARKING_DEF.map((p) => (
        <g key={p.id}>
          <circle cx={p.lx} cy={p.ly} r="16" fill="rgba(7,18,30,0.5)" stroke="#7aaed4" strokeWidth="1.5" />
          <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central" transform={`rotate(50 ${p.lx} ${p.ly})`} className="mono" style={{ fill: "#fff", fontSize: 15, fontWeight: 700 }}>{p.id}</text>
        </g>
      ))}

      {/* Holding Points */}
      {[
        { name: "HP D", x: 130 },
        { name: "HP C", x: 385 },
        { name: "HP B", x: 640 },
        { name: "HP A", x: 895 },
      ].map((h) => (
        <g key={h.name}>
          <rect x={h.x - 12} y="248" width="24" height="6" fill="rgba(250,204,21,0.2)" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
          <text x={h.x} y={263} textAnchor="middle" dominantBaseline="central" transform={`rotate(50 ${h.x} 263)`} className="mono" style={{ fill: "#facc15", fontSize: 12, fontWeight: 700 }}>{h.name}</text>
        </g>
      ))}
    </g>
  );
}

export const AIRPORT_LIBP = {
  id: "LIBP",
  name: "Pescara",
  shortName: "PESCARA",
  elev: 50,
  coords: "042°26'14\"N 014°11'14\"E",
  runwayInfo: "RWY 04/22 · 2420m · ASPH",
  rwyTrueHeading: 40,
  freqs: [
    { label: "GROUND",    value: "121.800" },
    { label: "TOWER",     value: "118.450" },
    { label: "APPROACH",  value: "120.050" },
  ],
  parking: LIBP_PARKING,
  defaultStand: "C1",
  defaultHeading: 40,
  center: LIBP_CENTER,
  Background: LIBPBackground,
  focusBox: { x: LIBP_CENTER.x - 600, y: LIBP_CENTER.y - 420, w: 1200, h: 840 },
  windPos: { x: LIBP_CENTER.x - 540, y: LIBP_CENTER.y + 420 },
};

// ============================================================
// LIAH — CELANO  · pista 08/26 (080°/260°)
// Celano: ~42.08°N 13.55°E (Marsica, Conca del Fucino)
// ============================================================
const LIAH_LOCAL_PARKING_DEF = [
  { id: "1", lx: 280, ly: 380 },
  { id: "2", lx: 330, ly: 380 },
  { id: "3", lx: 380, ly: 380 },
  { id: "4", lx: 430, ly: 380 },
  { id: "5", lx: 570, ly: 380 },
  { id: "6", lx: 620, ly: 380 },
  { id: "7", lx: 670, ly: 380 },
  { id: "8", lx: 720, ly: 380 },
];

const LIAH_LOCAL_CENTER = { x: 500, y: 215 };
const LIAH_CENTER = { x: 2050, y: 2480 };
const LIAH_ROTATION = -10;
const LIAH_SCALE = 0.65;

const LIAH_PARKING = LIAH_LOCAL_PARKING_DEF.map((p) => {
  const g = localToGlobal(p.lx, p.ly, LIAH_CENTER, LIAH_LOCAL_CENTER, LIAH_ROTATION, LIAH_SCALE);
  return { id: p.id, x: g.x, y: g.y };
});

function LIAHBackground() {
  return (
    <g transform={`translate(${LIAH_CENTER.x} ${LIAH_CENTER.y}) rotate(${LIAH_ROTATION}) scale(${LIAH_SCALE}) translate(${-LIAH_LOCAL_CENTER.x} ${-LIAH_LOCAL_CENTER.y})`}>
      <rect x="240" y="310" width="520" height="140" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <text x={500} y={335} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>APRON</text>

      <rect x="470" y="465" width="60" height="65" fill="#2d4358" stroke="#5d7896" strokeWidth="1.5" />
      <text x={500} y={497} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>HANGAR</text>

      <rect x="490" y="240" width="20" height="75" fill="#5a4815" />
      <line x1="500" y1="245" x2="500" y2="310" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />

      <rect x="100" y="195" width="800" height="40" fill="#1a2a3a" stroke="#2c4e70" strokeWidth="1" />
      {/* Soglie azzurre stile MFD */}
      <rect x="100" y="195" width="5" height="40" fill="#5ac8f5" opacity="0.85" />
      <rect x="895" y="195" width="5" height="40" fill="#5ac8f5" opacity="0.85" />
      <line x1="115" y1="215" x2="885" y2="215" stroke="#fff" strokeWidth="1.8" strokeDasharray="20 16" opacity="0.85" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t08-${i}`} x1={108} y1={199 + i * 9} x2={122} y2={199 + i * 9} stroke="#fff" strokeWidth="2.5" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t26-${i}`} x1={878} y1={199 + i * 9} x2={892} y2={199 + i * 9} stroke="#fff" strokeWidth="2.5" />
      ))}
      <text x={145} y={215} textAnchor="middle" dominantBaseline="central" transform="rotate(90 145 215)" className="mono" style={{ fill: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>08</text>
      <text x={855} y={215} textAnchor="middle" dominantBaseline="central" transform="rotate(-90 855 215)" className="mono" style={{ fill: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>26</text>

      {LIAH_LOCAL_PARKING_DEF.map((p) => (
        <g key={p.id}>
          <circle cx={p.lx} cy={p.ly} r="18" fill="rgba(7,18,30,0.5)" stroke="#7aaed4" strokeWidth="1.5" />
          <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central" transform={`rotate(10 ${p.lx} ${p.ly})`} className="mono" style={{ fill: "#fff", fontSize: 16, fontWeight: 700 }}>{p.id}</text>
        </g>
      ))}

      <rect x="488" y="248" width="24" height="6" fill="rgba(250,204,21,0.2)" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
      <text x={500} y={263} textAnchor="middle" dominantBaseline="central" transform="rotate(10 500 263)" className="mono" style={{ fill: "#facc15", fontSize: 12, fontWeight: 700 }}>HP</text>
    </g>
  );
}

export const AIRPORT_LIAH = {
  id: "LIAH",
  name: "Celano",
  shortName: "CELANO",
  elev: 2200,
  coords: "42°03'04\"N 013°33'27\"E",
  runwayInfo: "RWY 08/26 · 800m · ASPH",
  rwyTrueHeading: 80,
  freqs: [
    { label: "TRAFFIC",   value: "130.000" },
  ],
  parking: LIAH_PARKING,
  defaultStand: "1",
  defaultHeading: 80,
  center: LIAH_CENTER,
  Background: LIAHBackground,
  focusBox: { x: LIAH_CENTER.x - 460, y: LIAH_CENTER.y - 320, w: 920, h: 640 },
  windPos: { x: LIAH_CENTER.x + 420, y: LIAH_CENTER.y + 250 },
};

// ============================================================
// Punti di riporto VFR (coordinate calcolate da lat/lon reali)
// Riferimento: Pescara LIBP = (3400, 1480) ≡ 42°26'N 14°12'E
//              Celano LIAH = (1900, 2480) ≡ 42°05'N 13°33'E
//              1° lat ≈ 2880 unità SVG (sud → y maggiore)
//              1° lon ≈ 2180 unità SVG (est → x maggiore)
// ============================================================
export const REPORTING_POINTS = [
  // ── LIBP (Pescara, centro 3220, 1500) ─────────────────────
  // Posizioni calibrate per coerenza geografica E nessuna sovrapposizione con aeroporto
  { id: "ROS", name: "ROSETO",          x: 2870, y: 720,  area: "LIBP" }, // 42°41'N 14°01'E (costa)
  { id: "PIN", name: "PINETO",          x: 2980, y: 950,  area: "LIBP" }, // 42°37'N 14°04'E (costa)
  { id: "MON", name: "MONTESILVANO",    x: 3220, y: 1190, area: "LIBP" }, // 42°31'N 14°08'E (costa, N di Pescara)
  { id: "PEN", name: "PENNE",           x: 2630, y: 1450, area: "LIBP" }, // 42°27'N 13°55'E (interno)
  { id: "LOR", name: "LORETO APRUTINO", x: 2770, y: 1530, area: "LIBP" }, // 42°26'N 13°59'E (interno)
  { id: "FRA", name: "FRANCAVILLA",     x: 3680, y: 1620, area: "LIBP" }, // 42°25'N 14°18'E (costa S di Pescara)
  { id: "CHI", name: "CHIETI",          x: 2900, y: 1880, area: "LIBP" }, // 42°21'N 14°10'E (entroterra, SW)
  { id: "ORT", name: "ORTONA",          x: 3870, y: 2030, area: "LIBP" }, // 42°21'N 14°24'E (costa, SE)
  { id: "POP", name: "POPOLI",          x: 2420, y: 2270, area: "LIBP" }, // 42°10'N 13°50'E (interno)
  { id: "VAS", name: "VASTO",           x: 4180, y: 2410, area: "LIBP" }, // 42°06'N 14°43'E (costa S)

  // ── LIAH (Celano, centro 2050, 2480) — Marsica e Conca del Fucino
  { id: "AVZ", name: "AVEZZANO",   x: 1700, y: 2700, area: "LIAH" }, // 42°02'N 13°25'E (sotto-sinistra dell'aeroporto)
  { id: "MAG", name: "MAGLIANO",   x: 1600, y: 2470, area: "LIAH" }, // 42°05'N 13°22'E
  { id: "TAG", name: "TAGLIACOZZO",x: 1370, y: 2530, area: "LIAH" }, // 42°04'N 13°15'E
  { id: "CRS", name: "CARSOLI",    x: 1010, y: 2470, area: "LIAH" }, // 42°06'N 13°05'E
  { id: "SUL", name: "SULMONA",    x: 2780, y: 2610, area: "LIAH" }, // 42°03'N 13°56'E
  { id: "SCN", name: "SCANNO",     x: 2680, y: 3050, area: "LIAH" }, // 41°54'N 13°53'E
  { id: "PEZ", name: "PESCASSEROLI",x: 2200, y: 3100,area: "LIAH" }, // 41°48'N 13°47'E
  { id: "AQL", name: "L'AQUILA",   x: 2120, y: 1900, area: "LIAH" }, // 42°21'N 13°24'E
];

export const COMMON_FREQS = [
  { label: "Roma INFO", value: "124.200" },
  { label: "121.5 EMG", value: "121.500" },
];

export const AIRPORTS = {
  LIBP: AIRPORT_LIBP,
  LIAH: AIRPORT_LIAH,
};

export const AIRPORT_OPTIONS = [
  { id: "WORLD", label: "🗺️ Abruzzo (vista d'insieme)" },
  { id: "LIBP", label: "LIBP · Pescara" },
  { id: "LIAH", label: "LIAH · Celano" },
];

export const WORLD_FOCUS = { x: 250, y: 200, w: 5000, h: 3400 };

// ============================================================
// WIND INDICATOR (manica a vento realistica)
// 5 bande alternate rosso/bianco, ognuna ≈ 3 nodi
// ============================================================
export function WindIndicator({ x, y, dir, speed, label }) {
  const d = Math.max(0, Math.min(359, Math.round(Number(dir) || 0)));
  const s = Math.max(0, Math.min(99, Math.round(Number(speed) || 0)));
  // rot=d: vento da N (dir=0) → manica verso S (basso, rot=0) ✓
  const rot = d;
  const segmentsInflated = s === 0 ? 0 : Math.min(5, Math.ceil(s / 3));
  const SEG_LEN = 10;
  const totalLen = segmentsInflated > 0 ? segmentsInflated * SEG_LEN : 6;
  const W_BASE = 7;
  const W_TIP  = 3;

  const segments = [];
  for (let i = 0; i < 5; i++) {
    const isInflated = i < segmentsInflated;
    const startY = isInflated ? 4 + i * SEG_LEN : 4 + totalLen + (i - segmentsInflated) * 2;
    const endY   = isInflated ? 4 + (i + 1) * SEG_LEN : startY + 2;
    const wStart = W_BASE - ((W_BASE - W_TIP) * (i / 5));
    const wEnd   = W_BASE - ((W_BASE - W_TIP) * ((i + 1) / 5));
    const wActualStart = isInflated ? wStart : 1.5;
    const wActualEnd   = isInflated ? wEnd   : 1.2;
    const color = i % 2 === 0 ? "#dc2626" : "#f8fafc";
    const stroke = i % 2 === 0 ? "#7f1d1d" : "#cbd5e1";
    segments.push(
      <polygon
        key={i}
        points={`${-wActualStart},${startY} ${wActualStart},${startY} ${wActualEnd},${endY} ${-wActualEnd},${endY}`}
        fill={isInflated ? color : "#94a3b8"}
        opacity={isInflated ? 1 : 0.55}
        stroke={isInflated ? stroke : "#475569"}
        strokeWidth="0.5"
      />
    );
  }

  const TAG_Y = 4 + 5 * SEG_LEN + 8;

  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`rotate(${rot})`}>
        <line x1="0" y1="0" x2="0" y2="4" stroke="#fbbf24" strokeWidth="1.2" />
        <circle r="3" fill="#1a2b3d" stroke="#fbbf24" strokeWidth="1.2" />
        <circle cy="4" r="3.5" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
        {segments}
      </g>
      <text x="0" y="-10" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#64748b", fontSize: 8, fontWeight: 700 }}>N</text>
      <rect x="-34" y={TAG_Y} width="68" height="22" rx="3" fill="rgba(3,10,20,0.85)" stroke="#fbbf24" strokeWidth="0.8" />
      {label && (
        <text x="0" y={TAG_Y + 7} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#94a3b8", fontSize: 7, fontWeight: 600, letterSpacing: 1 }}>{label}</text>
      )}
      <text x="0" y={TAG_Y + 16} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: s === 0 ? "#94a3b8" : "#fbbf24", fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
        {s === 0 ? "CALM" : `${d.toString().padStart(3, "0")}° / ${s.toString().padStart(2, "0")}KT`}
      </text>
    </g>
  );
}

// ============================================================
// SFONDO GEOGRAFICO Abruzzo v1.5
// Costa adriatica realistica + sagoma regione + rilievi proporzionati
// Riferimenti coordinate reali (1° lat = 2880 svg, 1° lon = 2180 svg)
// Punti chiave:
//   Pescara città  42°27'N 14°13'E → (3470, 1450)
//   Pescara LIBP   42°26'N 14°11'E → (3400, 1480)  [usato come ancora]
//   Avezzano       42°02'N 13°25'E → (1690, 2630)
//   L'Aquila       42°21'N 13°24'E → (2070, 1950)
//   Vasto          42°06'N 14°43'E → (4300, 2390)
//   Roseto         42°41'N 14°01'E → (3050, 720)
//   Martinsicuro   42°53'N 13°55'E → (2780, 200) - estremo N costa
//   Carsoli        42°06'N 13°05'E → (940, 2470)
//   Cittaducale    42°23'N 12°57'E → (640, 1830) - estremo W (vicino confine Lazio)
// ============================================================
export function GeographicBackground() {
  // Costa adriatica abruzzese: da Martinsicuro (N) a San Salvo (S).
  // Nella zona Pescara la costa fa una rientranza marcata verso est per
  // accogliere l'estensione visiva dell'aeroporto LIBP (su questa mappa
  // l'aeroporto è disegnato in scala più grande del reale per leggibilità).
  const COAST = "M 2780 200 L 2890 380 L 2980 600 L 3060 780 L 3150 970 L 3280 1100 L 3470 1170 L 3700 1230 L 3870 1330 L 3960 1480 L 3920 1640 L 3850 1790 L 3830 1900 L 3920 2030 L 4040 2150 L 4140 2280 L 4250 2400 L 4350 2480";

  // Sagoma regione Abruzzo:
  //  - bordo N (Marche): linea ENE-WSW da Cittaducale a Martinsicuro
  //  - bordo E (costa adriatica): segue la stessa linea della costa (con bulge)
  //  - bordo S (Molise): linea WSW-ENE da San Salvo a Castel di Sangro/Pescasseroli
  //  - bordo W (Lazio): linea NNE-SSW da Pescasseroli a Cittaducale
  const ABRUZZO_SHAPE = `
    M 2780 200
    L 2890 380 L 2980 600 L 3060 780 L 3150 970
    L 3280 1100 L 3470 1170 L 3700 1230 L 3870 1330 L 3960 1480
    L 3920 1640 L 3850 1790 L 3830 1900 L 3920 2030 L 4040 2150
    L 4140 2280 L 4250 2400 L 4350 2480
    L 4150 2680 L 3850 2820 L 3450 2950 L 3030 3010 L 2600 3030 L 2150 2990
    L 1850 2890 L 1550 2740 L 1280 2580 L 1100 2400 L 1000 2200 L 920 1990
    L 850 1780 L 800 1570 L 760 1360 L 740 1140 L 760 920 L 820 720
    L 920 540 L 1080 410 L 1300 340 L 1580 290 L 1900 250 L 2230 220
    L 2500 210
    Z
  `.replace(/\s+/g, ' ');

  return (
    <g>
      {/* MARE ADRIATICO — area a EST della costa */}
      <path
        d={`${COAST} L 5500 2480 L 5500 200 Z`}
        fill="#08283e" opacity="0.6"
      />
      {/* Linea di costa */}
      <path d={COAST} fill="none" stroke="#5fa8d3" strokeWidth="2" opacity="0.9" />

      <text x="4950" y="1300" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 22, fontWeight: 700, letterSpacing: 8, opacity: 0.5 }} transform="rotate(80 4950 1300)">MARE ADRIATICO</text>

      {/* Sagoma Abruzzo — leggero riempimento per dare profondità */}
      <path d={ABRUZZO_SHAPE} fill="#0d1e2f" stroke="#1a3a52" strokeWidth="1.2" opacity="0.55" />

      {/* Confine regionale interno (Marche-Lazio-Molise) tratteggiato */}
      <path
        d="M 2780 200 L 2500 210 L 2230 220 L 1900 250 L 1580 290 L 1300 340 L 1080 410 L 920 540 L 820 720 L 760 920 L 740 1140 L 760 1360 L 800 1570 L 850 1780 L 920 1990 L 1000 2200 L 1100 2400 L 1280 2580 L 1550 2740 L 1850 2890 L 2150 2990 L 2600 3030 L 3030 3010 L 3450 2950 L 3850 2820 L 4150 2680 L 4350 2480"
        fill="none" stroke="#5d7896" strokeWidth="1.1" strokeDasharray="9 5" opacity="0.55"
      />

      {/* Rilievi (proporzionati, più piccoli che in v1.4) */}
      {/* Gran Sasso: catena lat 42°25'-42°30' lon 13°30'-13°45' */}
      <ellipse cx="2080" cy="1450" rx="380" ry="120" fill="#1a2b3d" stroke="#2a3f56" strokeWidth="0.6" opacity="0.5" transform="rotate(-25 2080 1450)" />
      <text x="2080" y="1450" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#6584a5", fontSize: 13, fontWeight: 600, letterSpacing: 2, opacity: 0.6 }} transform="rotate(-25 2080 1450)">GRAN SASSO</text>

      {/* Maiella: massiccio lat 42°00'-42°10' lon 14°00'-14°10' */}
      <ellipse cx="3140" cy="2470" rx="280" ry="160" fill="#1a2b3d" stroke="#2a3f56" strokeWidth="0.6" opacity="0.5" transform="rotate(-35 3140 2470)" />
      <text x="3140" y="2470" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#6584a5", fontSize: 12, fontWeight: 600, letterSpacing: 2, opacity: 0.6 }} transform="rotate(-35 3140 2470)">MAIELLA</text>

      {/* Velino-Sirente: a NW di Celano */}
      <ellipse cx="1900" cy="2180" rx="300" ry="110" fill="#1a2b3d" stroke="#2a3f56" strokeWidth="0.6" opacity="0.5" transform="rotate(-10 1900 2180)" />
      <text x="1900" y="2180" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#6584a5", fontSize: 11, fontWeight: 600, letterSpacing: 2, opacity: 0.6 }}>VELINO–SIRENTE</text>

      {/* Conca del Fucino: depressione ex-lago attorno a Celano */}
      <ellipse cx="1900" cy="2620" rx="320" ry="140" fill="#0a1622" stroke="#1a3a52" strokeWidth="0.6" opacity="0.75" />
      <text x="1900" y="2740" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 10, fontWeight: 600, letterSpacing: 3, opacity: 0.6 }}>CONCA DEL FUCINO</text>

      {/* Fiume Aterno-Pescara (dalla zona Aquila/Popoli verso Pescara, indicativo) */}
      <path d="M 2090 2050 Q 2350 1980 2600 2200 Q 2900 2200 3470 1480" fill="none" stroke="#4a7f9e" strokeWidth="1.5" opacity="0.35" strokeDasharray="3 4" />

      {/* Etichette regioni confinanti */}
      <text x="2200" y="155" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 17, fontWeight: 700, letterSpacing: 8, opacity: 0.5 }}>MARCHE</text>
      <text x="380" y="1500" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 17, fontWeight: 700, letterSpacing: 8, opacity: 0.5 }}>LAZIO</text>
      <text x="2700" y="3170" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 17, fontWeight: 700, letterSpacing: 8, opacity: 0.5 }}>MOLISE</text>
      <text x="2700" y="1850" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#a3b8d0", fontSize: 32, fontWeight: 700, letterSpacing: 14, opacity: 0.16 }}>ABRUZZO</text>

      {/* Punti di riporto VFR (stile waypoint MFD) */}
      {REPORTING_POINTS.map((p) => (
        <g key={p.id}>
          <polygon
            points={`${p.x},${p.y - 8} ${p.x - 7},${p.y + 5} ${p.x + 7},${p.y + 5}`}
            fill="rgba(196,181,253,0.85)"
            stroke="#0b1b2b"
            strokeWidth="0.8"
          />
          <circle cx={p.x} cy={p.y - 1} r="1.5" fill="#0b1b2b" />
          <text x={p.x + 11} y={p.y + 3} dominantBaseline="central" className="mono" style={{ fill: "#c4b5fd", fontSize: 13, fontWeight: 700, letterSpacing: 0.6 }}>
            {p.name}
          </text>
        </g>
      ))}
    </g>
  );
}
