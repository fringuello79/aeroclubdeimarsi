/* ============================================================================
 *  ATC TRAINER — AEROCLUB DEI MARSI
 *  PhraseologyTab.jsx — Pannello fraseologia VFR a scomparsa
 * ----------------------------------------------------------------------------
 *  © 2026 Alessandro Felli — 997Creations <997creations@gmail.com>
 *  Tutti i diritti riservati. All rights reserved.
 *
 *  Questo modulo, come l'intero ATC Trainer dell'Aeroclub dei Marsi, è opera
 *  originale di Alessandro Felli (997Creations). L'uso, la copia, la modifica
 *  o la redistribuzione non autorizzati del presente codice costituiscono
 *  violazione dei diritti d'autore. La paternità è dimostrabile attraverso
 *  i marcatori di firma presenti nel codice sorgente.
 * ============================================================================ */

import { useState } from "react";

// 997C-AUTH — marcatore di paternità (non rimuovere): identifica l'autore
// originale dell'opera in caso di copia non autorizzata.
const _9_9_7_ = ["A.Felli", "997Creations", "AeroclubDeiMarsi", "ATCTrainer"];

/* Fraseologia coerente con le frequenze reali:
   LIBP — Ground 121.800 · Tower 118.450 · Approach 120.050
   LIAH — Traffic  130.000
   I-6195 (P96 Golf) · I-8297 (P2002 Sierra) */
