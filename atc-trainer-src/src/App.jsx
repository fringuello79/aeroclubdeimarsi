import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "./useSession";
import { usePTT } from "./usePTT";
import {
  AIRPORTS, AIRPORT_OPTIONS, WORLD, WORLD_FOCUS,
  REPORTING_POINTS, COMMON_FREQS, GeographicBackground, WindIndicator,
  freqAbbr,
} from "./airports";

// Versione applicazione
const APP_VERSION = "v1.9b · 28/05/2026";

const STATUSES = [
  { value: "PARKED",   label: "Parked",        abbr: "PK", color: "#94a3b8" },
  { value: "STARTUP",  label: "Startup",       abbr: "ST", color: "#a3e635" },
  { value: "TAXI",     label: "Taxi",          abbr: "TX", color: "#facc15" },
  { value: "HOLDING",  label: "Holding Point", abbr: "HP", color: "#fb923c" },
  { value: "LINEUP",   label: "Line-up",       abbr: "LU", color: "#f97316" },
  { value: "DEPART",   label: "Departing",     abbr: "DP", color: "#22d3ee" },
  { value: "AIRBORNE", label: "Airborne",      abbr: "AB", color: "#34d399" },
  { value: "FINAL",    label: "Final",         abbr: "FN", color: "#a78bfa" },
];

const SPECIAL_SQUAWKS = {
  "7500": { label: "HIJACK", color: "#ef4444" },
  "7600": { label: "COM FAIL", color: "#f59e0b" },
  "7700": { label: "EMERGENCY", color: "#ef4444" },
  "7000": { label: "VFR (ICAO)", color: "#10b981" },
};

const PALETTE = ["#fbbf24","#60a5fa","#34d399","#f472b6","#a78bfa","#22d3ee","#fb7185","#84cc16"];

// ============================================================
// TEMA "avionica moderna" v1.9 — palette centralizzata
// Ispirato ai display G1000/G3000 e ai radar ATC contemporanei
// ============================================================
const T = {
  // sfondi
  bg:        "#061018",        // sfondo principale mappa
  bgPanel:   "#0d1622",        // pannelli sidebar
  bgInset:   "#08111c",        // sfondi interni (campi, righe)
  bgHeader:  "rgba(8,18,30,0.92)",
  // bordi
  border:    "#1e3148",        // bordo standard
  borderHi:  "#2c5478",        // bordo enfasi
  borderDim: "#142030",        // bordo sottilissimo
  // testo
  text:      "#d4e5f7",        // testo principale
  textDim:   "#94a3b8",
  textLow:   "#5d7896",
  // accent avionica
  cyan:      "#5ac8f5",        // accent primario (selezione, info)
  cyanSoft:  "#7dd3fc",
  amber:     "#fbbf24",        // identità (TU, frequenza), giallo PESCARA
  amberSoft: "#fde68a",
  green:     "#22c55e",        // trasmette / OK
  greenSoft: "#86efac",
  red:       "#ef4444",        // emergenza
  redSoft:   "#fca5a5",
  magenta:   "#f472b6",
  // status pista/route
  sea:       "#08283e",
  seaLine:   "#5fa8d3",
  rwy:       "#1a2a3a",
  rwyLine:   "#4d6985",
  rwyThresh: "#5ac8f5",
};

const PRESETS = [
  { callsign: "I-6195", type: "P96 Golf" },
  { callsign: "I-8297", type: "P2002 Sierra" },
];

const typeFromCallsign = (cs) => {
  const p = PRESETS.find((x) => x.callsign === cs);
  return p ? p.type : "ULM";
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Vista predefinita: tutta l'Abruzzo
const DEFAULT_VIEWBOX = { x: WORLD_FOCUS.x, y: WORLD_FOCUS.y, w: WORLD_FOCUS.w, h: WORLD_FOCUS.h };

// Logo Aeroclub dei Marsi (file in public/logo.jpg, servito via base path)
const LOGO_URL = import.meta.env.BASE_URL + "logo.jpg";

// Rileva dispositivo touch (no hover + puntatore "coarse" = iPhone/Android/iPad)
const detectTouchDevice = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
};

