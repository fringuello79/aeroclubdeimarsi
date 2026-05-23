import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "./useSession";
import { AIRPORTS, AIRPORT_OPTIONS } from "./airports";

const STATUSES = [
  { value: "PARKED",   label: "Parked",        color: "#94a3b8" },
  { value: "STARTUP",  label: "Startup",       color: "#a3e635" },
  { value: "TAXI",     label: "Taxi",          color: "#facc15" },
  { value: "HOLDING",  label: "Holding Point", color: "#fb923c" },
  { value: "LINEUP",   label: "Line-up",       color: "#f97316" },
  { value: "DEPART",   label: "Departing",     color: "#22d3ee" },
  { value: "AIRBORNE", label: "Airborne",      color: "#34d399" },
  { value: "FINAL",    label: "Final",         color: "#a78bfa" },
];

const SPECIAL_SQUAWKS = {
  "7500": { label: "HIJACK", color: "#ef4444" },
  "7600": { label: "COM FAIL", color: "#f59e0b" },
  "7700": { label: "EMERGENCY", color: "#ef4444" },
  "7000": { label: "VFR (ICAO)", color: "#10b981" },
};

const PALETTE = ["#fbbf24","#60a5fa","#34d399","#f472b6","#a78bfa","#22d3ee","#fb7185","#84cc16"];

const PRESETS = [
  { callsign: "I-6195", type: "P96 Golf" },
  { callsign: "I-8297", type: "P2002 Sierra" },
];