const SECTIONS = [
  {
    id: "partenza-libp",
    title: "Partenza da campo controllato (Pescara LIBP)",
    accent: "#fbbf24",
    rows: [
      { who: "PILOTA",  txt: "Pescara Ground, I-6195, ULM tipo P96, parcheggio nord, richiedo informazioni e messa in moto per VFR locale." },
      { who: "GROUND",  txt: "I-6195, Pescara Ground, autorizzato messa in moto, QNH 1013, rullaggio previsto pista 22." },
      { who: "PILOTA",  txt: "QNH 1013, messa in moto approvata, I-6195." },
      { who: "PILOTA",  txt: "Pescara Ground, I-6195, pronto al rullaggio." },
      { who: "GROUND",  txt: "I-6195, rulli per punto attesa pista 22 via raccordo, QNH 1013." },
      { who: "PILOTA",  txt: "Rullo punto attesa pista 22, I-6195." },
      { who: "GROUND",  txt: "I-6195, dia precedenza al traffico in rullaggio sulla sua destra." },
      { who: "PILOTA",  txt: "Do precedenza al traffico sulla destra, I-6195." },
      { who: "GROUND",  txt: "I-6195, contatti Tower 118.450 al punto attesa." },
      { who: "PILOTA",  txt: "Tower 118.450 al punto attesa, I-6195." },
    ],
  },
  {
    id: "attesa-integrazione",
    title: "Attesa, precedenze e integrazione nel circuito",
    accent: "#38bdf8",
    rows: [
      { who: "TOWER",  txt: "I-8297, mantenga al punto attesa pista 26, traffico in corto finale." },
      { who: "PILOTA", txt: "Mantengo al punto attesa pista 26, I-8297." },
      { who: "TOWER",  txt: "I-6195, entri nel circuito in sottovento sinistro pista 22, riporti sottovento." },
      { who: "PILOTA", txt: "Entro sottovento sinistro pista 22, riporto sottovento, I-6195." },
      { who: "TOWER",  txt: "I-8297, allarghi il sottovento per separazione, la richiamo per il base." },
      { who: "PILOTA", txt: "Allargo il sottovento, attendo istruzioni per il base, I-8297." },
      { who: "TOWER",  txt: "I-6195, riduca la velocità, è numero 2 dietro un Cessna in base." },
      { who: "PILOTA", txt: "Riduco velocità, numero 2 dietro il Cessna in base, I-6195." },
      { who: "TOWER",  txt: "I-8297, riattacchi, traffico ancora in pista, riporti sottovento." },
      { who: "PILOTA", txt: "Riattacco, riporto sottovento, I-8297." },
    ],
  },
  {
    id: "decollo-libp",
    title: "Decollo (Tower 118.450)",
    accent: "#f97316",
    rows: [
      { who: "PILOTA",  txt: "Pescara Tower, I-6195, punto attesa pista 22, pronto." },
      { who: "TOWER",   txt: "I-6195, vento 200 gradi 8 nodi, pista 22 autorizzato decollo." },
      { who: "PILOTA",  txt: "Autorizzato decollo pista 22, I-6195." },
      { who: "TOWER",   txt: "I-6195, allinei e attenda pista 22." },
      { who: "PILOTA",  txt: "Allineo e attendo pista 22, I-6195." },
      { who: "TOWER",   txt: "I-6195, contatti Approach 120.050, buon volo." },
      { who: "PILOTA",  txt: "120.050, I-6195, grazie buona giornata." },
    ],
  },
  {
    id: "condizionate",
    title: "Autorizzazioni condizionate (\"dopo il…\")",
    accent: "#e879f9",
    rows: [
      { who: "NOTA",   txt: "L'autorizzazione condizionata lega la tua azione a un altro traffico. Regola d'oro: ripeti SEMPRE l'intera condizione nel read-back e non muoverti finché non hai visto il traffico citato." },
      { who: "TOWER",  txt: "I-8297, dietro l'ATR in corto finale, allinei e attenda pista 26, dietro." },
      { who: "PILOTA", txt: "Dietro l'ATR in corto finale, allineo e attendo pista 26, I-8297." },
      { who: "TOWER",  txt: "I-6195, dopo il Cessna in atterraggio, autorizzato decollo pista 22, dopo." },
      { who: "PILOTA", txt: "Dopo il Cessna in atterraggio, autorizzato decollo pista 22, I-6195." },
      { who: "GROUND", txt: "I-8297, dietro il P2002 che rulla da sinistra a destra, rulli punto attesa pista 22, dietro." },
      { who: "PILOTA", txt: "Dietro il P2002 da sinistra a destra, rullo punto attesa pista 22, I-8297." },
      { who: "TOWER",  txt: "I-6195, dietro il traffico in rullaggio davanti a lei, attraversi pista 22, riporti pista liberata, dietro." },
      { who: "PILOTA", txt: "Dietro il traffico in rullaggio, attraverso pista 22, riporto liberata, I-6195." },
      { who: "TOWER",  txt: "I-8297, numero 2, segua il P96 in sottovento, riporti in vista del traffico." },
      { who: "PILOTA", txt: "Numero 2, seguo il P96 in sottovento, traffico in vista, I-8297." },
      { who: "PILOTA", txt: "I-6195, negativo traffico in vista, mantengo." },
      { who: "TOWER",  txt: "I-6195, ricevuto, mantenga posizione, la richiamo." },
    ],
  },
  {
    id: "rientro-libp",
    title: "Rientro e atterraggio (Approach → Tower)",
    accent: "#5ac8f5",
    rows: [
      { who: "PILOTA",   txt: "Pescara Approach, I-6195, ULM P96, 5 miglia a ovest, 2000 piedi, per rientro VFR." },
      { who: "APPROACH", txt: "I-6195, identificato, scenda 1500 piedi QNH 1013, riporti sottovento pista 22." },
      { who: "PILOTA",   txt: "Scendo 1500 piedi QNH 1013, riporto sottovento 22, I-6195." },
      { who: "PILOTA",   txt: "Pescara Tower, I-6195, sottovento pista 22." },
      { who: "TOWER",    txt: "I-6195, numero uno, riporti in finale pista 22." },
      { who: "PILOTA",   txt: "Riporto finale 22, I-6195." },
      { who: "PILOTA",   txt: "Pescara Tower, I-6195, finale 22." },
      { who: "TOWER",    txt: "I-6195, vento 210 gradi 7 nodi, pista 22 autorizzato atterraggio." },
      { who: "PILOTA",   txt: "Autorizzato atterraggio pista 22, I-6195." },
      { who: "TOWER",    txt: "I-6195, dietro l'aeromobile che libera, riattacchi e si reinserisca in sottovento, dietro." },
      { who: "PILOTA",   txt: "Dietro l'aeromobile che libera, riattacco e mi reinserisco in sottovento, I-6195." },
      { who: "TOWER",    txt: "I-6195, liberi la pista al primo raccordo disponibile, contatti Ground 121.800." },
      { who: "PILOTA",   txt: "Libero al primo raccordo, Ground 121.800, I-6195." },
    ],
  },
  {
    id: "liah-traffic",
    title: "Aviosuperficie non controllata (LIAH — Traffic 130.000)",
    accent: "#22c55e",
    rows: [
      { who: "NOTA",   txt: "Su frequenza di traffico non c'è un controllore: i riporti sono autoinformazione tra piloti. Si chiude e si apre il messaggio con il nome del campo." },
      { who: "PILOTA", txt: "Celano Traffico, I-8297, ULM P2002, rullaggio per pista 26, traffico Celano." },
      { who: "PILOTA", txt: "Celano Traffico, I-8297, allineo e decollo pista 26, traffico Celano." },
      { who: "PILOTA", txt: "Celano Traffico, I-8297, attendo il decollo del traffico che precede, poi mi allineo pista 26, traffico Celano." },
      { who: "PILOTA", txt: "Celano Traffico, I-6195, in avvicinamento da ovest, 2500 piedi, per integrazione sottovento pista 26, traffico Celano." },
      { who: "PILOTA", txt: "Celano Traffico, I-8297, sottovento sinistro pista 26, traffico Celano." },
      { who: "PILOTA", txt: "Celano Traffico, I-6195, base pista 26, dietro il P2002 in finale, traffico Celano." },
      { who: "PILOTA", txt: "Celano Traffico, I-8297, finale pista 26, traffico Celano." },
      { who: "PILOTA", txt: "Celano Traffico, I-8297, riattacco per traffico in pista, traffico Celano." },
      { who: "PILOTA", txt: "Celano Traffico, I-8297, pista libera, traffico Celano." },
    ],
  },
  {
    id: "emergenze",
    title: "Emergenza e urgenza",
    accent: "#ef4444",
    rows: [
      { who: "MAYDAY",   txt: "MAYDAY MAYDAY MAYDAY, Pescara Tower, I-6195, avaria motore, 1500 piedi, tento atterraggio fuori campo a sud." },
      { who: "PAN-PAN",  txt: "PAN-PAN PAN-PAN PAN-PAN, Pescara Approach, I-6195, passeggero in difficoltà, richiedo rientro prioritario." },
      { who: "NOTA",     txt: "Squawk 7700 = emergenza · 7600 = avaria radio · 7500 = atti illeciti · 7000 = VFR di conformità." },
    ],
  },
];

