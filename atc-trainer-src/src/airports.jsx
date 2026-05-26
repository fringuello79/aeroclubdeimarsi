// ============================================================
// AEROCLUB DEI MARSI — Mappa estesa Abruzzo · revisione scala
// Sistema di coordinate SVG globali: viewBox 0..5500 × 0..3800
// Pescara e Celano coesistono. Scala più realistica.
// ============================================================
import React from "react";

// World extent
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

// Helper per testo dritto: contro-ruota il testo del gruppo padre
// Il pivot di rotazione è il punto (x,y) stesso → il testo resta ancorato dove vuoi
function StraightText({ x, y, counterRotation, children, ...rest }) {
  return (
    <text x={x} y={y} transform={`rotate(${counterRotation} ${x} ${y})`} {...rest}>
      {children}
    </text>
  );
}

// ============================================================
// LIBP — PESCARA  · pista 04/22 orientata 040°/220°
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
const LIBP_CENTER = { x: 4000, y: 1300 };
const LIBP_ROTATION = -50; // 040° bussola - 090° (orizzontale) = -50°
const LIBP_SCALE = 0.85;

const LIBP_PARKING = LIBP_LOCAL_PARKING_DEF.map((p) => {
  const g = localToGlobal(p.lx, p.ly, LIBP_CENTER, LIBP_LOCAL_CENTER, LIBP_ROTATION, LIBP_SCALE);
  return { id: p.id, x: g.x, y: g.y };
});

