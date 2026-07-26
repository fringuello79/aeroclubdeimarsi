// ============================================================
// AEROCLUB DEI MARSI — Definizioni aeroporti
// Coordinate sul viewBox SVG 1000 x 700
// ============================================================
import React from "react";

// ------------------------------------------------------------
// LIBP — PESCARA (fedele alla carta Aeroclub dei Marsi 2022)
// ------------------------------------------------------------
const LIBP_PARKING = [
  // APRON N (Nord, sinistra) — 6 stand su 2 righe
  // Riga superiore: N4 N5 N6
  { id: "N4", x: 130, y: 400 },
  { id: "N5", x: 230, y: 400 },
  { id: "N6", x: 330, y: 400 },
  // Riga inferiore: N1 N2 N3
  { id: "N1", x: 130, y: 530 },
  { id: "N2", x: 230, y: 530 },
  { id: "N3", x: 330, y: 530 },
  // APRON C (Centro) — 4 stand in linea
  { id: "C1", x: 540, y: 460 },
  { id: "C2", x: 615, y: 460 },
  { id: "C3", x: 690, y: 460 },
  { id: "C4", x: 765, y: 460 },
  // APRON W (Ovest/destra carta) — 2 stand in colonna
  { id: "W1", x: 910, y: 440 },
  { id: "W2", x: 910, y: 545 },
];