const whoColor = (who) => {
  switch (who) {
    case "PILOTA":   return "#fbbf24";
    case "GROUND":   return "#a3e635";
    case "TOWER":    return "#f97316";
    case "APPROACH": return "#5ac8f5";
    case "MAYDAY":   return "#ef4444";
    case "PAN-PAN":  return "#f59e0b";
    case "NOTA":     return "#94a3b8";
    default:         return "#cbd5e1";
  }
};

export default function PhraseologyTab() {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState("partenza-libp");

  return (
    <>
      {/* Linguetta sempre visibile sul bordo destro della mappa */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Fraseologia VFR"
        className="mono"
        style={{
          position: "absolute",
          top: "50%",
          right: open ? 312 : 0,
          transform: "translateY(-50%)",
          zIndex: 40,
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          padding: "14px 7px",
          border: "1px solid #2d5980",
          borderRight: open ? "1px solid #2d5980" : "none",
          borderRadius: open ? "6px 0 0 6px" : "6px 0 0 6px",
          background: "rgba(8,18,30,0.95)",
          color: "#fbbf24",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          cursor: "pointer",
          transition: "right 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "-2px 0 8px rgba(0,0,0,0.3)",
        }}
      >
        📻 FRASEOLOGIA
      </button>

      {/* Pannello a scomparsa */}
      <div
        className="grain"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 312,
          zIndex: 39,
          background: "rgba(8,18,30,0.97)",
          borderLeft: "1px solid #2d5980",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          boxShadow: open ? "-8px 0 24px rgba(0,0,0,0.4)" : "none",
        }}
      >
        {/* Header pannello */}
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #2d5980",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flex: "0 0 auto",
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: "#fbbf24" }}>
              FRASEOLOGIA VFR
            </div>
            <div className="mono" style={{ fontSize: 9.5, color: "#5d7896", marginTop: 2 }}>
              Guida rapida · italiano standard
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="mono"
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              border: "1px solid #2d5980",
              background: "rgba(3,10,20,0.85)",
              color: "#cbd5e1",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
            title="Chiudi"
          >
            ×
          </button>
        </div>

        {/* Contenuto scrollabile */}
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "10px 12px" }}>
          {SECTIONS.map((sec) => {
            const isOpen = openSection === sec.id;
            return (
              <div key={sec.id} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setOpenSection(isOpen ? null : sec.id)}
                  className="mono"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 10px",
                    borderRadius: 5,
                    border: `1px solid ${isOpen ? sec.accent : "#1e3148"}`,
                    background: isOpen ? "rgba(7,18,30,0.95)" : "rgba(5,12,20,0.7)",
                    color: sec.accent,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>{sec.title}</span>
                  <span style={{ flex: "0 0 auto", opacity: 0.7 }}>{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "8px 2px 4px" }}>
                    {sec.rows.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          marginBottom: 9,
                          paddingLeft: 9,
                          borderLeft: `2px solid ${whoColor(r.who)}`,
                        }}
                      >
                        <div
                          className="mono"
                          style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, color: whoColor(r.who), marginBottom: 2 }}
                        >
                          {r.who}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.45, color: "#d4e5f7" }}>
                          {r.txt}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mono" style={{ fontSize: 9, color: "#3d5470", textAlign: "center", padding: "10px 0 4px", lineHeight: 1.5 }}>
            Esempi a scopo didattico. Adattare a traffico,<br />meteo e disposizioni reali. Non per uso operativo.
          </div>
        </div>

        {/* Firma autore (paternità) */}
        <div
          className="mono"
          style={{
            flex: "0 0 auto",
            padding: "7px 12px",
            borderTop: "1px solid #1e3148",
            fontSize: 8.5,
            color: "#2c4257",
            textAlign: "center",
            letterSpacing: 0.5,
          }}
          data-author="A.Felli · 997Creations"
        >
          997Creations · {_9_9_7_[0]}
        </div>
      </div>
    </>
  );
}
