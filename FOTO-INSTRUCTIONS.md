# Guida pratica · Preparazione delle foto per il sito

Ciao Alessandro, questa è la guida step-by-step per preparare le foto del nuovo sito. Tempo richiesto: **circa 15-20 minuti**.

---

## Step 1 — Comprimere le foto

Le foto iPhone pesano 3-5 MB ciascuna. Se le metti così come sono sul sito, ogni pagina ci mette **5+ secondi a caricare** su mobile. Le riduciamo del 70-80% **senza perdita visibile di qualità**.

### Metodo più semplice (consigliato)

1. Vai su **https://tinypng.com** (è gratis, niente registrazione)
2. Trascina **fino a 20 foto alla volta** nella zona di drop
3. Aspetta che processi (1-2 minuti per tutte)
4. Clicca **"Download all"** in basso a destra → scarichi un file ZIP
5. Estrai il ZIP in una cartella di lavoro

Risultato: foto da 3 MB diventano 600-900 KB. Identiche all'occhio.

### Metodo alternativo (Mac)

Apri ogni foto in Anteprima → File → Esporta → Formato JPEG, Qualità "Media-Alta". Salva sostituendo l'originale.

### Metodo alternativo (Windows)

Scarica **Caesium Image Compressor** (gratuito): caesium.app

---

## Step 2 — Ridimensionare le hero (solo le hero)

Le foto per le hero section sono visualizzate molto grandi. Le foto iPhone sono 4032×3024 pixel — troppo grandi per il web. Riducile a **max 2000 pixel di larghezza**, sempre con tinypng o con Anteprima/Strumenti/Regola dimensione.

---

## Step 3 — Rinominare le foto

Ora rinomina le foto compresse usando questa tabella. **I nomi devono essere esattamente questi**, il codice del sito li cerca con questi nomi:

| Foto originale | Nuovo nome | Pagina di utilizzo |
|---|---|---|
| IMG_4748.jpg | `hero-home.jpg` | Hero della Home |
| IMG_4773.jpg | `hero-chi-siamo.jpg` | Hero Chi Siamo |
| IMG_1622.jpg | `hero-scuola-volo.jpg` | Hero Scuola di Volo |
| IMG_5879.jpg | `hero-eventi.jpg` | Hero Eventi |
| IMG_3128.jpg | `hero-area-soci.jpg` | Hero Area Soci |
| IMG_7870.jpg | `hero-contatti.jpg` | Hero Contatti |
| IMG_6856.jpg | `hero-velivoli.jpg` | Hero Velivoli |
| IMG_0579.jpg | `velivolo-p2002.jpg` | Foto P2002 (interna) |
| IMG_5521.jpg | `velivolo-p96.jpg` | Foto P96 (interna) |
| IMG_1492.jpg | `galleria-1.jpg` | Galleria foto |
| IMG_4418.jpg | `galleria-2.jpg` | Galleria foto |
| IMG_4754.jpg | `galleria-3.jpg` | Galleria foto |
| IMG_1151.jpg | `galleria-4.jpg` | Galleria foto |
| IMG_1211.jpg | `galleria-5.jpg` | Galleria foto |
| IMG_5548.jpg | `galleria-6.jpg` | Galleria foto |
| IMG_1511.jpg | `galleria-7.jpg` | Galleria foto |
| IMG_6860.jpg | `galleria-8.jpg` | Galleria foto |

---

## Step 4 — Copiare nella repository

Sposta tutte le foto rinominate nella cartella **radice** della repository del sito (dove sta già `logo.jpg`, `styles.css`, `index.html`).

---

## Riepilogo

Quando hai finito dovresti avere nella cartella del sito:

- 7 file `hero-*.jpg` (uno per pagina)
- 2 file `velivolo-*.jpg` (P96 e P2002)
- 8 file `galleria-*.jpg`

**Totale**: 17 nuove foto + le esistenti (`logo.jpg`, `P96senzasfondo.png`, `P2002senzasfondo.png`, `Locandinadonneinvolo26.png`, `cloudyliah.png`).

Quando sei pronto, fammi sapere e procediamo allo Step 2 (rifacimento delle altre 7 pagine).
