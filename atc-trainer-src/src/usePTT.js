// ============================================================
// usePTT.js — Push-To-Talk audio (WebRTC mesh P2P)
// AEROCLUB DEI MARSI · ATC Trainer
//
// Modello "unica stanza radio":
//   - tutti i partecipanti sono in un'unica conversazione audio
//   - tutti sentono tutti (la frequenza è solo un dato visivo gestito altrove)
//   - microfono MUTO di default; si abilita solo mentre si tiene premuto il PTT
//   - lock di trasmissione gestito da useSession (acquirePTT/releasePTT)
//
// Tecnologia: WebRTC mesh, signaling via Firebase Realtime DB, STUN pubblico Google.
// Nessun server audio, nessun TURN (in caso di NAT ostile → usare hotspot 4G).
//
// Convenzione anti-glare: il peer con uid "minore" (compare string) crea l'offer,
// l'altro risponde. Deterministico, niente collisioni di offerta.
// ============================================================
import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "./firebase";
import {
  ref, onValue, set, remove, onDisconnect,
  onChildAdded, onChildRemoved, push,
} from "firebase/database";

const SESSION_ID = "main";
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Limita la banda audio a ~24 kbps (suono "radio", consumo minimo)
function limitAudioBandwidth(sdp, kbps = 24) {
  // Inserisce b=AS dopo la riga m=audio
  return sdp.replace(/(m=audio .*\r\n)/, `$1b=AS:${kbps}\r\n`);
}

