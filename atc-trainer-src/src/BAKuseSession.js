import { useEffect, useState } from "react";
import {
  db, auth, ref, onValue, set, update, remove, onDisconnect,
  signInAnonymously, onAuthStateChanged,
} from "./firebase";

const SESSION_ID = "main";

export function useSession() {
  const [uid, setUid] = useState(null);
  const [aircraft, setAircraft] = useState([]);
  const [airport, setAirportLocal] = useState("LIBP");

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

  // Sottoscrizione airport (sincronizzato a tutti)
  useEffect(() => {
    if (!uid) return;
    const aRef = ref(db, `sessions/${SESSION_ID}/state/airport`);
    const unsub = onValue(aRef, (snap) => {
      setAirportLocal(snap.val() || "LIBP");
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

  return {
    uid, aircraft, airport,
    upsertAircraft, patchAircraft, deleteAircraft, setupDisconnect,
    setAirport, resetAllTraffic,
  };
}