export default function App() {
  const {
    uid, aircraft, airport, wind, pttState,
    upsertAircraft, patchAircraft, deleteAircraft, setupDisconnect,
    setAirport, resetAllTraffic, setWind,
    acquirePTT, releasePTT,
  } = useSession();

  const [me, setMe] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [drag, setDrag] = useState(null);
  const [rotateDrag, setRotateDrag] = useState(null);
  const [panDrag, setPanDrag] = useState(null);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const [touchMode, setTouchMode] = useState(detectTouchDevice());
  const svgRef = useRef(null);
  const tapStartRef = useRef(null);
  const isPinchingRef = useRef(false);
  const viewBoxRef = useRef(DEFAULT_VIEWBOX);

  // Mantengo viewBoxRef sincronizzato con lo state per leggerlo dentro touch handlers
  useEffect(() => { viewBoxRef.current = viewBox; }, [viewBox]);

  // ============================================================
  // PTT AUDIO (WebRTC mesh) — attivo solo dopo il join (me != null)
  // ============================================================
  const myColorForPtt = aircraft.find(a => a.ownerId === me?.userId)?.color || "#7dd3fc";
  const voice = usePTT({
    uid,
    enabled: !!me,
    displayName: me?.name,
    color: myColorForPtt,
    isInstructor,
  });

  const pttHeldRef = useRef(false);       // sto tenendo premuto il PTT?
  const pttTimeoutRef = useRef(null);     // timeout di sicurezza 30s
  const wasOverriddenRef = useRef(false); // sono stato interrotto dall'istruttore?
  const [pttToast, setPttToast] = useState(null); // avviso temporaneo (es. "interrotto")

  // Beep "occupato" — generato a runtime, niente file esterni
  const beepOccupied = useCallback(() => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 440;
      gain.gain.value = 0.12;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      osc.onended = () => { try { ctx.close(); } catch (e) {} };
    } catch (e) { /* silenzioso */ }
  }, []);

  // Inizio trasmissione: prima acquisisco il lock, poi apro il microfono
  const handlePttDown = useCallback(async () => {
    if (!me || pttHeldRef.current) return;
    if (voice.micDenied) { beepOccupied(); return; }
    pttHeldRef.current = true;
    const ok = await acquirePTT(me.name, myColorForPtt, isInstructor);
    if (!ok) {
      // Linea occupata e non sono istruttore → beep e annullo
      pttHeldRef.current = false;
      beepOccupied();
      return;
    }
    wasOverriddenRef.current = false;
    voice.startTransmit();
    // Timeout di sicurezza: rilascio d'ufficio dopo 30s di trasmissione continua
    if (pttTimeoutRef.current) clearTimeout(pttTimeoutRef.current);
    pttTimeoutRef.current = setTimeout(() => { handlePttUp(); }, 30000);
  }, [me, voice, acquirePTT, myColorForPtt, isInstructor, beepOccupied]);

  // Fine trasmissione: chiudo microfono e rilascio il lock
  const handlePttUp = useCallback(async () => {
    if (!pttHeldRef.current) return;
    pttHeldRef.current = false;
    if (pttTimeoutRef.current) { clearTimeout(pttTimeoutRef.current); pttTimeoutRef.current = null; }
    voice.stopTransmit();
    await releasePTT();
  }, [voice, releasePTT]);

  // Se mentre trasmetto l'istruttore fa override, il lock non è più mio:
  // chiudo il mio microfono e mostro l'avviso.
  // ESTESO v1.9b: copre anche la race condition in cui due piloti acquisiscono
  // simultaneamente. Firebase risolve a uno solo, l'altro deve mutarsi subito
  // anche se ha già abilitato il mic localmente.
  useEffect(() => {
    if (!me) return;
    const active = pttState.activeTransmitter;
    // Caso 1: stavo tenendo premuto, il lock è cambiato a un altro
    if (pttHeldRef.current && active && active !== uid) {
      pttHeldRef.current = false;
      if (pttTimeoutRef.current) { clearTimeout(pttTimeoutRef.current); pttTimeoutRef.current = null; }
      voice.forceMute();
      if (!wasOverriddenRef.current) {
        wasOverriddenRef.current = true;
        setPttToast(`Interrotto da ${pttState.activeName || "istruttore"}`);
        setTimeout(() => setPttToast(null), 2500);
      }
      return;
    }
    // Caso 2 (race): il mio mic è attivo ma il lock non è mio (o è null).
    // Significa che ho perso la transazione: mute immediato senza toast.
    if (voice.isTransmitting && active !== uid) {
      voice.forceMute();
      pttHeldRef.current = false;
      if (pttTimeoutRef.current) { clearTimeout(pttTimeoutRef.current); pttTimeoutRef.current = null; }
    }
  }, [pttState, uid, me, voice]);

  // Barra spaziatrice = PTT su desktop (ignoro se sto scrivendo in un input)
  useEffect(() => {
    if (!me || touchMode) return;
    const isTyping = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    const onKeyDown = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (isTyping(document.activeElement)) return;
      e.preventDefault();
      if (!e.repeat) handlePttDown();
    };
    const onKeyUp = (e) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (isTyping(document.activeElement)) return;
      e.preventDefault();
      handlePttUp();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [me, touchMode, handlePttDown, handlePttUp]);

  // Stato visivo del PTT: libero / trasmetto io / occupato da altri
  const pttBusyByOther = pttState.activeTransmitter && pttState.activeTransmitter !== uid;
  const pttStatus = voice.isTransmitting ? "TX" : (pttBusyByOther ? "BUSY" : "FREE");

  const apData = AIRPORTS[airport] || null;
  const viewLabel = apData
    ? `${apData.id} ${apData.shortName}`
    : "ABRUZZO · VISTA D'INSIEME";

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;500;600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  // Reset viewBox quando cambia la vista (WORLD/LIBP/LIAH)
  useEffect(() => {
    if (airport === "WORLD") {
      setViewBox({ x: WORLD_FOCUS.x, y: WORLD_FOCUS.y, w: WORLD_FOCUS.w, h: WORLD_FOCUS.h });
    } else if (AIRPORTS[airport]) {
      const fb = AIRPORTS[airport].focusBox;
      setViewBox({ x: fb.x, y: fb.y, w: fb.w, h: fb.h });
    }
  }, [airport]);

  // Sicurezza mobile: se un PILOTA su touch ha la selezione su un aereo non suo
  // (per qualunque ragione), la riporto automaticamente sul proprio aereo.
  useEffect(() => {
    if (!me || isInstructor || !touchMode) return;
    if (!selectedId) return;
    const sel = aircraft.find(a => a.id === selectedId);
    if (sel && sel.ownerId !== me.userId) {
      setSelectedId(me.planeId);
    }
  }, [selectedId, aircraft, me, isInstructor, touchMode]);

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
        const newW = clamp(vb.w * factor, 200, WORLD.w * 1.2);
        const newH = newW * (vb.h / vb.w);
        const newX = point.x - (point.x - vb.x) * (newW / vb.w);
        const newY = point.y - (point.y - vb.y) * (newH / vb.h);
        return { x: newX, y: newY, w: newW, h: newH };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [toSvg, me]);

  // PINCH-TO-ZOOM (touch). 2 dita = zoom attorno al midpoint.
  // ============================================================
  // GESTIONE TOUCH (mobile): gestita TUTTA via touch events nativi.
  //  - 1 dito che si muove: pan della mappa
  //  - 1 dito fermo (tap): se aereo selezionato, lo sposta lì
  //  - 2 dita: pinch zoom (centrato sul midpoint delle dita)
  // I pointer events React sono ignorati su touch (vedi onMapDown/onMove/onMapUp).
  // ============================================================
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Stato del gesto corrente (uno alla volta)
    let gesture = null; // {kind:"pan", startClientX, startClientY, startVB, moved, startedAt}
                        // o {kind:"pinch", startDist, startVB, svgMid}
    // Se l'utente ha toccato un aereo, vogliamo che la selezione vinca sul tap-to-move:
    // l'aereo lo gestisce via onPointerDown del marker. Qui non interferiamo se
    // l'evento target è interno a un gruppo aereo (target.closest("[data-aircraft]")).

    const dist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const mid  = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });

    const clientToSvg = (cx, cy) => {
      const rect = svg.getBoundingClientRect();
      const vbAttr = svg.getAttribute("viewBox").split(/\s+/).map(Number);
      const vb = { x: vbAttr[0], y: vbAttr[1], w: vbAttr[2], h: vbAttr[3] };
      return {
        x: vb.x + ((cx - rect.left) / rect.width) * vb.w,
        y: vb.y + ((cy - rect.top)  / rect.height) * vb.h,
        vb,
      };
    };

    const onTouchStart = (e) => {
      // Se il tocco parte da un aereo, lasciamo che pointer events selezionino l'aereo.
      // (Non avviamo né pan né pinch, ma se diventano 2 dita la pinch parte comunque).
      if (e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        const isOnAircraft = !!(t.target && t.target.closest && t.target.closest("[data-aircraft]"));
        if (isOnAircraft) {
          // L'aereo gestisce la selezione via pointer. Non avviamo pan.
          gesture = null;
          isPinchingRef.current = false;
          return;
        }
        gesture = {
          kind: "pan",
          startClientX: t.clientX,
          startClientY: t.clientY,
          startVB: { ...viewBoxRef.current },
          moved: false,
          startedAt: Date.now(),
        };
        isPinchingRef.current = false;
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const midClient = mid(t1, t2);
        const { x, y, vb } = clientToSvg(midClient.x, midClient.y);
        gesture = {
          kind: "pinch",
          startDist: dist(t1, t2),
          startVB: vb,
          svgMid: { x, y },
        };
        isPinchingRef.current = true;
      }
    };

    const onTouchMove = (e) => {
      if (!gesture) return;
      if (gesture.kind === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - gesture.startClientX;
        const dy = t.clientY - gesture.startClientY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) gesture.moved = true;
        const rect = svg.getBoundingClientRect();
        const sx = gesture.startVB.w / rect.width;
        const sy = gesture.startVB.h / rect.height;
        setViewBox({
          x: gesture.startVB.x - dx * sx,
          y: gesture.startVB.y - dy * sy,
          w: gesture.startVB.w, h: gesture.startVB.h,
        });
      } else if (gesture.kind === "pinch" && e.touches.length >= 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const newDist = dist(t1, t2);
        if (newDist < 10) return;
        const scale = gesture.startDist / newDist; // >1 = zoom out, <1 = zoom in
        const newW = clamp(gesture.startVB.w * scale, 200, WORLD.w * 1.5);
        const ratio = gesture.startVB.h / gesture.startVB.w;
        const newH = newW * ratio;
        const newX = gesture.svgMid.x - (gesture.svgMid.x - gesture.startVB.x) * (newW / gesture.startVB.w);
        const newY = gesture.svgMid.y - (gesture.svgMid.y - gesture.startVB.y) * (newH / gesture.startVB.h);
        setViewBox({ x: newX, y: newY, w: newW, h: newH });
      }
    };

    const onTouchEnd = (e) => {
      // Se era un pan: se non si è mosso e è breve, è un tap → sposta aereo (se controllabile)
      if (gesture && gesture.kind === "pan" && !gesture.moved) {
        const dt = Date.now() - gesture.startedAt;
        if (dt < 400 && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          const { x, y } = clientToSvg(t.clientX, t.clientY);
          const sel = aircraft.find(a => a.id === selectedId);
          if (sel && canControl(sel)) {
            patchAircraft(selectedId, {
              x: clamp(x, 20, WORLD.w - 20),
              y: clamp(y, 20, WORLD.h - 20),
            });
          }
        }
      }
      gesture = null;
      if (e.touches.length === 0) {
        // Lascio un piccolo delay prima di rilasciare il flag pinch
        setTimeout(() => { isPinchingRef.current = false; }, 100);
      }
    };

    svg.addEventListener("touchstart", onTouchStart, { passive: false });
    svg.addEventListener("touchmove",  onTouchMove,  { passive: false });
    svg.addEventListener("touchend",   onTouchEnd);
    svg.addEventListener("touchcancel",onTouchEnd);
    return () => {
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove",  onTouchMove);
      svg.removeEventListener("touchend",   onTouchEnd);
      svg.removeEventListener("touchcancel",onTouchEnd);
    };
  }, [aircraft, selectedId]);

  const zoomIn = () => setViewBox((vb) => ({ x: vb.x + vb.w*0.1, y: vb.y + vb.h*0.1, w: clamp(vb.w*0.8, 200, WORLD.w * 1.2), h: clamp(vb.h*0.8, 140, WORLD.h * 1.2) }));
  const zoomOut = () => setViewBox((vb) => ({ x: vb.x - vb.w*0.125, y: vb.y - vb.h*0.125, w: clamp(vb.w*1.25, 200, WORLD.w * 1.2), h: clamp(vb.h*1.25, 140, WORLD.h * 1.2) }));
  const zoomReset = () => setViewBox(DEFAULT_VIEWBOX);

  const findFreeStand = (apId) => {
    const ap = AIRPORTS[apId] || AIRPORTS.LIBP;
    const occupied = new Set(aircraft.map(a => `${Math.round(a.x)},${Math.round(a.y)}`));
    for (const s of ap.parking) {
      if (!occupied.has(`${Math.round(s.x)},${Math.round(s.y)}`)) return s;
    }
    return ap.parking[0];
  };

  // Verifica marche libere (case-insensitive). Ritorna {ok, by} dove "by" è il nome dell'occupante se ok=false.
  const checkCallsignFree = (cs) => {
    const norm = cs.trim().toUpperCase();
    const conflict = aircraft.find(a => (a.callsign || "").trim().toUpperCase() === norm);
    if (conflict) return { ok: false, by: conflict.ownerName || "altro utente" };
    return { ok: true };
  };

  const handleJoin = ({ name, callsign, role, startAirport }) => {
    if (!uid) { alert("Connessione in corso, riprova tra un attimo."); return; }
    const cs = callsign.trim().toUpperCase();
    // Check marche univoche (esclude il proprio eventuale aereo già registrato)
    const userPlaneId = `a_${uid}`;
    const conflict = aircraft.find(a =>
      (a.callsign || "").trim().toUpperCase() === cs && a.id !== userPlaneId
    );
    if (conflict) {
      alert(`Le marche ${cs} sono già utilizzate da ${conflict.ownerName || "un altro utente"}. Sceglile diverse.`);
      return;
    }

    const startApId = startAirport || "LIBP";
    const apDef = AIRPORTS[startApId];
    const stand = findFreeStand(startApId);
    const defaultFreq = apDef.freqs[0]?.value || "121.500";
    const userPlane = {
      callsign: cs, type: typeFromCallsign(cs),
      x: stand.x, y: stand.y,
      heading: apDef.defaultHeading || 0,
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
    if (isPinchingRef.current) return;
    e.stopPropagation();
    // Fix mobile: in modalità touch un PILOTA può selezionare SOLO il proprio aereo.
    // Evita che gli allievi tocchino per sbaglio l'aereo di un altro e poi non riescano
    // più a muovere il proprio. L'istruttore mantiene piena libertà di selezione.
    if (touchMode && !isInstructor && ac.ownerId !== me.userId) {
      return; // ignora il tap su aerei altrui: la selezione resta sul proprio
    }
    setSelectedId(ac.id);
    if (!canControl(ac)) return;
    if (touchMode) return; // In modalità touch nessun drag: solo seleziona
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toSvg(e.clientX, e.clientY);
    setDrag({ id: ac.id, offsetX: ac.x - x, offsetY: ac.y - y });
  };

  const onRotateDown = (e, ac) => {
    e.stopPropagation();
    if (!canControl(ac) || touchMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setRotateDrag({ id: ac.id });
  };

  const onMapDown = (e) => {
    // In touch mode il pan/tap è gestito interamente dai touch events nativi
    if (touchMode) return;
    if (drag || rotateDrag) return;
    if (isPinchingRef.current) return;
    // Setup pan (mouse only)
    setPanDrag({ startClientX: e.clientX, startClientY: e.clientY, startVB: { ...viewBox } });
  };

  const onMove = (e) => {
    if (touchMode) return; // touch handled altrove
    if (isPinchingRef.current) return;
    if (drag) {
      const { x, y } = toSvg(e.clientX, e.clientY);
      patchAircraft(drag.id, { x: clamp(x + drag.offsetX, 20, WORLD.w - 20), y: clamp(y + drag.offsetY, 20, WORLD.h - 20) });
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

  // In touch mode il tap/spostamento è gestito da touch events (sopra).
  // In mouse mode questo è un classico mouseup.
  const onMapUp = () => {
    if (touchMode) return;
    onUp();
  };

  const updateSelected = (patch) => {
    if (!selected || !canControl(selected)) return;
    patchAircraft(selectedId, patch);
  };

  const addAircraft = () => {
    if (!isInstructor) return;
    const cs = `I-${String(7000 + Math.floor(Math.random() * 999)).padStart(4, "0")}`;
    const id = `a_npc_${Date.now()}`;
    // Se siamo in vista WORLD, gli NPC partono da LIBP per default
    const targetAp = AIRPORTS[airport] ? airport : "LIBP";
    const stand = findFreeStand(targetAp);
    const apDef = AIRPORTS[targetAp];
    upsertAircraft(id, {
      callsign: cs, type: "ULM",
      x: stand.x, y: stand.y,
      heading: apDef.defaultHeading || 0,
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

  // Lista frequenze unificata (entrambi gli aeroporti + comuni)
  const allFreqs = [
    ...AIRPORTS.LIBP.freqs.map(f => ({ ...f, label: `PESC ${f.label}` })),
    ...AIRPORTS.LIAH.freqs.map(f => ({ ...f, label: `CEL ${f.label}` })),
    ...COMMON_FREQS,
  ];

  const people = aircraft
    .filter(a => a.ownerRole !== "npc")
    .sort((a, b) => (a.ownerName || "").localeCompare(b.ownerName || ""));

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <div className="app-root">
      <style>{`
        @keyframes pulse-emergency { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
        @keyframes ptt-wave { 0%{opacity:0.9;transform:scale(0.7)} 100%{opacity:0;transform:scale(2.2)} }
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
            <div className="mono" style={{ fontSize: 11, color: "#94a3b8" }}>ATC TRAINER · {viewLabel}{apData ? ` · ${apData.runwayInfo.split('·')[0].trim()} · ELEV ${apData.elev}ft` : " · LIBP+LIAH"}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1 }}>VISTA</span>
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

          <InputModeToggle touchMode={touchMode} setTouchMode={setTouchMode} />

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
            {viewLabel} · {aircraft.length} TFC{apData ? ` · ${apData.coords}` : ""}
          </div>

          {touchMode && (
            <div className="mono" style={{
              position: "absolute",
              top: 38, left: 10,
              fontSize: 8, padding: "2px 5px", borderRadius: 3,
              background: "rgba(7,18,30,0.7)",
              color: "#94a3b8",
              border: "1px solid #1e3a5f",
              zIndex: 10, fontWeight: 500, letterSpacing: 0.2,
              maxWidth: "75%", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
              pointerEvents: "none",
              opacity: 0.75,
            }}>
              {selectedId && aircraft.find(a => a.id === selectedId && (isInstructor || a.ownerId === me.userId))
                ? "tap=posiziona · drag=mappa · pinch=zoom"
                : "tap=seleziona · drag=mappa · pinch=zoom"}
            </div>
          )}

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
            onPointerUp={onMapUp}
            onPointerLeave={onMapUp}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0e2236" strokeWidth="0.5" /></pattern>
              <pattern id="gridMaj" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M 200 0 L 0 0 0 200" fill="none" stroke="#162e48" strokeWidth="0.8" /></pattern>
            </defs>
            <rect x="-2000" y="-2000" width="6500" height="6500" fill="url(#grid)" />
            <rect x="-2000" y="-2000" width="6500" height="6500" fill="url(#gridMaj)" />

            {/* Sfondo geografico Abruzzo */}
            <GeographicBackground />

            {/* Entrambi gli aeroporti sempre visibili */}
            <AIRPORTS.LIBP.Background />
            <AIRPORTS.LIAH.Background />

            {/* Etichette aeroporti (sopra ciascuno) */}
            <g>
              <text x={AIRPORTS.LIBP.center.x} y={AIRPORTS.LIBP.center.y - 450} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#fbbf24", fontSize: 22, fontWeight: 700, letterSpacing: 3, pointerEvents: "none" }}>
                LIBP · PESCARA
              </text>
              <text x={AIRPORTS.LIAH.center.x} y={AIRPORTS.LIAH.center.y - 250} textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: "#fbbf24", fontSize: 18, fontWeight: 700, letterSpacing: 3, pointerEvents: "none" }}>
                LIAH · CELANO
              </text>
            </g>

            {/* Manica a vento per ogni aeroporto */}
            <g style={{ pointerEvents: "none" }}>
              <WindIndicator x={AIRPORTS.LIBP.windPos.x} y={AIRPORTS.LIBP.windPos.y} dir={wind?.LIBP?.dir ?? 0} speed={wind?.LIBP?.speed ?? 0} label="LIBP" />
              <WindIndicator x={AIRPORTS.LIAH.windPos.x} y={AIRPORTS.LIAH.windPos.y} dir={wind?.LIAH?.dir ?? 0} speed={wind?.LIAH?.speed ?? 0} label="LIAH" />
            </g>

            {aircraft.map((ac) => (
              <AircraftMarker
                key={ac.id}
                ac={ac}
                selected={ac.id === selectedId}
                isMine={ac.ownerId === me.userId}
                controllable={canControl(ac)}
                touchMode={touchMode}
                transmitting={!!pttState.activeTransmitter && ac.ownerId === pttState.activeTransmitter}
                onPointerDown={(e) => onPlaneDown(e, ac)}
                onRotateDown={(e) => onRotateDown(e, ac)}
              />
            ))}
          </svg>

          <div className="mono" style={{ position: "absolute", bottom: 8, left: 8, fontSize: 11, padding: "5px 9px", borderRadius: 4, background: "rgba(3,10,20,0.85)", color: "#cbd5e1", border: "1px solid #2d5980", maxWidth: "55%", fontWeight: 500 }}>
            Non in scala. Da non usare durante le operazioni di volo.
          </div>

          <div className="mono" style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, padding: "4px 8px", borderRadius: 4, background: "rgba(3,10,20,0.85)", color: "#94a3b8", border: "1px solid #2d5980", fontWeight: 600, letterSpacing: 0.5 }}>
            {APP_VERSION}
          </div>

          {/* Avviso temporaneo (es. interruzione da istruttore) */}
          {pttToast && (
            <div className="mono" style={{ position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)", fontSize: 12, padding: "7px 14px", borderRadius: 5, background: "rgba(127,29,29,0.92)", color: "#fecaca", border: "1px solid #ef4444", fontWeight: 700, zIndex: 30, letterSpacing: 0.5, pointerEvents: "none" }}>
              📻 {pttToast}
            </div>
          )}

          {/* PTT — pulsante radio */}
          <PTTButton
            status={pttStatus}
            touchMode={touchMode}
            micDenied={voice.micDenied}
            activeName={pttState.activeName}
            isMineActive={pttState.activeTransmitter === uid}
            onDown={handlePttDown}
            onUp={handlePttUp}
          />
        </div>

        <aside className="sidebar">
          {/* ISTRUTTORE: StripBoard in cima (con nomi piloti incorporati) */}
          {isInstructor && aircraft.length > 0 && (
            <InstructorStripBoard aircraft={aircraft} selectedId={selectedId} onSelect={setSelectedId} activeTransmitter={pttState.activeTransmitter} />
          )}
          {/* ISTRUTTORE senza traffico: messaggio segnaposto */}
          {isInstructor && aircraft.length === 0 && (
            <PanelBox title="Strip Board">
              <div className="mono" style={{ fontSize: 12, padding: 18, textAlign: "center", color: "#94a3b8" }}>Nessun aereo nel sistema. Premi + AIRCRAFT per aggiungere un NPC.</div>
            </PanelBox>
          )}

          {/* PILOTA: lista presenti compatta */}
          {!isInstructor && (
            <PresentiPanel
              people={people}
              myUid={me.userId}
              selectedId={selectedId}
              activeTransmitter={pttState.activeTransmitter}
              onSelect={(id) => {
                // Coerente col fix mappa: su mobile il pilota può riselezionare solo il proprio aereo
                if (touchMode) {
                  const target = aircraft.find(a => a.id === id);
                  if (target && target.ownerId !== me.userId) return;
                }
                setSelectedId(id);
              }}
            />
          )}

          {isInstructor && (
            <WindControlPanel wind={wind} setWind={setWind} />
          )}

          {selected ? (
            <Console ac={selected} update={updateSelected} isInstructor={isInstructor} canEdit={canControl(selected)} freqs={allFreqs} touchMode={touchMode} />
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
  const [startAirport, setStartAirport] = useState("LIBP");
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
          <Field label="Aeroporto di partenza">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button onClick={() => setStartAirport("LIBP")} className="mono" style={{ padding: "10px 12px", borderRadius: 4, fontSize: 13, fontWeight: 700, letterSpacing: 1, background: startAirport === "LIBP" ? "rgba(251,191,36,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${startAirport === "LIBP" ? "#f59e0b" : "#2d5980"}`, color: startAirport === "LIBP" ? "#fbbf24" : "#94a3b8", cursor: "pointer", textAlign: "center" }}>
                <div>LIBP</div>
                <div style={{ fontSize: 10, marginTop: 2, fontWeight: 500 }}>Pescara</div>
              </button>
              <button onClick={() => setStartAirport("LIAH")} className="mono" style={{ padding: "10px 12px", borderRadius: 4, fontSize: 13, fontWeight: 700, letterSpacing: 1, background: startAirport === "LIAH" ? "rgba(251,191,36,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${startAirport === "LIAH" ? "#f59e0b" : "#2d5980"}`, color: startAirport === "LIAH" ? "#fbbf24" : "#94a3b8", cursor: "pointer", textAlign: "center" }}>
                <div>LIAH</div>
                <div style={{ fontSize: 10, marginTop: 2, fontWeight: 500 }}>Celano</div>
              </button>
            </div>
          </Field>
          <Field label="Ruolo">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button onClick={() => setRole("pilota")} className="mono" style={{ padding: "10px 12px", borderRadius: 4, fontSize: 14, fontWeight: 700, letterSpacing: 1, background: role === "pilota" ? "rgba(125,211,252,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${role === "pilota" ? "#0284c7" : "#2d5980"}`, color: role === "pilota" ? "#7dd3fc" : "#94a3b8", cursor: "pointer" }}>PILOTA</button>
              <button onClick={() => setRole("istruttore")} className="mono" style={{ padding: "10px 12px", borderRadius: 4, fontSize: 14, fontWeight: 700, letterSpacing: 1, background: role === "istruttore" ? "rgba(252,165,165,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${role === "istruttore" ? "#dc2626" : "#2d5980"}`, color: role === "istruttore" ? "#fca5a5" : "#94a3b8", cursor: "pointer" }}>ISTRUTTORE</button>
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#94a3b8" }}>{role === "pilota" ? "Controllerai solo il tuo aereo." : "Potrai gestire tutto il traffico, cambiare vista, forzare emergenze."}</div>
          </Field>
          <button onClick={() => onJoin({ name: name.trim(), callsign: callsign.trim().toUpperCase(), role, startAirport })} disabled={!canJoin} className="mono" style={{ width: "100%", padding: "13px 16px", fontWeight: 700, letterSpacing: 2, borderRadius: 4, background: canJoin ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "#1e3a5f", color: canJoin ? "#0b1b2b" : "#64748b", cursor: canJoin ? "pointer" : "not-allowed", border: "none", fontSize: 15 }}>ENTRA NEL BRIEFING →</button>
          <div className="mono" style={{ fontSize: 11, textAlign: "center", color: "#64748b" }}>Cmdt. F. Lozzi · Vicepres. A. Felli · {APP_VERSION}</div>
        </div>
      </div>
    </div>
  );
}

function PTTButton({ status, touchMode, micDenied, activeName, isMineActive, onDown, onUp }) {
  // status: "TX" (trasmetto io) | "BUSY" (occupato da altri) | "FREE" (libero)
  const colors = {
    TX:   { bg: "#dc2626", border: "#ef4444", text: "#fff",     led: "#fca5a5", label: "IN TRASMISSIONE" },
    BUSY: { bg: "rgba(120,53,15,0.85)", border: "#f59e0b", text: "#fde68a", led: "#fbbf24", label: activeName ? `📻 ${activeName}` : "OCCUPATO" },
    FREE: { bg: "rgba(7,18,30,0.85)", border: "#16a34a", text: "#86efac", led: "#22c55e", label: touchMode ? "TIENI PER PARLARE" : "SPAZIO per parlare" },
  };
  const c = colors[status] || colors.FREE;

  // Handler che funzionano sia mouse che touch
  const downProps = {
    onMouseDown: (e) => { if (!touchMode) { e.preventDefault(); onDown(); } },
    onMouseUp:   (e) => { if (!touchMode) { e.preventDefault(); onUp(); } },
    onMouseLeave:(e) => { if (!touchMode) { onUp(); } },
    onTouchStart:(e) => { e.preventDefault(); onDown(); },
    onTouchEnd:  (e) => { e.preventDefault(); onUp(); },
    onTouchCancel:(e) => { onUp(); },
  };

  if (micDenied) {
    return (
      <div className="mono" style={{ position: "absolute", bottom: touchMode ? 70 : 44, left: "50%", transform: "translateX(-50%)", fontSize: 11, padding: "8px 14px", borderRadius: 6, background: "rgba(127,29,29,0.9)", color: "#fecaca", border: "1px solid #ef4444", fontWeight: 600, zIndex: 25, textAlign: "center", maxWidth: "80%" }}>
        🎤 Microfono non disponibile — puoi solo ascoltare
      </div>
    );
  }

  if (touchMode) {
    // Mobile: grande bottone circolare, basso-centro, semitrasparente a riposo
    return (
      <button
        {...downProps}
        className="mono"
        style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          width: 96, height: 96, borderRadius: "50%",
          background: c.bg, border: `3px solid ${c.border}`, color: c.text,
          fontSize: 11, fontWeight: 800, letterSpacing: 0.5, zIndex: 25,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
          touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
          opacity: status === "FREE" ? 0.82 : 1,
          boxShadow: status === "TX" ? "0 0 22px rgba(239,68,68,0.7)" : "0 4px 14px rgba(0,0,0,0.5)",
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: c.led, boxShadow: `0 0 8px ${c.led}` }} />
        <span style={{ fontSize: 9, lineHeight: 1.1, textAlign: "center", padding: "0 4px" }}>
          {status === "BUSY" && !isMineActive ? (activeName || "OCCUPATO") : status === "TX" ? "PARLA" : "PTT"}
        </span>
      </button>
    );
  }

  // Desktop: barra di stato in basso, il PTT vero è la barra spaziatrice
  return (
    <div
      {...downProps}
      className="mono"
      style={{
        position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 16px", borderRadius: 6,
        background: c.bg, border: `2px solid ${c.border}`, color: c.text,
        fontSize: 12, fontWeight: 700, letterSpacing: 1, zIndex: 25,
        cursor: "pointer", userSelect: "none",
        boxShadow: status === "TX" ? "0 0 18px rgba(239,68,68,0.6)" : "0 3px 10px rgba(0,0,0,0.4)",
      }}
      title="Tieni premuta la BARRA SPAZIATRICE per trasmettere"
    >
      <span style={{ width: 13, height: 13, borderRadius: "50%", background: c.led, boxShadow: `0 0 8px ${c.led}`, flexShrink: 0 }} />
      <span>{c.label}</span>
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

function InputModeToggle({ touchMode, setTouchMode }) {
  return (
    <div className="mono" title="Modalità di input: mouse (drag) o touch (tap per spostare)" style={{ display: "flex", borderRadius: 4, overflow: "hidden", fontSize: 11, border: "1px solid #2d5980" }}>
      <button onClick={() => setTouchMode(false)} style={{ padding: "8px 10px", fontWeight: 700, letterSpacing: 1, background: !touchMode ? "#1e3a5f" : "transparent", color: !touchMode ? "#7dd3fc" : "#64748b", border: "none", cursor: "pointer" }}>🖱 MOUSE</button>
      <button onClick={() => setTouchMode(true)} style={{ padding: "8px 10px", fontWeight: 700, letterSpacing: 1, background: touchMode ? "#1e3a5f" : "transparent", color: touchMode ? "#7dd3fc" : "#64748b", border: "none", cursor: "pointer" }}>👆 TOUCH</button>
    </div>
  );
}

// ============================================================
// WindControlPanel: pannello di controllo vento (solo istruttore)
// ============================================================
function WindControlPanel({ wind, setWind }) {
  if (!wind) return null;
  const rows = [
    { id: "LIBP", label: "LIBP Pescara", color: "#7dd3fc" },
    { id: "LIAH", label: "LIAH Celano",  color: "#fbbf24" },
  ];
  return (
    <PanelBox title="Vento">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => {
          const w = wind[r.id] || { dir: 0, speed: 0 };
          return (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980" }}>
              <div className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: r.color }}>{r.label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <label className="mono" style={{ fontSize: 10, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 2 }}>
                  Direzione (°)
                  <input
                    type="number" min="0" max="359"
                    value={w.dir}
                    onChange={(e) => setWind(r.id, e.target.value, w.speed)}
                    className="mono"
                    style={{ padding: "5px 6px", borderRadius: 3, background: "#02060c", border: "1px solid #2d5980", color: "#f1f5f9", fontSize: 13, fontWeight: 700, textAlign: "center" }}
                  />
                </label>
                <label className="mono" style={{ fontSize: 10, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 2 }}>
                  Velocità (kt)
                  <input
                    type="number" min="0" max="99"
                    value={w.speed}
                    onChange={(e) => setWind(r.id, w.dir, e.target.value)}
                    className="mono"
                    style={{ padding: "5px 6px", borderRadius: 3, background: "#02060c", border: "1px solid #2d5980", color: "#f1f5f9", fontSize: 13, fontWeight: 700, textAlign: "center" }}
                  />
                </label>
              </div>
              <div className="mono" style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
                {w.speed === 0 ? "CALMA" : `Vento da ${String(w.dir).padStart(3, "0")}° a ${String(w.speed).padStart(2, "0")} nodi`}
              </div>
            </div>
          );
        })}
      </div>
    </PanelBox>
  );
}

function InstructorStripBoard({ aircraft, selectedId, onSelect, activeTransmitter }) {
  // Ordinamento: emergenze prima, poi in volo, poi a terra, poi parcheggiati
  const STATUS_RANK = { AIRBORNE: 0, FINAL: 1, DEPART: 2, LINEUP: 3, HOLDING: 4, TAXI: 5, STARTUP: 6, PARKED: 7 };
  const sorted = [...aircraft].sort((a, b) => {
    const ea = ["7500","7600","7700"].includes(a.squawk) ? 0 : 1;
    const eb = ["7500","7600","7700"].includes(b.squawk) ? 0 : 1;
    if (ea !== eb) return ea - eb;
    return (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
  });

  return (
    <PanelBox title={`Strip Board (${aircraft.length})`} accent="#fca5a5">
      <div style={{
        display: "grid",
        gridTemplateColumns: "70px 42px 50px 60px 1fr",
        gap: 4, padding: "3px 6px 5px",
        fontSize: 9, color: "#94a3b8", letterSpacing: 1, fontWeight: 700,
      }} className="mono">
        <span>MARCHE</span><span>SQK</span><span>QUOTA</span><span>FREQ</span><span>STATO</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {sorted.map(ac => {
          const isEmergency = ["7500","7600","7700"].includes(ac.squawk);
          const isSelected = ac.id === selectedId;
          const isTx = activeTransmitter && ac.ownerId === activeTransmitter;
          const status = STATUSES.find(s => s.value === ac.status) || STATUSES[0];
          return (
            <div
              key={ac.id}
              onClick={() => onSelect(ac.id)}
              className="mono"
              style={{
                display: "grid",
                gridTemplateColumns: "70px 42px 50px 60px 1fr",
                gap: 4, alignItems: "center",
                padding: "6px 6px",
                fontSize: 11,
                borderRadius: 3, cursor: "pointer",
                background: isTx
                  ? "rgba(34,197,94,0.16)"
                  : isEmergency
                  ? "rgba(239,68,68,0.12)"
                  : isSelected ? "rgba(255,255,255,0.06)" : "rgba(7,18,30,0.5)",
                border: `1px solid ${isTx ? "#22c55e" : isSelected ? ac.color : isEmergency ? "#ef4444" : "#2d5980"}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <span style={{ color: ac.color, fontWeight: 700, letterSpacing: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isTx && <span style={{ color: "#22c55e" }}>🎤 </span>}{ac.callsign}
                </span>
                <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: 8, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: 0 }}>
                  {(ac.ownerName || (ac.ownerRole === "npc" ? "NPC" : "—")).slice(0, 10)}
                </span>
              </div>
              <span style={{ color: isEmergency ? "#fca5a5" : "#7dd3fc", fontWeight: 700 }}>{ac.squawk}</span>
              <span style={{ color: "#fbbf24" }}>{ac.altitude}ft</span>
              <span style={{ color: "#a3e635", fontSize: 10 }}>{ac.freq}</span>
              <span style={{ color: status.color, fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{status.label}{isEmergency && " 🚨"}</span>
            </div>
          );
        })}
      </div>
    </PanelBox>
  );
}

function PresentiPanel({ people, myUid, selectedId, onSelect, activeTransmitter }) {
  return (
    <PanelBox title={`Presenti (${people.length})`}>
      {people.length === 0 && (
        <div className="mono" style={{ fontSize: 12, padding: 12, textAlign: "center", color: "#94a3b8" }}>Nessuno connesso.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {people.map((p) => {
          const isMine = p.ownerId === myUid;
          const isSelected = p.id === selectedId;
          const isTx = activeTransmitter && p.ownerId === activeTransmitter;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 5, cursor: "pointer",
                background: isTx
                  ? "rgba(34,197,94,0.16)"
                  : isMine
                  ? "rgba(251,191,36,0.12)"
                  : isSelected ? "rgba(255,255,255,0.05)" : "rgba(7,18,30,0.5)",
                border: `1px solid ${isTx ? "#22c55e" : isMine ? "#fbbf24" : isSelected ? p.color : "#2d5980"}`,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: isTx ? "#22c55e" : p.color, flexShrink: 0, border: "1px solid #0b1b2b", boxShadow: isTx ? "0 0 8px #22c55e" : "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="mono" style={{ color: p.color, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{p.callsign}</span>
                  {isTx && <span className="mono" style={{ fontSize: 12 }}>🎤</span>}
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

function AircraftMarker({ ac, selected, isMine, controllable, touchMode, transmitting, onPointerDown, onRotateDown }) {
  const isEmergency = ["7500","7600","7700"].includes(ac.squawk);
  const status = STATUSES.find((s) => s.value === ac.status) || STATUSES[0];
  const handleR = 26;
  const HIT_R = touchMode ? 40 : 30;

  // NPC commercial (B737/A320) → silhouette più grande per distinguerli a colpo d'occhio
  const isCommercial = ac.ownerRole === "npc" && (String(ac.type || "").match(/B7|A3|A2|MD/i));
  const scale = isCommercial ? 1.25 : 1.0;

  const LABEL_W = 66;
  const LABEL_H = 28;
  const labelY = 22;

  const fullName = ac.ownerName || (ac.ownerRole === "npc" ? "NPC" : "—");
  const shortName = fullName.split(" ")[0].slice(0, 7);

  return (
    <g transform={`translate(${ac.x} ${ac.y})`} data-aircraft={ac.id}>
      {isEmergency && <circle r="26" fill="none" stroke={T.red} strokeWidth="2.5" style={{ animation: "pulse-emergency 1.4s ease-in-out infinite", pointerEvents: "none" }} />}

      {/* Onde radio quando l'utente di questo aereo sta trasmettendo (verde MFD) */}
      {transmitting && (
        <g style={{ pointerEvents: "none" }}>
          <circle r="18" fill="none" stroke={T.green} strokeWidth="2" opacity="0.7" style={{ animation: "ptt-wave 1.2s ease-out infinite" }} />
          <circle r="18" fill="none" stroke={T.green} strokeWidth="1.5" opacity="0.5" style={{ animation: "ptt-wave 1.2s ease-out infinite", animationDelay: "0.6s" }} />
        </g>
      )}

      <g style={{ pointerEvents: "none" }}>
        {selected && controllable && <circle r={handleR} fill="none" stroke={ac.color} strokeWidth="1.2" strokeDasharray="3 2.5" opacity="0.85" />}
        {selected && !controllable && <circle r={handleR} fill="none" stroke={T.redSoft} strokeWidth="1.2" strokeDasharray="3 2.5" opacity="0.7" />}

        <g transform={`rotate(${ac.heading}) scale(${scale})`}>
          <path
            d="M 0 -13 L 1.6 -8 L 1.6 -1 L 13 4 L 13 6 L 1.6 5 L 1.6 9 L 5 13 L 5 14 L 0 13 L -5 14 L -5 13 L -1.6 9 L -1.6 5 L -13 6 L -13 4 L -1.6 -1 L -1.6 -8 Z"
            fill={ac.color}
            stroke="#0b1b2b" strokeWidth="0.8" strokeLinejoin="round"
            opacity={controllable ? 1 : 0.85}
          />
          {/* Linea ala accennata (highlight chiaro) */}
          <line x1="-12" y1="5" x2="12" y2="5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
        </g>

        {/* Indicatore "TU": pill arrotondata invece di cerchio */}
        {isMine && (
          <g transform="translate(-14 -14)">
            <rect x="-8" y="-5.5" width="16" height="11" rx="3" fill={T.amber} stroke="#0b1b2b" strokeWidth="0.8" />
            <text textAnchor="middle" y="3" className="mono" style={{ fill: "#1a1a1a", fontSize: 7.5, fontWeight: 900, letterSpacing: 0.5 }}>TU</text>
          </g>
        )}

        {/* Cerchio mic verde quando l'aereo sta trasmettendo (in alto a destra) */}
        {transmitting && (
          <g transform="translate(14 -14)">
            <circle r="6.5" fill={T.green} stroke="#0b1b2b" strokeWidth="0.8" />
            <text textAnchor="middle" y="2.5" className="mono" style={{ fill: "#0b1b2b", fontSize: 8, fontWeight: 900 }}>●</text>
          </g>
        )}

        {/* Targhetta ultra-compatta: marche / nome·FREQ / SQK·ALT·ST */}
        <g transform={`translate(0 ${labelY})`}>
          <rect x={-LABEL_W/2} y={-2} width={LABEL_W} height={LABEL_H} rx="3" fill="rgba(8,16,28,0.85)" stroke={transmitting ? T.green : (selected ? ac.color : (isEmergency ? T.red : T.border))} strokeWidth="0.7" />
          <text x="0" y="5" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fill: ac.color, fontSize: 8, fontWeight: 700, letterSpacing: 0.4 }}>{ac.callsign}</text>
          <text x="0" y="13" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fontWeight: 700, letterSpacing: 0 }}>
            <tspan style={{ fill: T.greenSoft, fontSize: 7 }}>{shortName}</tspan>
            <tspan style={{ fill: T.amber, fontSize: 6 }}>·{freqAbbr(ac.freq)}</tspan>
          </text>
          <text x="0" y="21" textAnchor="middle" dominantBaseline="central" className="mono" style={{ fontSize: 6, fontWeight: 700, letterSpacing: 0 }}>
            <tspan style={{ fill: isEmergency ? T.redSoft : T.cyanSoft }}>{ac.squawk}</tspan>
            <tspan style={{ fill: "#e2e8f0" }}>·{ac.altitude}ft</tspan>
            <tspan style={{ fill: status.color }}>·{status.abbr}</tspan>
          </text>
        </g>
      </g>

      <rect
        x={-HIT_R} y={-HIT_R}
        width={HIT_R * 2} height={HIT_R + labelY + LABEL_H}
        fill="transparent"
        onPointerDown={onPointerDown}
        style={{ cursor: controllable ? (touchMode ? "pointer" : "grab") : "pointer", touchAction: "none" }}
      />

      {!touchMode && selected && controllable && (
        <g transform={`rotate(${ac.heading})`}>
          <line x1="0" y1="0" x2="0" y2={-handleR} stroke={ac.color} strokeWidth="1" opacity="0.4" style={{ pointerEvents: "none" }} />
          <circle
            cx="0" cy={-handleR} r="7"
            fill={ac.color} stroke="#0b1b2b" strokeWidth="1.5"
            onPointerDown={onRotateDown}
            style={{ cursor: "alias", touchAction: "none" }}
          />
          <circle cx="0" cy={-handleR} r="2" fill="#0b1b2b" style={{ pointerEvents: "none" }} />
        </g>
      )}
    </g>
  );
}

function Console({ ac, update, isInstructor, canEdit, freqs, touchMode }) {
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
              <button key={s.value} onClick={() => update({ status: s.value })} disabled={disabled} className="mono" style={{ fontSize: 11, padding: touchMode ? "9px 8px" : "6px 8px", borderRadius: 4, textAlign: "left", background: ac.status === s.value ? "rgba(7,18,30,0.95)" : "rgba(7,18,30,0.5)", border: `1px solid ${ac.status === s.value ? s.color : "#2d5980"}`, color: ac.status === s.value ? s.color : "#cbd5e1", fontWeight: ac.status === s.value ? 700 : 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}>{s.label}</button>
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
                <button key={f.value} onClick={() => update({ freq: f.value })} className="mono" style={{ fontSize: 10, padding: touchMode ? "6px 9px" : "3px 7px", borderRadius: 2, background: ac.freq === f.value ? "rgba(163,230,53,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${ac.freq === f.value ? "#65a30d" : "#2d5980"}`, color: ac.freq === f.value ? "#a3e635" : "#cbd5e1", cursor: "pointer", fontWeight: 600 }}>{f.label}</button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Quota (ft)">
          <div style={{ display: "flex", gap: 4 }}>
            <input type="number" value={ac.altitude} onChange={(e) => update({ altitude: Math.max(0, parseInt(e.target.value) || 0) })} disabled={disabled} step="500" className="mono" style={{ flex: 1, padding: "8px 10px", borderRadius: 4, background: "#02060c", border: "1px solid #2d5980", color: "#fbbf24", fontWeight: 700, fontSize: 15, letterSpacing: 1, textAlign: "center", opacity: disabled ? 0.5 : 1, minWidth: 0 }} />
            <button onClick={() => update({ altitude: ac.altitude + 500 })} disabled={disabled} className="mono" style={{ padding: touchMode ? "10px 14px" : "0 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980", color: "#cbd5e1", fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>+500</button>
            <button onClick={() => update({ altitude: Math.max(0, ac.altitude - 500) })} disabled={disabled} className="mono" style={{ padding: touchMode ? "10px 14px" : "0 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980", color: "#cbd5e1", fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>−500</button>
          </div>
        </Field>

        <Field label={touchMode ? "Prua (°)" : "Prua (°) — o trascina la maniglia sull'aereo"}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="number" value={ac.heading} onChange={(e) => { let v = parseInt(e.target.value) || 0; v = ((v % 360) + 360) % 360; update({ heading: v }); }} disabled={disabled} min="0" max="359" className="mono" style={{ flex: 1, padding: "8px 10px", borderRadius: 4, background: "#02060c", border: "1px solid #2d5980", color: "#c4b5fd", fontWeight: 700, fontSize: 15, letterSpacing: 1, textAlign: "center", opacity: disabled ? 0.5 : 1, minWidth: 0 }} />
            <button onClick={() => update({ heading: (ac.heading + 10) % 360 })} disabled={disabled} className="mono" style={{ padding: touchMode ? "10px 14px" : "0 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980", color: "#cbd5e1", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>+10°</button>
            <button onClick={() => update({ heading: ((ac.heading - 10) % 360 + 360) % 360 })} disabled={disabled} className="mono" style={{ padding: touchMode ? "10px 14px" : "0 10px", borderRadius: 4, background: "rgba(7,18,30,0.6)", border: "1px solid #2d5980", color: "#cbd5e1", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}>−10°</button>
          </div>
          {touchMode && !disabled && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, marginTop: 6 }}>
              {[
                { lbl: "N", deg: 0 }, { lbl: "E", deg: 90 }, { lbl: "S", deg: 180 }, { lbl: "W", deg: 270 },
              ].map((d) => (
                <button key={d.lbl} onClick={() => update({ heading: d.deg })} className="mono" style={{ padding: "8px 4px", borderRadius: 3, background: ac.heading === d.deg ? "rgba(196,181,253,0.15)" : "rgba(7,18,30,0.6)", border: `1px solid ${ac.heading === d.deg ? "#a78bfa" : "#2d5980"}`, color: ac.heading === d.deg ? "#c4b5fd" : "#cbd5e1", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{d.lbl}<span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 3 }}>{d.deg.toString().padStart(3, "0")}</span></button>
              ))}
            </div>
          )}
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