export function usePTT({ uid, enabled, displayName, color, isInstructor }) {
  const [voiceReady, setVoiceReady] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const localStreamRef = useRef(null);   // MediaStream del microfono
  const localTrackRef = useRef(null);    // la traccia audio (enabled = false di default)
  const peersRef = useRef(new Map());    // peerUid -> RTCPeerConnection
  const audioElsRef = useRef(new Map()); // peerUid -> <audio> element
  const unsubsRef = useRef([]);          // funzioni di cleanup dei listener firebase

  // ---- Acquisizione microfono (una volta sola, all'attivazione) ----
  useEffect(() => {
    if (!enabled || !uid) return;
    let cancelled = false;

    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        const track = stream.getAudioTracks()[0];
        track.enabled = false; // MUTO di default — si apre solo col PTT
        localTrackRef.current = track;
        setMicDenied(false);
        setVoiceReady(true);
      } catch (e) {
        console.warn("Microfono non disponibile:", e?.name || e);
        setMicDenied(true);
        setVoiceReady(true); // posso comunque ascoltare
      }
    }
    initMic();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        localTrackRef.current = null;
      }
    };
  }, [enabled, uid]);

  // ---- Crea una RTCPeerConnection verso un peer ----
  const createPeer = useCallback((peerUid, isOfferer) => {
    if (peersRef.current.has(peerUid)) return peersRef.current.get(peerUid);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(peerUid, pc);

    // Aggiungo la mia traccia (muta) così il canale è pronto a trasmettere
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }

    // Ricezione audio remoto → elemento <audio> nascosto in autoplay
    pc.ontrack = (ev) => {
      let el = audioElsRef.current.get(peerUid);
      if (!el) {
        el = document.createElement("audio");
        el.autoplay = true;
        el.playsInline = true;
        el.dataset.peer = peerUid;
        document.body.appendChild(el);
        audioElsRef.current.set(peerUid, el);
      }
      el.srcObject = ev.streams[0];
      // Su iOS l'autoplay può richiedere un play() esplicito
      el.play?.().catch(() => {});
    };

    // ICE candidates → li scrivo nel ramo signaling del destinatario
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        const candRef = push(ref(db, `sessions/${SESSION_ID}/signaling/${peerUid}/${uid}/candidates`));
        set(candRef, ev.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        // lascio che la pulizia avvenga via onChildRemoved dei peers
      }
    };

    // Se sono l'offerer, creo e invio l'offer
    if (isOfferer) {
      (async () => {
        try {
          const offer = await pc.createOffer();
          offer.sdp = limitAudioBandwidth(offer.sdp);
          await pc.setLocalDescription(offer);
          await set(ref(db, `sessions/${SESSION_ID}/signaling/${peerUid}/${uid}/offer`), {
            type: offer.type, sdp: offer.sdp,
          });
        } catch (e) { console.error("offer error", e); }
      })();
    }

    return pc;
  }, [uid]);

  // ---- Gestione signaling in ingresso (offer/answer/candidates rivolti a ME) ----
  const listenSignalingFrom = useCallback((fromUid) => {
    const base = `sessions/${SESSION_ID}/signaling/${uid}/${fromUid}`;
    const amOfferer = String(uid) < String(fromUid); // convenzione anti-glare

    const pc = createPeer(fromUid, amOfferer);

    // Offer in arrivo (se sono il responder)
    const offerRef = ref(db, `${base}/offer`);
    const u1 = onValue(offerRef, async (snap) => {
      const offer = snap.val();
      if (!offer || amOfferer) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        answer.sdp = limitAudioBandwidth(answer.sdp);
        await pc.setLocalDescription(answer);
        await set(ref(db, `sessions/${SESSION_ID}/signaling/${fromUid}/${uid}/answer`), {
          type: answer.type, sdp: answer.sdp,
        });
      } catch (e) { console.error("answer error", e); }
    });

    // Answer in arrivo (se sono l'offerer)
    const answerRef = ref(db, `${base}/answer`);
    const u2 = onValue(answerRef, async (snap) => {
      const answer = snap.val();
      if (!answer || !amOfferer) return;
      try {
        if (!pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (e) { console.error("setRemote(answer) error", e); }
    });

    // ICE candidates in arrivo
    const candRef = ref(db, `${base}/candidates`);
    const u3 = onChildAdded(candRef, async (snap) => {
      const cand = snap.val();
      if (!cand) return;
      try { await pc.addIceCandidate(new RTCIceCandidate(cand)); }
      catch (e) { /* candidate può arrivare prima della remote desc: ignorabile */ }
    });

    unsubsRef.current.push(u1, u2, u3);
  }, [uid, createPeer]);

  // ---- Setup mesh: annuncio la mia presenza e reagisco ai peer ----
  useEffect(() => {
    if (!enabled || !uid || !voiceReady) return;

    const myPeerRef = ref(db, `sessions/${SESSION_ID}/peers/${uid}`);
    set(myPeerRef, { joinedAt: Date.now(), name: displayName || "—" });
    onDisconnect(myPeerRef).remove();

    const peersListRef = ref(db, `sessions/${SESSION_ID}/peers`);

    // Nuovo peer entrato
    const addUnsub = onChildAdded(peersListRef, (snap) => {
      const peerUid = snap.key;
      if (peerUid === uid) return;
      listenSignalingFrom(peerUid);
    });

    // Peer uscito → pulizia connessione + audio + signaling
    const remUnsub = onChildRemoved(peersListRef, (snap) => {
      const peerUid = snap.key;
      if (peerUid === uid) return;
      const pc = peersRef.current.get(peerUid);
      if (pc) { try { pc.close(); } catch (e) {} peersRef.current.delete(peerUid); }
      const el = audioElsRef.current.get(peerUid);
      if (el) { try { el.srcObject = null; el.remove(); } catch (e) {} audioElsRef.current.delete(peerUid); }
      // pulisco i rami signaling tra me e lui
      remove(ref(db, `sessions/${SESSION_ID}/signaling/${uid}/${peerUid}`)).catch(() => {});
      remove(ref(db, `sessions/${SESSION_ID}/signaling/${peerUid}/${uid}`)).catch(() => {});
    });

    unsubsRef.current.push(addUnsub, remUnsub);

    return () => {
      // Cleanup completo all'uscita
      unsubsRef.current.forEach((fn) => { try { fn(); } catch (e) {} });
      unsubsRef.current = [];
      peersRef.current.forEach((pc) => { try { pc.close(); } catch (e) {} });
      peersRef.current.clear();
      audioElsRef.current.forEach((el) => { try { el.srcObject = null; el.remove(); } catch (e) {} });
      audioElsRef.current.clear();
      remove(myPeerRef).catch(() => {});
      remove(ref(db, `sessions/${SESSION_ID}/signaling/${uid}`)).catch(() => {});
    };
  }, [enabled, uid, voiceReady, displayName, listenSignalingFrom]);

  // ---- Controllo trasmissione (chiamato dal PTT) ----
  const startTransmit = useCallback(() => {
    if (localTrackRef.current) {
      localTrackRef.current.enabled = true;
      setIsTransmitting(true);
    }
  }, []);

  const stopTransmit = useCallback(() => {
    if (localTrackRef.current) {
      localTrackRef.current.enabled = false;
    }
    setIsTransmitting(false);
  }, []);

  return {
    voiceReady,
    micDenied,
    isTransmitting,
    startTransmit,
    stopTransmit,
  };
}