function LIBPBackground() {
  const r = -LIBP_ROTATION; // controruota i testi per tenerli dritti

  return (
    <g transform={`translate(${LIBP_CENTER.x} ${LIBP_CENTER.y}) rotate(${LIBP_ROTATION}) scale(${LIBP_SCALE}) translate(${-LIBP_LOCAL_CENTER.x} ${-LIBP_LOCAL_CENTER.y})`}>
      {/* APRON polygons */}
      <rect x="70" y="355" width="345" height="225" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <rect x="475" y="410" width="330" height="90" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <rect x="865" y="400" width="90" height="180" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />

      <text x={240} y={385} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>APRON N</text>
      <text x={640} y={395} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>APRON C</text>
      <text x={910} y={415} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>APRON W</text>

      {/* Aerostazione */}
      <rect x="500" y="600" width="350" height="50" fill="#2d4358" stroke="#5d7896" strokeWidth="1.5" />
      <text x={675} y={625} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#cbd5e1", fontSize: 17, fontWeight: 700, letterSpacing: 2 }}>AEROSTAZIONE</text>

      {/* TAXIWAY E (parallelo alla pista) */}
      <rect x="75" y="310" width="855" height="20" fill="#5a4815" />
      <line x1="80" y1="320" x2="925" y2="320" stroke="#facc15" strokeWidth="1.2" strokeDasharray="6 4" />

      {/* Aree verdi tra raccordi - rettangoli precisi e paralleli */}
      <rect x="155" y="245" width="210" height="65" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.6" opacity="0.5" />
      <rect x="410" y="245" width="205" height="65" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.6" opacity="0.5" />
      <rect x="665" y="245" width="205" height="65" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.6" opacity="0.5" />

      {/* Raccordi A B C D (verticali) */}
      {[
        { name: "D", x: 130, labelX: 100 },
        { name: "C", x: 385, labelX: 360 },
        { name: "B", x: 640, labelX: 612 },
        { name: "A", x: 895, labelX: 870 },
      ].map((c) => (
        <g key={c.name}>
          <rect x={c.x - 12} y="240" width="24" height="80" fill="#5a4815" />
          <line x1={c.x} y1="245" x2={c.x} y2="315" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
          <StraightText x={c.labelX} y={280} counterRotation={r} dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 18, fontWeight: 700 }}>{c.name}</StraightText>
        </g>
      ))}

      {/* Etichette TAXIWAY E */}
      <StraightText x={250} y={342} counterRotation={r} dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>E</StraightText>
      <StraightText x={530} y={342} counterRotation={r} dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>E</StraightText>
      <StraightText x={790} y={342} counterRotation={r} dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>E</StraightText>

      {/* Raccordo H (apron N a taxiway E) */}
      <rect x="430" y="320" width="20" height="260" fill="#5a4815" />
      <line x1="440" y1="325" x2="440" y2="575" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <StraightText x={462} y={470} counterRotation={r} dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>H</StraightText>

      {/* Raccordo G (apron W a taxiway E) */}
      <rect x="820" y="320" width="20" height="190" fill="#5a4815" />
      <line x1="830" y1="325" x2="830" y2="505" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <StraightText x={852} y={430} counterRotation={r} dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>G</StraightText>

      {/* Raccordo F */}
      <rect x="820" y="500" width="120" height="20" fill="#5a4815" />
      <line x1="825" y1="510" x2="935" y2="510" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <StraightText x={870} y={492} counterRotation={r} dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 17, fontWeight: 700 }}>F</StraightText>

      {/* PISTA 04/22 */}
      <rect x="70" y="195" width="860" height="50" fill="#1f2937" stroke="#374151" strokeWidth="1" />
      <line x1="85" y1="220" x2="915" y2="220" stroke="#fff" strokeWidth="2" strokeDasharray="20 16" opacity="0.9" />

      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t04-${i}`} x1={73} y1={200 + i * 11} x2={87} y2={200 + i * 11} stroke="#fff" strokeWidth="2.5" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t22-${i}`} x1={913} y1={200 + i * 11} x2={927} y2={200 + i * 11} stroke="#fff" strokeWidth="2.5" />
      ))}

      {/* Numeri pista — perpendicolari all'asse pista, leggibili da chi atterra */}
      {/* 04: ruotato di 90° orario rispetto al sistema locale */}
      <text x={115} y={220} textAnchor="middle" dominantBaseline="central" transform="rotate(90 115 220)" className="mono" style={{ fill: "#fff", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>04</text>
      {/* 22: ruotato di 90° antiorario */}
      <text x={885} y={220} textAnchor="middle" dominantBaseline="central" transform="rotate(-90 885 220)" className="mono" style={{ fill: "#fff", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>22</text>

      {/* Stand circles + label centrate */}
      {LIBP_LOCAL_PARKING_DEF.map((p) => (
        <g key={p.id}>
          <circle cx={p.lx} cy={p.ly} r="16" fill="rgba(7,18,30,0.5)" stroke="#7aaed4" strokeWidth="1.5" />
          <StraightText x={p.lx} y={p.ly} counterRotation={r} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#ffffff", fontSize: 15, fontWeight: 700 }}>{p.id}</StraightText>
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
          <StraightText x={h.x} y={263} counterRotation={r} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 12, fontWeight: 700 }}>{h.name}</StraightText>
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
  // Manica a vento: in basso a destra dell'aeroporto, lontano dal nome (che sta sopra)
  windPos: { x: LIBP_CENTER.x + 560, y: LIBP_CENTER.y + 380 },
};

// ============================================================
// LIAH — CELANO  · pista 08/26 orientata 080°/260°
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
const LIAH_CENTER = { x: 1300, y: 2400 };
const LIAH_ROTATION = -10;
const LIAH_SCALE = 0.65;

const LIAH_PARKING = LIAH_LOCAL_PARKING_DEF.map((p) => {
  const g = localToGlobal(p.lx, p.ly, LIAH_CENTER, LIAH_LOCAL_CENTER, LIAH_ROTATION, LIAH_SCALE);
  return { id: p.id, x: g.x, y: g.y };
});

function LIAHBackground() {
  const r = -LIAH_ROTATION;
  return (
    <g transform={`translate(${LIAH_CENTER.x} ${LIAH_CENTER.y}) rotate(${LIAH_ROTATION}) scale(${LIAH_SCALE}) translate(${-LIAH_LOCAL_CENTER.x} ${-LIAH_LOCAL_CENTER.y})`}>
      <rect x="240" y="310" width="520" height="140" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <text x={500} y={335} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>APRON</text>

      <rect x="470" y="465" width="60" height="65" fill="#2d4358" stroke="#5d7896" strokeWidth="1.5" />
      <text x={500} y={497} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>HANGAR</text>

      {/* Raccordo apron→pista */}
      <rect x="490" y="240" width="20" height="75" fill="#5a4815" />
      <line x1="500" y1="245" x2="500" y2="310" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />

      {/* PISTA 08/26 */}
      <rect x="100" y="195" width="800" height="40" fill="#1f2937" stroke="#374151" strokeWidth="1" />
      <line x1="115" y1="215" x2="885" y2="215" stroke="#fff" strokeWidth="2" strokeDasharray="20 16" opacity="0.9" />

      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t08-${i}`} x1={103} y1={199 + i * 9} x2={117} y2={199 + i * 9} stroke="#fff" strokeWidth="2.5" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t26-${i}`} x1={883} y1={199 + i * 9} x2={897} y2={199 + i * 9} stroke="#fff" strokeWidth="2.5" />
      ))}

      <text x={145} y={215} textAnchor="middle" dominantBaseline="central" transform="rotate(90 145 215)" className="mono" style={{ fill: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>08</text>
      <text x={855} y={215} textAnchor="middle" dominantBaseline="central" transform="rotate(-90 855 215)" className="mono" style={{ fill: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>26</text>

      {LIAH_LOCAL_PARKING_DEF.map((p) => (
        <g key={p.id}>
          <circle cx={p.lx} cy={p.ly} r="18" fill="rgba(7,18,30,0.5)" stroke="#7aaed4" strokeWidth="1.5" />
          <StraightText x={p.lx} y={p.ly} counterRotation={r} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#ffffff", fontSize: 16, fontWeight: 700 }}>{p.id}</StraightText>
        </g>
      ))}

      <rect x="488" y="248" width="24" height="6" fill="rgba(250,204,21,0.2)" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
      <StraightText x={500} y={263} counterRotation={r} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#facc15", fontSize: 12, fontWeight: 700 }}>HP</StraightText>
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
    { label: "TRAFFIC",   value: "123.500" },
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
// Punti di riporto VFR (coordinate globali realistiche)
// ============================================================
export const REPORTING_POINTS = [
  // Intorno a Pescara (LIBP_CENTER = 4000, 1300)
  { id: "POP", name: "POPOLI",          x: 3200, y: 1380, area: "LIBP" },
  { id: "PEN", name: "PENNE",           x: 3550, y: 750,  area: "LIBP" },
  { id: "LOR", name: "LORETO APRUTINO", x: 3850, y: 880,  area: "LIBP" },
  { id: "CHI", name: "CHIETI",          x: 3650, y: 1750, area: "LIBP" },
  { id: "ORT", name: "ORTONA",          x: 4350, y: 1900, area: "LIBP" },
  // Intorno a Celano (LIAH_CENTER = 1300, 2400) - lontani dalla pista
  { id: "AVZ", name: "AVEZZANO",  x: 950,  y: 2700, area: "LIAH" },
  { id: "MAG", name: "MAGLIANO",  x: 1100, y: 2900, area: "LIAH" },
  { id: "CPS", name: "CELANO P.", x: 1700, y: 2200, area: "LIAH" },
];

// ============================================================
// Frequenze comuni (sempre disponibili)
// ============================================================
export const COMMON_FREQS = [
  { label: "Roma INFO", value: "124.200" },
  { label: "121.5 EMG", value: "121.500" },
];

// ============================================================
// AIRPORTS export
// ============================================================
export const AIRPORTS = {
  LIBP: AIRPORT_LIBP,
  LIAH: AIRPORT_LIAH,
};

export const AIRPORT_OPTIONS = [
  { id: "WORLD", label: "🗺️ Abruzzo (vista d'insieme)" },
  { id: "LIBP", label: "LIBP · Pescara" },
  { id: "LIAH", label: "LIAH · Celano" },
];

// Focus per la vista WORLD (tutta la regione)
export const WORLD_FOCUS = { x: 250, y: 200, w: 5000, h: 3400 };

// ============================================================
// COMPONENTE: indicatore manica a vento + targhetta
// Vista dall'alto. Manica orientata verso DOVE soffia il vento (windDir + 180).
// Sotto, targhetta con orientamento "DA" e velocità in nodi.
// ============================================================
export function WindIndicator({ x, y, dir, speed, label }) {
  const d = Math.max(0, Math.min(359, Math.round(Number(dir) || 0)));
  const s = Math.max(0, Math.min(99, Math.round(Number(speed) || 0)));

  // Manica: in SVG la rotazione (rot=0) punta verso il basso (compass 180=sud).
  // dir = direzione DA cui soffia (compass). La manica si distende SOTTOVENTO.
  // Direzione del soffio in compass = (dir + 180) mod 360.
  // Per puntare in direzione compass H, serve rot = H - 180.
  // Quindi rot = (dir + 180) - 180 = dir.
  // Verifica: vento da N (dir=0) → rot=0 → manica verso S (basso) ✓
  //           vento da E (dir=90) → rot=90 → manica verso W (sinistra) ✓
  const rot = d;

  // Numero di bande gonfie (max 5). Ogni banda ≈ 3kt.
  // 0kt → 0 bande gonfie (manica afflosciata)
  // 3kt → 1 banda, 6kt → 2, 9kt → 3, 12kt → 4, ≥15kt → 5 bande (tutta orizzontale)
  const segmentsInflated = s === 0 ? 0 : Math.min(5, Math.ceil(s / 3));
  const SEG_LEN = 10; // lunghezza di ogni banda quando gonfia
  const totalLen = segmentsInflated > 0 ? segmentsInflated * SEG_LEN : 6;
  // Larghezza iniziale e finale (manica si restringe verso la punta)
  const W_BASE = 7;
  const W_TIP  = 3;

  // Genero i 5 segmenti: i primi `segmentsInflated` sono "estesi", il resto pende afflosciato
  const segments = [];
  for (let i = 0; i < 5; i++) {
    const isInflated = i < segmentsInflated;
    const startY = isInflated ? 4 + i * SEG_LEN : 4 + totalLen + (i - segmentsInflated) * 2;
    const endY   = isInflated ? 4 + (i + 1) * SEG_LEN : startY + 2;
    // Larghezza progressiva (interpolata da BASE a TIP lungo l'intera manica)
    const wStart = W_BASE - ((W_BASE - W_TIP) * (i / 5));
    const wEnd   = W_BASE - ((W_BASE - W_TIP) * ((i + 1) / 5));
    const wActualStart = isInflated ? wStart : 1.5;
    const wActualEnd   = isInflated ? wEnd   : 1.2;
    const color = i % 2 === 0 ? "#dc2626" : "#f8fafc"; // rosso/bianco alternati
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

  // Posizione targhetta: tiene conto dello spazio sotto la manica completamente distesa
  const TAG_Y = 4 + 5 * SEG_LEN + 8;

  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`rotate(${rot})`}>
        {/* Palo */}
        <line x1="0" y1="0" x2="0" y2="4" stroke="#fbbf24" strokeWidth="1.2" />
        <circle r="3" fill="#1a2b3d" stroke="#fbbf24" strokeWidth="1.2" />
        {/* Anello di base */}
        <circle cy="4" r="3.5" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
        {/* Bande */}
        {segments}
      </g>
      {/* Mini-bussola: solo "N" sopra il palo per orientamento */}
      <text x="0" y="-10" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#64748b", fontSize: 8, fontWeight: 700 }}>N</text>

      {/* Targhetta sotto */}
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
// SFONDO GEOGRAFICO Abruzzo (versione estesa)
// Costa adriatica, regioni confinanti, rilievi montuosi (molto leggeri)
// ============================================================
export function GeographicBackground() {
  return (
    <g>
      {/* MARE ADRIATICO a destra */}
      <path
        d="M 4500 0 L 5500 0 L 5500 3800 L 4700 3800 Q 4650 3200 4620 2400 Q 4590 1600 4560 800 Q 4530 400 4500 0 Z"
        fill="#0a2540"
        opacity="0.5"
      />
      {/* Linea di costa */}
      <path
        d="M 4500 0 Q 4520 500 4550 1000 Q 4580 1600 4610 2200 Q 4640 2800 4680 3400 Q 4695 3700 4700 3800"
        fill="none"
        stroke="#5fa8d3"
        strokeWidth="2"
        opacity="0.7"
      />
      <text x="5100" y="1900" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#7aaed4", fontSize: 22, fontWeight: 700, letterSpacing: 8, opacity: 0.55 }} transform="rotate(90 5100 1900)">MARE ADRIATICO</text>

      {/* Gran Sasso (NW di Pescara) */}
      <path
        d="M 2400 500 Q 2700 600 3000 580 Q 3300 560 3500 650 Q 3450 800 3200 820 Q 2800 800 2500 700 Z"
        fill="#1a2b3d" stroke="#2a3f56" strokeWidth="0.6" opacity="0.45"
      />
      <text x="2900" y="700" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 18, fontWeight: 600, letterSpacing: 2, opacity: 0.5 }}>GRAN SASSO</text>

      {/* Maiella (sud di Pescara) */}
      <path
        d="M 3100 2200 Q 3400 2280 3700 2300 Q 3950 2350 4000 2500 Q 3900 2650 3600 2640 Q 3300 2580 3100 2400 Z"
        fill="#1a2b3d" stroke="#2a3f56" strokeWidth="0.6" opacity="0.45"
      />
      <text x="3500" y="2440" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 16, fontWeight: 600, letterSpacing: 2, opacity: 0.5 }}>MAIELLA</text>

      {/* Velino-Sirente (a NORD di Celano) */}
      <path
        d="M 700 1500 Q 1000 1550 1300 1600 Q 1700 1700 2000 1750 Q 2050 1900 1700 1920 Q 1300 1900 950 1800 Q 700 1700 700 1500 Z"
        fill="#1a2b3d" stroke="#2a3f56" strokeWidth="0.6" opacity="0.45"
      />
      <text x="1350" y="1720" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 15, fontWeight: 600, letterSpacing: 2, opacity: 0.5 }}>VELINO–SIRENTE</text>

      {/* Marsica / Conca del Fucino (attorno a Celano) - depressione, colore più scuro */}
      <ellipse cx="1300" cy="2750" rx="700" ry="280" fill="#0d1828" stroke="#1a2b3d" strokeWidth="0.6" opacity="0.5" />
      <text x="1300" y="2950" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 12, fontWeight: 600, letterSpacing: 3, opacity: 0.45 }}>CONCA DEL FUCINO</text>

      {/* Confini regionali */}
      <path
        d="M 250 320 Q 1500 280 3000 310 Q 4000 330 4550 350"
        fill="none" stroke="#5d7896" strokeWidth="1.2" strokeDasharray="10 6" opacity="0.4"
      />
      <path
        d="M 250 320 Q 220 1200 280 2200 Q 320 3000 360 3550"
        fill="none" stroke="#5d7896" strokeWidth="1.2" strokeDasharray="10 6" opacity="0.4"
      />
      <path
        d="M 360 3550 Q 1500 3580 3000 3580 Q 4000 3600 4700 3580"
        fill="none" stroke="#5d7896" strokeWidth="1.2" strokeDasharray="10 6" opacity="0.4"
      />

      {/* Etichette regioni (molto sbiadite) */}
      <text x="2200" y="260" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 18, fontWeight: 700, letterSpacing: 6, opacity: 0.4 }}>MARCHE</text>
      <text x="150" y="1800" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 18, fontWeight: 700, letterSpacing: 6, opacity: 0.4 }}>LAZIO</text>
      <text x="2500" y="3680" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#5d7896", fontSize: 18, fontWeight: 700, letterSpacing: 6, opacity: 0.4 }}>MOLISE</text>
      <text x="2700" y="1900" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#a3b8d0", fontSize: 32, fontWeight: 700, letterSpacing: 12, opacity: 0.22 }}>ABRUZZO</text>

      {/* Punti di riporto VFR */}
      {REPORTING_POINTS.map((p) => (
        <g key={p.id}>
          {/* Triangolo VFR */}
          <polygon
            points={`${p.x},${p.y - 10} ${p.x - 9},${p.y + 6} ${p.x + 9},${p.y + 6}`}
            fill="rgba(196,181,253,0.9)"
            stroke="#0b1b2b"
            strokeWidth="1"
          />
          <text x={p.x + 14} y={p.y + 4} dominantBaseline="central" className="mono" style={{ fill: "#c4b5fd", fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
            {p.name}
          </text>
        </g>
      ))}
    </g>
  );
}