const typeFromCallsign = (cs) => {
  const p = PRESETS.find((x) => x.callsign === cs);
  return p ? p.type : "ULM";
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const DEFAULT_VIEWBOX = { x: 0, y: 0, w: 1000, h: 700 };

// Logo Aeroclub dei Marsi (file in public/logo.jpg, servito via base path)
const LOGO_URL = import.meta.env.BASE_URL + "logo.jpg";

export default function App() {
  const {
    uid, aircraft, airport,
    upsertAircraft, patchAircraft, deleteAircraft, setupDisconnect,
    setAirport, resetAllTraffic,
  } = useSession();

  const [me, setMe] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [drag, setDrag] = useState(null);
  const [rotateDrag, setRotateDrag] = useState(null);
  const [panDrag, setPanDrag] = useState(null);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const svgRef = useRef(null);

  const apData = AIRPORTS[airport] || AIRPORTS.LIBP;

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;500;600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  useEffect(() => { setViewBox(DEFAULT_VIEWBOX); }, [airport]);

  const toSvg = useCallback((cx, cy) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    const ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
    return p.matrixTransform(ctm.inverse());
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e) => {
      e.preventDefault();
      const point = toSvg(e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      setViewBox((vb) => {
        const newW = clamp(vb.w * factor, 200, 2500);
        const newH = newW * (vb.h / vb.w);
        const newX = point.x - (point.x - vb.x) * (newW / vb.w);
        const newY = point.y - (point.y - vb.y) * (newH / vb.h);
        return { x: newX, y: newY, w: newW, h: newH };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [toSvg, me]);

  const zoomIn = () => setViewBox((vb) => ({ x: vb.x + vb.w*0.1, y: vb.y + vb.h*0.1, w: clamp(vb.w*0.8, 200, 2500), h: clamp(vb.h*0.8, 140, 1750) }));
  const zoomOut = () => setViewBox((vb) => ({ x: vb.x - vb.w*0.125, y: vb.y - vb.h*0.125, w: clamp(vb.w*1.25, 200, 2500), h: clamp(vb.h*1.25, 140, 1750) }));
  const zoomReset = () => setViewBox(DEFAULT_VIEWBOX);

  const findFreeStand = (apId) => {
    const ap = AIRPORTS[apId] || AIRPORTS.LIBP;
    const occupied = new Set(aircraft.map(a => `${a.x},${a.y}`));
    for (const s of ap.parking) {
      if (!occupied.has(`${s.x},${s.y}`)) return s;
    }
    return ap.parking[0];
  };

  const handleJoin = ({ name, callsign, role }) => {
    if (!uid) { alert("Connessione in corso, riprova tra un attimo."); return; }
    const userPlaneId = `a_${uid}`;
    const cs = callsign.trim().toUpperCase();
    const stand = findFreeStand(airport);
    const apDef = AIRPORTS[airport];
    const defaultFreq = apDef.freqs[0]?.value || "121.500";
    const userPlane = {
      callsign: cs, type: typeFromCallsign(cs),
      x: stand.x, y: stand.y,
      heading: apDef.defaultHeading || 90,
      squawk: "7000", freq: defaultFreq,
      altitude: 0, status: "PARKED",
      color: PALETTE[aircraft.length % PALETTE.length],
      ownerId: uid, ownerName: name, ownerRole: role,
    };
    upsertAircraft(userPlaneId, userPlane);
    setupDisconnect(userPlaneId);
    setMe({ userId: uid, name, callsign: cs, role, planeId: userPlaneId });
    setIsInstructor(role === "istruttore");
    setSelectedId(userPlaneId);
  };

  const handleLeave = () => {
    if (me?.planeId) deleteAircraft(me.planeId);
    setMe(null); setSelectedId(null); setIsInstructor(false);
  };

  if (!me) return <JoinScreen onJoin={handleJoin} ready={!!uid} />;

  const selected = aircraft.find((a) => a.id === selectedId);
  const canControl = (ac) => isInstructor || ac.ownerId === me.userId;
  const myColor = aircraft.find(a => a.ownerId === me.userId)?.color || PALETTE[0];

  const onPlaneDown = (e, ac) => {
    e.stopPropagation();
    setSelectedId(ac.id);
    if (!canControl(ac)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toSvg(e.clientX, e.clientY);
    setDrag({ id: ac.id, offsetX: ac.x - x, offsetY: ac.y - y });
  };

  const onRotateDown = (e, ac) => {
    e.stopPropagation();
    if (!canControl(ac)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setRotateDrag({ id: ac.id });
  };

  const onMapDown = (e) => {
    if (drag || rotateDrag) return;
    setPanDrag({ startClientX: e.clientX, startClientY: e.clientY, startVB: { ...viewBox } });
  };

  const onMove = (e) => {
    if (drag) {
      const { x, y } = toSvg(e.clientX, e.clientY);
      patchAircraft(drag.id, { x: clamp(x + drag.offsetX, 20, 980), y: clamp(y + drag.offsetY, 20, 680) });
    } else if (rotateDrag) {
      const ac = aircraft.find(a => a.id === rotateDrag.id);
      if (!ac) return;
      const { x, y } = toSvg(e.clientX, e.clientY);
      const angle = Math.round((Math.atan2(x - ac.x, -(y - ac.y)) * 180 / Math.PI + 360) % 360);
      patchAircraft(rotateDrag.id, { heading: angle });
    } else if (panDrag) {
      const svg = svgRef.current; if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sx = panDrag.startVB.w / rect.width;
      const sy = panDrag.startVB.h / rect.height;
      setViewBox({
        x: panDrag.startVB.x - (e.clientX - panDrag.startClientX) * sx,
        y: panDrag.startVB.y - (e.clientY - panDrag.startClientY) * sy,
        w: panDrag.startVB.w, h: panDrag.startVB.h,
      });
    }
  };

  const onUp = () => { setDrag(null); setRotateDrag(null); setPanDrag(null); };

  const updateSelected = (patch) => {
    if (!selected || !canControl(selected)) return;
    patchAircraft(selectedId, patch);
  };

  const addAircraft = () => {
    if (!isInstructor) return;
    const cs = `I-${String(7000 + Math.floor(Math.random() * 999)).padStart(4, "0")}`;
    const id = `a_npc_${Date.now()}`;
    const stand = findFreeStand(airport);
    const apDef = AIRPORTS[airport];
    upsertAircraft(id, {
      callsign: cs, type: "ULM",
      x: stand.x, y: stand.y,
      heading: apDef.defaultHeading || 90,
      squawk: "7000", freq: apDef.freqs[0]?.value || "121.500",
      altitude: 0, status: "PARKED",
      color: PALETTE[aircraft.length % PALETTE.length],
      ownerId: `u_npc_${Date.now()}`, ownerName: "NPC", ownerRole: "npc",
    });
    setSelectedId(id);
  };

  const removeAircraft = (id) => {
    if (!isInstructor) return;
    deleteAircraft(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleResetTraffic = () => {
    if (!isInstructor) return;
    if (!confirm("Cancellare tutti gli aerei? Tutti i piloti dovranno rientrare.")) return;
    resetAllTraffic();
    setSelectedId(null);
    setMe(null);
  };

  const handleAirportChange = (newId) => {
    if (!isInstructor) return;
    setAirport(newId);
  };

  const people = aircraft
    .filter(a => a.ownerRole !== "npc")
    .sort((a, b) => (a.ownerName || "").localeCompare(b.ownerName || ""));

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div className="app-root">
      <style>{`
        @keyframes pulse-emergency { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
        .grain { background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 3px 3px; }
        .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        html, body, #root { margin: 0; padding: 0; height: 100%; width: 100%; }
        *, *::before, *::after { box-sizing: border-box; }
        .app-root {
          font-family: 'Outfit', system-ui, sans-serif;
          background: radial-gradient(ellipse at top, #0b1b2b 0%, #050a13 70%, #02060c 100%);
          color: #f1f5f9;
          height: 100vh; width: 100vw;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .app-main {
          flex: 1 1 auto; display: flex; gap: 10px; padding: 10px;
          overflow: hidden; min-height: 0; width: 100%;
        }
        .map-container {
          position: relative; flex: 1 1 auto; min-width: 0;
          border-radius: 8px; overflow: hidden;
          background: linear-gradient(180deg,#061523 0%,#040d18 100%);
          border: 1px solid #2d5980;
        }
        .sidebar {
          flex: 0 0 340px; display: flex; flex-direction: column;
          gap: 10px; overflow-y: auto;
        }
        @media (max-width: 1000px) {
          .app-root { height: auto; min-height: 100vh; overflow: auto; }
          .app-main { flex-direction: column; overflow: visible; }
          .sidebar { flex: 0 0 auto; max-width: 100%; }
          .map-container { flex: 0 0 auto; height: 60vh; min-height: 380px; }
        }
        .zoom-btn {
          width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
          border-radius: 4px; background: rgba(3,10,20,0.85); color: #cbd5e1;
          border: 1px solid #2d5980; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700;
        }
        .zoom-btn:hover { background: rgba(7,18,30,0.95); color: #fbbf24; }
        input, select, button { font-family: inherit; }
        input:focus, select:focus { outline: 1px solid #fbbf24; }
      `}</style>

      <header style={{ borderBottom: "1px solid #2d5980", background: "rgba(3,10,20,0.7)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, flex: "0 0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={LOGO_URL}
            alt="Aeroclub dei Marsi"
            style={{
              width: 44, height: 44,
              borderRadius: 7,
              objectFit: "contain",
              background: "#fff",
              padding: 2,
              border: "1px solid #fbbf24",
              boxShadow: "0 0 0 1px rgba(251,191,36,0.3)",
            }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, color: "#fbbf24" }}>AEROCLUB DEI MARSI</div>
            <div className="mono" style={{ fontSize: 11, color: "#94a3b8" }}>ATC TRAINER · {apData.id} {apData.shortName} · {apData.runwayInfo.split('·')[0].trim()} · ELEV {apData.elev}ft</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1 }}>AEROPORTO</span>
            <select
              value={airport}
              onChange={(e) => handleAirportChange(e.target.value)}
              disabled={!isInstructor}
              className="mono"
              style={{
                padding: "7px 10px", borderRadius: 4,
                background: "rgba(7,18,30,0.85)",
                border: `1px solid ${isInstructor ? "#fbbf24" : "#2d5980"}`,
                color: isInstructor ? "#fbbf24" : "#cbd5e1",
                fontSize: 12, fontWeight: 700, letterSpacing: 1,
                cursor: isInstructor ? "pointer" : "not-allowed",
              }}
            >
              {AIRPORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="mono" style={{ fontSize: 12, padding: "7px 12px", borderRadius: 4, background: "rgba(7,18,30,0.85)", border: "1px solid #2d5980", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#94a3b8" }}>SEI</span>
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>{me.name}</span>
            <span style={{ color: "#475569" }}>·</span>
            <span style={{ color: myColor, fontWeight: 700, letterSpacing: 1 }}>{me.callsign}</span>
            {isInstructor && <span style={{ color: "#fca5a5", fontSize: 10, padding: "0 5px", borderRadius: 2, background: "rgba(127,29,29,0.3)", border: "1px solid #7f1d1d", fontWeight: 700 }}>ISTR</span>}
          </div>

          <ModeToggle isInstructor={isInstructor} setIsInstructor={setIsInstructor} />

          {isInstructor && (
            <>
              <button onClick={addAircraft} className="mono" style={{ fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 4, background: "rgba(251,191,36,0.15)", border: "1px solid #f59e0b", color: "#fbbf24", cursor: "pointer" }}>+ AIRCRAFT</button>
              <button onClick={handleResetTraffic} className="mono" style={{ fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 4, background: "rgba(127,29,29,0.2)", border: "1px solid #7f1d1d", color: "#fca5a5", cursor: "pointer" }}>RESET</button>
            </>
          )}

          <button onClick={handleLeave} className="mono" style={{ fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 4, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer" }}>ESCI</button>
        </div>
      </header>

      <div className="app-main">
        <div className="map-container grain">
          <div className="mono" style={{ position: "absolute", top: 10, left: 10, fontSize: 12, padding: "5px 9px", borderRadius: 4, background: "rgba(3,10,20,0.85)", color: "#cbd5e1", border: "1px solid #2d5980", zIndex: 10, fontWeight: 600 }}>
            {apData.id} · {aircraft.length} TFC · {apData.coords}
          </div>

          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 4, zIndex: 10 }}>
            <button className="zoom-btn" onClick={zoomIn} title="Zoom +">+</button>
            <button className="zoom-btn" onClick={zoomOut} title="Zoom −">−</button>
            <button className="zoom-btn" onClick={zoomReset} title="Reset" style={{ fontSize: 14 }}>⌂</button>
          </div>

          <svg
            ref={svgRef}
            viewBox={viewBoxStr}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", display: "block", userSelect: "none", touchAction: "none", cursor: panDrag ? "grabbing" : "default" }}
            onPointerDown={onMapDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0e2236" strokeWidth="0.5" /></pattern>
              <pattern id="gridMaj" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M 200 0 L 0 0 0 200" fill="none" stroke="#162e48" strokeWidth="0.8" /></pattern>
            </defs>
            <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#grid)" />
            <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#gridMaj)" />

            <apData.Background />

            {aircraft.map((ac) => (
              <AircraftMarker
                key={ac.id}
                ac={ac}
                selected={ac.id === selectedId}
                isMine={ac.ownerId === me.userId}
                controllable={canControl(ac)}
                onPointerDown={(e) => onPlaneDown(e, ac)}
                onRotateDown={(e) => onRotateDown(e, ac)}
              />
            ))}
          </svg>

          <div className="mono" style={{ position: "absolute", bottom: 8, left: 8, fontSize: 11, padding: "5px 9px", borderRadius: 4, background: "rgba(3,10,20,0.85)", color: "#cbd5e1", border: "1px solid #2d5980", maxWidth: "70%", fontWeight: 500 }}>
            {apData.runwayInfo} · Non in scala. Da non usare durante le operazioni di volo.
          </div>
        </div>

        <aside className="sidebar">
          <PresentiPanel people={people} myUid={me.userId} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />

          {selected ? (
            <Console ac={selected} update={updateSelected} isInstructor={isInstructor} canEdit={canControl(selected)} freqs={apData.freqs} />
          ) : (
            <PanelBox title="Consolle">
              <div className="mono" style={{ fontSize: 12, padding: 24, textAlign: "center", color: "#94a3b8" }}>Seleziona un aereo dalla mappa o dalla lista.</div>
            </PanelBox>
          )}

          {isInstructor && selected && <InstructorPanel ac={selected} update={updateSelected} onRemove={() => removeAircraft(selected.id)} />}
        </aside>
      </div>
    </div>
  );
}

function JoinScreen({ onJoin, ready }) {
  const [name, setName] = useState("");
  const [callsign, setCallsign] = useState("");
  const [role, setRole] = useState("pilota");
  const canJoin = ready && name.trim().length >= 2 && callsign.trim().length >= 4;
  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", background: "radial-gradient(ellipse at top, #0b1b2b 0%, #050a13 70%, #02060c 100%)", minHeight: "100vh", color: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{`.mono { font-family: 'JetBrains Mono', ui-monospace, monospace; } html,body,#root{margin:0;padding:0;height:100%;width:100%;} *{box-sizing:border-box;}`}</style>
      <div style={{ maxWidth: 480, width: "100%", borderRadius: 8, background: "rgba(7,18,30,0.85)", border: "1px solid #2d5980", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #2d5980" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img
              src={LOGO_URL}
              alt="Aeroclub dei Marsi"
              style={{
                width: 58, height: 58,
                borderRadius: 8,
                objectFit: "contain",
                background: "#fff",
                padding: 3,
                border: "1px solid #fbbf24",
                boxShadow: "0 0 0 1px rgba(251,191,36,0.3)",
              }}
            />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1.5, color: "#fbbf24" }}>AEROCLUB DEI MARSI</div>
              <div className="mono" style={{ fontSize: 12, color: "#94a3b8" }}>ATC TRAINER · BRIEFING ROOM</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          {!ready && <div className="mono" style={{ fontSize: 12, padding: "8px 10px", borderRadius: 4, background: "rgba(127,29,29,0.15)", border: "1px solid #7f1d1d", color: "#fca5a5" }}>Connessione a Firebase in corso...</div>}
          <Field label="Nome">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Alessandro" autoFocus style={{ width: "100%", padding: "10px 12px", borderRadius: 4, background: "#02060c", border: "1px solid #2d5980", color: "#f1f5f9", fontSize: 15 }} />
          </Field>
          <Field label="Marche assegnate">
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, marginBottom: 8 }}>
              {PRESETS.map((p) => (
                <button key={p.callsign} onClick={() => setCallsign(p.callsign)} className="mono" style={{ textAlign: "left", padding: "10px 12px", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "space-between", background: callsign === p.callsign ? "rgba(251,191,36,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${callsign === p.callsign ? "#f59e0b" : "#2d5980"}`, cursor: "pointer" }}>
                  <span style={{ color: callsign === p.callsign ? "#fbbf24" : "#cbd5e1", fontWeight: 700, letterSpacing: 1.5, fontSize: 14 }}>{p.callsign}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Tecnam {p.type}</span>
                </button>
              ))}
            </div>
            <input type="text" value={callsign} onChange={(e) => setCallsign(e.target.value.toUpperCase().slice(0, 8))} placeholder="oppure custom (es. I-7777)" className="mono" style={{ width: "100%", padding: "10px 12px", borderRadius: 4, background: "#02060c", border: "1px solid #2d5980", color: "#fbbf24", fontWeight: 700, fontSize: 15, letterSpacing: 2, textAlign: "center" }} />
          </Field>
          <Field label="Ruolo">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button onClick={() => setRole("pilota")} className="mono" style={{ padding: "10px 12px", borderRadius: 4, fontSize: 14, fontWeight: 700, letterSpacing: 1, background: role === "pilota" ? "rgba(125,211,252,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${role === "pilota" ? "#0284c7" : "#2d5980"}`, color: role === "pilota" ? "#7dd3fc" : "#94a3b8", cursor: "pointer" }}>PILOTA</button>
              <button onClick={() => setRole("istruttore")} className="mono" style={{ padding: "10px 12px", borderRadius: 4, fontSize: 14, fontWeight: 700, letterSpacing: 1, background: role === "istruttore" ? "rgba(252,165,165,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${role === "istruttore" ? "#dc2626" : "#2d5980"}`, color: role === "istruttore" ? "#fca5a5" : "#94a3b8", cursor: "pointer" }}>ISTRUTTORE</button>
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#94a3b8" }}>{role === "pilota" ? "Controllerai solo il tuo aereo." : "Potrai gestire tutto il traffico, cambiare aeroporto, forzare emergenze."}</div>
          </Field>
          <button onClick={() => onJoin({ name: name.trim(), callsign: callsign.trim().toUpperCase(), role })} disabled={!canJoin} className="mono" style={{ width: "100%", padding: "13px 16px", fontWeight: 700, letterSpacing: 2, borderRadius: 4, background: canJoin ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "#1e3a5f", color: canJoin ? "#0b1b2b" : "#64748b", cursor: canJoin ? "pointer" : "not-allowed", border: "none", fontSize: 15 }}>ENTRA NEL BRIEFING →</button>
          <div className="mono" style={{ fontSize: 11, textAlign: "center", color: "#64748b" }}>Cmdt. F. Lozzi · Vicepres. A. Felli</div>
        </div>
      </div>
    </div>
  );
}

function ModeToggle({ isInstructor, setIsInstructor }) {
  return (
    <div className="mono" style={{ display: "flex", borderRadius: 4, overflow: "hidden", fontSize: 12, border: "1px solid #2d5980" }}>
      <button onClick={() => setIsInstructor(false)} style={{ padding: "8px 12px", fontWeight: 700, letterSpacing: 1, background: !isInstructor ? "#1e3a5f" : "transparent", color: !isInstructor ? "#7dd3fc" : "#94a3b8", border: "none", cursor: "pointer" }}>PILOTA</button>
      <button onClick={() => setIsInstructor(true)} style={{ padding: "8px 12px", fontWeight: 700, letterSpacing: 1, background: isInstructor ? "#7f1d1d" : "transparent", color: isInstructor ? "#fca5a5" : "#94a3b8", border: "none", cursor: "pointer" }}>ISTRUTTORE</button>
    </div>
  );
}

function PresentiPanel({ people, myUid, selectedId, onSelect }) {
  return (
    <PanelBox title={`Presenti (${people.length})`}>
      {people.length === 0 && (
        <div className="mono" style={{ fontSize: 12, padding: 12, textAlign: "center", color: "#94a3b8" }}>Nessuno connesso.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {people.map((p) => {
          const isMine = p.ownerId === myUid;
          const isSelected = p.id === selectedId;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 5, cursor: "pointer",
                background: isMine
                  ? "rgba(251,191,36,0.12)"
                  : isSelected ? "rgba(255,255,255,0.05)" : "rgba(7,18,30,0.5)",
                border: `1px solid ${isMine ? "#fbbf24" : isSelected ? p.color : "#2d5980"}`,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.color, flexShrink: 0, border: "1px solid #0b1b2b" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="mono" style={{ color: p.color, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{p.callsign}</span>
                  {isMine && <span className="mono" style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: "#fbbf24", color: "#0b1b2b", fontWeight: 700, letterSpacing: 1 }}>TU</span>}
                  {p.ownerRole === "istruttore" && <span className="mono" style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: "rgba(127,29,29,0.5)", color: "#fca5a5", fontWeight: 700, border: "1px solid #7f1d1d" }}>ISTR</span>}
                </div>
                <div className="mono" style={{ color: "#cbd5e1", fontSize: 12, marginTop: 2 }}>{p.ownerName}</div>
              </div>
            </div>
          );
        })}
      </div>
    </PanelBox>
  );
}

function AircraftMarker({ ac, selected, isMine, controllable, onPointerDown, onRotateDown }) {
  const isEmergency = ["7500","7600","7700"].includes(ac.squawk);
  const status = STATUSES.find((s) => s.value === ac.status) || STATUSES[0];
  const handleR = 26;

  return (
    <g transform={`translate(${ac.x} ${ac.y})`}>
      {isEmergency && <circle r="26" fill="none" stroke="#ef4444" strokeWidth="2.5" style={{ animation: "pulse-emergency 1.4s ease-in-out infinite" }} />}

      {selected && controllable && <circle r={handleR} fill="none" stroke={ac.color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85" />}
      {selected && !controllable && <circle r={handleR} fill="none" stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />}

      <g onPointerDown={onPointerDown} style={{ cursor: controllable ? "grab" : "pointer", touchAction: "none" }}>
        <g transform={`rotate(${ac.heading})`}>
          <path d="M 0 -13 L 2 -8 L 2 0 L 13 5 L 13 7 L 2 5 L 2 9 L 6 13 L 6 14 L 0 13 L -6 14 L -6 13 L -2 9 L -2 5 L -13 7 L -13 5 L -2 0 L -2 -8 Z" fill={ac.color} stroke="#0b1b2b" strokeWidth="1" strokeLinejoin="round" opacity={controllable ? 1 : 0.8} />
        </g>
      </g>

      {selected && controllable && (
        <g onPointerDown={onRotateDown} style={{ cursor: "alias", touchAction: "none" }} transform={`rotate(${ac.heading})`}>
          <line x1="0" y1="0" x2="0" y2={-handleR} stroke={ac.color} strokeWidth="1" opacity="0.4" />
          <circle cx="0" cy={-handleR} r="6" fill={ac.color} stroke="#0b1b2b" strokeWidth="1.5" />
          <circle cx="0" cy={-handleR} r="2" fill="#0b1b2b" />
        </g>
      )}

      {isMine && (
        <g transform="translate(-16 -16)">
          <circle r="7" fill="#fbbf24" stroke="#0b1b2b" strokeWidth="1.2" />
          <text textAnchor="middle" y="3" className="mono" style={{ fill: "#0b1b2b", fontSize: 8, fontWeight: 900 }}>TU</text>
        </g>
      )}

      <g transform="translate(0 32)">
        <rect x="-36" y="-10" width="72" height="26" rx="3" fill="rgba(3,10,20,0.92)" stroke={selected ? ac.color : "#2d5980"} strokeWidth="1.2" />
        <text x="0" y="2" textAnchor="middle" className="mono" style={{ fill: ac.color, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{ac.callsign}</text>
        <text x="0" y="12" textAnchor="middle" className="mono" style={{ fill: status.color, fontSize: 8, fontWeight: 600 }}>
          {ac.altitude > 0 ? `${ac.altitude}ft · ${status.label}` : status.label}
        </text>
      </g>
    </g>
  );
}

function Console({ ac, update, isInstructor, canEdit, freqs }) {
  const isEmergency = ["7500","7600","7700"].includes(ac.squawk);
  const special = SPECIAL_SQUAWKS[ac.squawk];
  const disabled = !canEdit;
  return (
    <PanelBox title="Consolle" accent={ac.color} subtitle={ac.callsign}>
      {disabled && <div className="mono" style={{ fontSize: 12, padding: "7px 10px", borderRadius: 4, marginBottom: 12, background: "rgba(127,29,29,0.15)", border: "1px solid #7f1d1d", color: "#fca5a5", fontWeight: 600 }}>SOLA LETTURA · non controlli questo aereo</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>

        <Field label="Stato">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {STATUSES.map((s) => (
              <button key={s.value} onClick={() => update({ status: s.value })} disabled={disabled} className="mono" style={{ fontSize: 11, padding: "6px 8px", borderRadius: 4, textAlign: "left", background: ac.status === s.value ? "rgba(7,18,30,0.95)" : "rgba(7,18,30,0.5)", border: `1px solid ${ac.status === s.value ? s.color : "#2d5980"}`, color: ac.status === s.value ? s.color : "#cbd5e1", fontWeight: ac.status === s.value ? 700 : 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}>{s.label}</button>
            ))}
          </div>
        </Field>

        <Field label="Marche">
          <input type="text" value={ac.callsign} onChange={(e) => update({ callsign: e.target.value.toUpperCase().slice(0, 8) })} disabled={!isInstructor} className="mono" style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#02060c", border: `1px solid ${isInstructor ? "#2d5980" : "#0f1e30"}`, color: ac.color, fontWeight: 700, fontSize: 16, letterSpacing: 2, opacity: isInstructor ? 1 : 0.7 }} />
        </Field>

        <Field label="Squawk" hint={special ? <span style={{ color: special.color, fontWeight: 700 }}>{special.label}</span> : null}>
          <input type="text" value={ac.squawk} onChange={(e) => update({ squawk: e.target.value.replace(/[^0-7]/g, "").slice(0, 4) })} disabled={disabled} placeholder="7000" inputMode="numeric" className="mono" style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#02060c", border: `1px solid ${isEmergency ? "#ef4444" : "#2d5980"}`, color: isEmergency ? "#fca5a5" : "#7dd3fc", fontWeight: 700, fontSize: 18, letterSpacing: 4, textAlign: "center", opacity: disabled ? 0.5 : 1 }} />
        </Field>

        <Field label="Frequenza (MHz)">
          <input type="text" value={ac.freq} onChange={(e) => update({ freq: e.target.value })} disabled={disabled} placeholder="118.450" inputMode="decimal" className="mono" style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#02060c", border: "1px solid #2d5980", color: "#a3e635", fontWeight: 700, fontSize: 16, letterSpacing: 2, textAlign: "center", opacity: disabled ? 0.5 : 1 }} />
          {!disabled && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {freqs.map((f) => (
                <button key={f.value} onClick={() => update({ freq: f.value })} className="mono" style={{ fontSize: 10, padding: "3px 7px", borderRadius: 2, background: ac.freq === f.value ? "rgba(163,230,53,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${ac.freq === f.value ? "#65a30d" : "#2d5980"}`, color: ac.freq === f.value ? "#a3e635" : "#cbd5e1", cursor: "pointer", fontWeight: 600 }}>{f.label}</button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Quota (ft)">
          <div style={{ display: "flex", gap: 4 }}>
            <input type="number" value={ac.altitude} onChange={(e) => update({ altitude: Math.max(0, parseInt(e.target.value) || 0) })} disabled={disabled} step="500" className="mono" style={{ flex: 1, padding: "8px 10px", borderRadius: 4, background: "#02060c", border: "1px solid #2d5980", color: "#fbbf24", fontWeight: 700, fontSize: 15, letterSpacing: 1, textAlign: "center", opacity: disabled ? 0.5 : 1, minWidth: 0 }} />
            <button onClick={() => update({ altitude: ac.altitude + 500 })} disabled={disabled} className="mono" style={{ padding: "0 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980", color: "#cbd5e1", fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>+500</button>
            <button onClick={() => update({ altitude: Math.max(0, ac.altitude - 500) })} disabled={disabled} className="mono" style={{ padding: "0 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980", color: "#cbd5e1", fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>−500</button>
          </div>
        </Field>

        <Field label="Prua (°) — o trascina la maniglia sull'aereo">
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="number" value={ac.heading} onChange={(e) => { let v = parseInt(e.target.value) || 0; v = ((v % 360) + 360) % 360; update({ heading: v }); }} disabled={disabled} min="0" max="359" className="mono" style={{ flex: 1, padding: "8px 10px", borderRadius: 4, background: "#02060c", border: "1px solid #2d5980", color: "#c4b5fd", fontWeight: 700, fontSize: 15, letterSpacing: 1, textAlign: "center", opacity: disabled ? 0.5 : 1, minWidth: 0 }} />
            <button onClick={() => update({ heading: (ac.heading + 10) % 360 })} disabled={disabled} className="mono" style={{ padding: "0 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980", color: "#cbd5e1", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>↻</button>
            <button onClick={() => update({ heading: ((ac.heading - 10) % 360 + 360) % 360 })} disabled={disabled} className="mono" style={{ padding: "0 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980", color: "#cbd5e1", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>↺</button>
          </div>
        </Field>
      </div>
    </PanelBox>
  );
}

function InstructorPanel({ ac, update, onRemove }) {
  return (
    <PanelBox title="Strumenti Istruttore" accent="#ef4444">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="mono" style={{ fontSize: 12, color: "#cbd5e1" }}>Forza squawk emergenza su <span style={{ color: "#fca5a5", fontWeight: 700 }}>{ac.callsign}</span>:</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[{ code: "7500", label: "HIJACK" }, { code: "7600", label: "COM FAIL" }, { code: "7700", label: "EMERGENCY" }].map((s) => (
            <button key={s.code} onClick={() => update({ squawk: s.code })} className="mono" style={{ padding: "10px 6px", borderRadius: 4, background: ac.squawk === s.code ? "rgba(239,68,68,0.2)" : "rgba(127,29,29,0.25)", border: `1px solid ${ac.squawk === s.code ? "#ef4444" : "#7f1d1d"}`, color: "#fca5a5", cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{s.code}</div>
              <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2 }}>{s.label}</div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => update({ squawk: "7000" })} className="mono" style={{ flex: 1, fontSize: 12, padding: "8px 10px", borderRadius: 4, background: "rgba(16,185,129,0.12)", border: "1px solid #065f46", color: "#34d399", cursor: "pointer", fontWeight: 600 }}>↺ Reset 7000</button>
          <button onClick={onRemove} className="mono" style={{ flex: 1, fontSize: 12, padding: "8px 10px", borderRadius: 4, background: "rgba(127,29,29,0.15)", border: "1px solid #7f1d1d", color: "#fca5a5", cursor: "pointer", fontWeight: 600 }}>✕ Rimuovi aereo</button>
        </div>
      </div>
    </PanelBox>
  );
}

function PanelBox({ title, subtitle, accent = "#fbbf24", children }) {
  return (
    <div style={{ borderRadius: 8, background: "rgba(7,18,30,0.7)", border: "1px solid #2d5980" }}>
      <div style={{ padding: "9px 13px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2d5980" }}>
        <div className="mono" style={{ fontSize: 12, letterSpacing: 2, color: accent, fontWeight: 700 }}>{title.toUpperCase()}</div>
        {subtitle && <div className="mono" style={{ fontSize: 13, color: accent, fontWeight: 700, letterSpacing: 1 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: 13 }}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <label className="mono" style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1, fontWeight: 600 }}>{label.toUpperCase()}</label>
        {hint && <div className="mono" style={{ fontSize: 11 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}