function LIBPBackground() {
  return (
    <g>
      {/* APRON polygons */}
      <polygon points="70,355 415,355 415,580 70,580" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <polygon points="475,410 805,410 805,500 475,500" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <polygon points="865,400 955,400 955,580 865,580" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />

      {/* Apron labels */}
      <text x="180" y="370" className="mono" style={{ fill: "#7aaed4", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>APRON N</text>
      <text x="555" y="425" className="mono" style={{ fill: "#7aaed4", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>APRON C</text>
      <text x="880" y="412" className="mono" style={{ fill: "#7aaed4", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>APRON W</text>

      {/* Area verde sopra Apron C (zona non operativa) */}
      <polygon points="540,355 805,355 805,405 540,405" fill="#1e5e3e" stroke="#2d8155" strokeWidth="1" opacity="0.6" />

      {/* Aerostazione */}
      <rect x="500" y="600" width="350" height="50" fill="#2d4358" stroke="#5d7896" strokeWidth="1.5" />
      <text x="675" y="632" textAnchor="middle" className="mono" style={{ fill: "#cbd5e1", fontSize: 16, fontWeight: 700, letterSpacing: 3 }}>AEROSTAZIONE</text>

      {/* TAXIWAY E (parallela orizzontale sotto la pista) */}
      <rect x="75" y="310" width="855" height="20" fill="#5a4815" />
      <line x1="80" y1="320" x2="925" y2="320" stroke="#facc15" strokeWidth="1.2" strokeDasharray="6 4" />

      {/* Aree verdi tra raccordi pista-TWY E */}
      <polygon points="170,245 360,245 380,300 150,300" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.8" opacity="0.5" />
      <polygon points="430,245 600,245 615,300 425,300" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.8" opacity="0.5" />
      <polygon points="660,245 855,245 870,300 665,300" fill="#1e5e3e" stroke="#2d8155" strokeWidth="0.8" opacity="0.5" />

      {/* Raccordi A B C D (dalla pista alla TWY E) */}
      {[
        { name: "D", x: 130, labelX: 80 },
        { name: "C", x: 385, labelX: 365 },
        { name: "B", x: 640, labelX: 625 },
        { name: "A", x: 895, labelX: 905 },
      ].map((c) => (
        <g key={c.name}>
          <rect x={c.x - 12} y="240" width="24" height="80" fill="#5a4815" />
          <line x1={c.x} y1="245" x2={c.x} y2="315" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
          <text x={c.labelX} y="275" className="mono" style={{ fill: "#facc15", fontSize: 13, fontWeight: 700 }}>{c.name}</text>
        </g>
      ))}

      {/* Etichetta TAXIWAY E (visibile in 2 punti) */}
      <text x="245" y="325" className="mono" style={{ fill: "#facc15", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>E</text>
      <text x="540" y="325" className="mono" style={{ fill: "#facc15", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>E</text>
      <text x="800" y="325" className="mono" style={{ fill: "#facc15", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>E</text>

      {/* Raccordi verticali tra apron (H G F) */}
      <rect x="430" y="320" width="20" height="260" fill="#5a4815" />
      <line x1="440" y1="325" x2="440" y2="575" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <text x="448" y="460" className="mono" style={{ fill: "#facc15", fontSize: 13, fontWeight: 700 }}>H</text>

      <rect x="820" y="320" width="20" height="190" fill="#5a4815" />
      <line x1="830" y1="325" x2="830" y2="505" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <text x="838" y="430" className="mono" style={{ fill: "#facc15", fontSize: 13, fontWeight: 700 }}>G</text>

      <rect x="820" y="500" width="120" height="20" fill="#5a4815" />
      <line x1="825" y1="510" x2="935" y2="510" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />
      <text x="870" y="497" className="mono" style={{ fill: "#facc15", fontSize: 13, fontWeight: 700 }}>F</text>

      {/* PISTA 04/22 */}
      <rect x="70" y="195" width="860" height="50" fill="#1f2937" stroke="#374151" strokeWidth="1" />
      <line x1="85" y1="220" x2="915" y2="220" stroke="#fff" strokeWidth="2" strokeDasharray="20 16" opacity="0.9" />

      {/* Threshold bars 04 (sinistra) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t04-${i}`} x1={73} y1={200 + i * 11} x2={87} y2={200 + i * 11} stroke="#fff" strokeWidth="2.5" />
      ))}
      {/* Threshold bars 22 (destra) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t22-${i}`} x1={913} y1={200 + i * 11} x2={927} y2={200 + i * 11} stroke="#fff" strokeWidth="2.5" />
      ))}

      {/* Numeri pista */}
      <text x="115" y="232" textAnchor="middle" className="mono" style={{ fill: "#fff", fontSize: 32, fontWeight: 900, letterSpacing: 2 }}>04</text>
      <text x="885" y="232" textAnchor="middle" className="mono" style={{ fill: "#fff", fontSize: 32, fontWeight: 900, letterSpacing: 2 }}>22</text>

      {/* Stand circles */}
      {LIBP_PARKING.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r="14" fill="rgba(7,18,30,0.5)" stroke="#7aaed4" strokeWidth="1.5" />
          <text x={p.x} y={p.y + 5} textAnchor="middle" className="mono" style={{ fill: "#ffffff", fontSize: 12, fontWeight: 700 }}>{p.id}</text>
        </g>
      ))}

      {/* Holding points (HP A, HP B, HP C, HP D - in corrispondenza dei raccordi) */}
      {[
        { name: "HP D", x: 130 },
        { name: "HP C", x: 385 },
        { name: "HP B", x: 640 },
        { name: "HP A", x: 895 },
      ].map((h) => (
        <g key={h.name}>
          <rect x={h.x - 12} y="248" width="24" height="6" fill="rgba(250,204,21,0.2)" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
          <text x={h.x} y="263" textAnchor="middle" className="mono" style={{ fill: "#facc15", fontSize: 9, fontWeight: 700 }}>{h.name}</text>
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
  freqs: [
    { label: "GROUND",    value: "121.800" },
    { label: "TOWER",     value: "118.450" },
    { label: "APPROACH",  value: "120.050" },
    { label: "Roma INFO", value: "124.200" },
    { label: "121.5 EMG", value: "121.500" },
  ],
  parking: LIBP_PARKING,
  defaultStand: "C1",
  defaultHeading: 90,
  Background: LIBPBackground,
};

// ------------------------------------------------------------
// LIAH — CELANO (inventato sulle specs dell'Aeroclub)
// ------------------------------------------------------------
const LIAH_PARKING = [
  // Stand 1-4 lato sinistro
  { id: "1", x: 280, y: 380 },
  { id: "2", x: 330, y: 380 },
  { id: "3", x: 380, y: 380 },
  { id: "4", x: 430, y: 380 },
  // Stand 5-8 lato destro
  { id: "5", x: 570, y: 380 },
  { id: "6", x: 620, y: 380 },
  { id: "7", x: 670, y: 380 },
  { id: "8", x: 720, y: 380 },
];

function LIAHBackground() {
  return (
    <g>
      {/* APRON (rettangolo sotto la pista) */}
      <polygon points="240,310 760,310 760,450 240,450" fill="#1a3a52" stroke="#2c5478" strokeWidth="1.5" />
      <text x="500" y="332" textAnchor="middle" className="mono" style={{ fill: "#7aaed4", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>APRON</text>

      {/* HANGAR centrale (in basso) */}
      <rect x="470" y="465" width="60" height="65" fill="#2d4358" stroke="#5d7896" strokeWidth="1.5" />
      <text x="500" y="503" textAnchor="middle" className="mono" style={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>HANGAR</text>

      {/* Raccordo apron-pista (centro) */}
      <rect x="490" y="240" width="20" height="75" fill="#5a4815" />
      <line x1="500" y1="245" x2="500" y2="310" stroke="#facc15" strokeWidth="1.2" strokeDasharray="5 4" />

      {/* PISTA 08/26 (800m, scalata) */}
      <rect x="100" y="195" width="800" height="40" fill="#1f2937" stroke="#374151" strokeWidth="1" />
      <line x1="115" y1="215" x2="885" y2="215" stroke="#fff" strokeWidth="2" strokeDasharray="20 16" opacity="0.9" />

      {/* Threshold bars 08 (sinistra) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t08-${i}`} x1={103} y1={199 + i * 9} x2={117} y2={199 + i * 9} stroke="#fff" strokeWidth="2.5" />
      ))}
      {/* Threshold bars 26 (destra) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`t26-${i}`} x1={883} y1={199 + i * 9} x2={897} y2={199 + i * 9} stroke="#fff" strokeWidth="2.5" />
      ))}

      {/* Numeri pista */}
      <text x="145" y="227" textAnchor="middle" className="mono" style={{ fill: "#fff", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>08</text>
      <text x="855" y="227" textAnchor="middle" className="mono" style={{ fill: "#fff", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>26</text>

      {/* Stand circles */}
      {LIAH_PARKING.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r="16" fill="rgba(7,18,30,0.5)" stroke="#7aaed4" strokeWidth="1.5" />
          <text x={p.x} y={p.y + 5} textAnchor="middle" className="mono" style={{ fill: "#ffffff", fontSize: 13, fontWeight: 700 }}>{p.id}</text>
        </g>
      ))}

      {/* Holding point al raccordo */}
      <rect x="488" y="248" width="24" height="6" fill="rgba(250,204,21,0.2)" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
      <text x="500" y="263" textAnchor="middle" className="mono" style={{ fill: "#facc15", fontSize: 10, fontWeight: 700 }}>HP</text>
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
  freqs: [
    { label: "TRAFFIC",   value: "123.500" },
    { label: "Roma INFO", value: "124.200" },
    { label: "121.5 EMG", value: "121.500" },
  ],
  parking: LIAH_PARKING,
  defaultStand: "1",
  defaultHeading: 90,
  Background: LIAHBackground,
};

// ------------------------------------------------------------
export const AIRPORTS = {
  LIBP: AIRPORT_LIBP,
  LIAH: AIRPORT_LIAH,
};

export const AIRPORT_OPTIONS = [
  { id: "LIBP", label: "LIBP · Pescara" },
  { id: "LIAH", label: "LIAH · Celano" },
];
