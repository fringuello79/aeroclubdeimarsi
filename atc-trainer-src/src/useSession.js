import { useEffect, useState } from "react";
import {
  db, auth, ref, onValue, set, update, remove, onDisconnect,
  signInAnonymously, onAuthStateChanged,
} from "./firebase";
import { runTransaction } from "firebase/database";

const SESSION_ID = "main";

const DEFAULT_WIND = {
  LIBP: { dir: 40,  speed: 0 },  // calma da pista 04
  LIAH: { dir: 80,  speed: 0 },  // calma da pista 08
};

export function useSession() {
  const [uid, setUid] = useState(null);
  const [aircraft, setAircraft] = useState([]);
  const [airport, setAirportLocal] = useState("WORLD");
  const [wind, setWindLocal] = useState(DEFAULT_WIND);
  const [pttState, setPttState] = useState({ activeTransmitter: null, activeName: null, activeColor: null, isInstructor: false });

  // Login anonimo
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return unsub;
  }, []);

  // Sottoscrizione aircraft
  useEffect(() => {
    if (!uid) return;
    const acRef = ref(db, `sessions/${SESSION_ID}/aircraft`);
    const unsub = onValue(acRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setAircraft(list);
    });
    return unsub;
  }, [uid]);

  // Sottoscrizione airport (vista predefinita)
  useEffect(() => {
    if (!uid) return;
    const aRef = ref(db, `sessions/${SESSION_ID}/state/airport`);
    const unsub = onValue(aRef, (snap) => {
      setAirportLocal(snap.val() || "WORLD");
    });
    return unsub;
  }, [uid]);

  // Sottoscrizione vento
  useEffect(() => {
    if (!uid) return;
    const wRef = ref(db, `sessions/${SESSION_ID}/state/wind`);
    const unsub = onValue(wRef, (snap) => {
      const data = snap.val();
      if (data) {
        setWindLocal({
          LIBP: { dir: Number(data.LIBP?.dir ?? DEFAULT_WIND.LIBP.dir), speed: Number(data.LIBP?.speed ?? 0) },
          LIAH: { dir: Number(data.LIAH?.dir ?? DEFAULT_WIND.LIAH.dir), speed: Number(data.LIAH?.speed ?? 0) },
        });
      } else {
        setWindLocal(DEFAULT_WIND);
      }
    });
    return unsub;
  }, [uid]);

  // Sottoscrizione stato PTT (chi sta trasmettendo nella sessione)
  useEffect(() => {
    if (!uid) return;
    const pRef = ref(db, `sessions/${SESSION_ID}/ptt`);
    const unsub = onValue(pRef, (snap) => {
      const data = snap.val();
      setPttState({
        activeTransmitter: data?.activeTransmitter ?? null,
        activeName: data?.activeName ?? null,
        activeColor: data?.activeColor ?? null,
        isInstructor: !!data?.isInstructor,
      });
    });
    return unsub;
  }, [uid]);

  const upsertAircraft = (id, data) =>
    set(ref(db, `sessions/${SESSION_ID}/aircraft/${id}`), data);

  const patchAircraft = (id, patch) =>
    update(ref(db, `sessions/${SESSION_ID}/aircraft/${id}`), patch);

  const deleteAircraft = (id) =>
    remove(ref(db, `sessions/${SESSION_ID}/aircraft/${id}`));

  const setupDisconnect = (aircraftId) => {
    onDisconnect(ref(db, `sessions/${SESSION_ID}/aircraft/${aircraftId}`)).remove();
  };

  const setAirport = (id) =>
    set(ref(db, `sessions/${SESSION_ID}/state/airport`), id);

  const resetAllTraffic = () =>
    set(ref(db, `sessions/${SESSION_ID}/aircraft`), null);

  // Aggiorna il vento di un aeroporto (solo istruttore)
  const setWind = (airportId, dir, speed) => {
    const d = Math.max(0, Math.min(359, Math.round(Number(dir) || 0)));
    const s = Math.max(0, Math.min(99, Math.round(Number(speed) || 0)));
    return update(ref(db, `sessions/${SESSION_ID}/state/wind/${airportId}`), { dir: d, speed: s });
  };

  // ============================================================
  // PTT LOCK — acquisizione atomica della linea radio
  // Ritorna true se ho ottenuto la linea, false se occupata (e non sono istruttore)
  // L'istruttore fa OVERRIDE: prende la linea anche se occupata.
  // ============================================================
  const acquirePTT = async (name, color, isInstr) => {
    const pttRef = ref(db, `sessions/${SESSION_ID}/ptt`);
    let acquired = false;
    try {
      await runTransaction(pttRef, (current) => {
        const active = current?.activeTransmitter ?? null;
        // Linea libera → la prendo
        if (active === null || active === undefined) {
          acquired = true;
          return { activeTransmitter: uid, activeName: name, activeColor: color, isInstructor: !!isInstr, startedAt: Date.now() };
        }
        // Sono già io → mantengo (re-press difensivo)
        if (active === uid) {
          acquired = true;
          return current;
        }
        // Occupata da altri: se sono istruttore faccio override, altrimenti rifiuto
        if (isInstr) {
          acquired = true;
          return { activeTransmitter: uid, activeName: name, activeColor: color, isInstructor: true, startedAt: Date.now() };
        }
        acquired = false;
        return; // abort: nessuna modifica
      });
    } catch (e) {
      console.error("acquirePTT error", e);
      acquired = false;
    }
    // Se ho preso la linea, predispongo il rilascio automatico in caso di disconnessione
    if (acquired) {
      try {
        await onDisconnect(pttRef).set({ activeTransmitter: null, activeName: null, activeColor: null, isInstructor: false });
      } catch (e) { /* non bloccante */ }
    }
    return acquired;
  };

  // Rilascio la linea SOLO se l'attivo sono io (non rubo il rilascio a un altro)
  const releasePTT = async () => {
    const pttRef = ref(db, `sessions/${SESSION_ID}/ptt`);
    try {
      await runTransaction(pttRef, (current) => {
        const active = current?.activeTransmitter ?? null;
        if (active === uid) {
          return { activeTransmitter: null, activeName: null, activeColor: null, isInstructor: false };
        }
        return current; // non sono io l'attivo: non tocco nulla
      });
      try { await onDisconnect(pttRef).cancel(); } catch (e) { /* ignore */ }
    } catch (e) {
      console.error("releasePTT error", e);
    }
  };

  return {
    uid, aircraft, airport, wind, pttState,
    upsertAircraft, patchAircraft, deleteAircraft, setupDisconnect,
    setAirport, resetAllTraffic, setWind,
    acquirePTT, releasePTT,
  };
}
