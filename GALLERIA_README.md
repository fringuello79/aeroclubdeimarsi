# Guida per Aggiornare la Galleria

## Come aggiornare gli album della galleria con le foto da imgbb

### 1. Accedere agli album su imgbb
Visita: https://aeroclubdeimarsi.imgbb.com/albums

### 2. Ottenere gli URL delle immagini
Per ogni album:
- Apri l'album su imgbb
- Per ogni foto, copia l'URL diretto dell'immagine (solitamente in formato `https://i.ibb.co/xxxxx/nomefile.jpg`)

### 3. Aggiornare il file galleria.html
Apri il file `galleria.html` e trova la sezione con la configurazione degli album (circa riga 196).

Aggiorna l'array `albums` sostituendo i valori vuoti di `photos` con gli URL reali:

```javascript
const albums = [
    {
        title: "I Nostri Velivoli",
        url: "https://aeroclubdeimarsi.imgbb.com/album/velivoli",
        photos: [
            "https://i.ibb.co/xxxxx/foto1.jpg",
            "https://i.ibb.co/yyyyy/foto2.jpg",
            "https://i.ibb.co/zzzzz/foto3.jpg"
        ],
        count: 3,  // Aggiorna con il numero reale di foto
        icon: "✈️"
    },
    // ... altri album
];
```

### 4. Aggiungere nuovi album
Per aggiungere un nuovo album, aggiungi un nuovo oggetto all'array:

```javascript
{
    title: "Nome del Nuovo Album",
    url: "https://aeroclubdeimarsi.imgbb.com/album/nuovo-album",
    photos: [
        "https://i.ibb.co/abc123/foto1.jpg",
        "https://i.ibb.co/def456/foto2.jpg"
    ],
    count: 2,
    icon: "🎯"  // Scegli un'emoji appropriata
}
```

## Caratteristiche della Galleria

- **Slideshow automatico**: Le foto cambiano automaticamente ogni 3 secondi
- **Opacità 90%**: Le foto vengono mostrate con una leggera trasparenza come richiesto
- **Effetti ombra**: I box degli album hanno ombre professionali coerenti con il resto del sito
- **Click per aprire**: Cliccando su un album si apre l'album completo su imgbb in una nuova scheda
- **Responsive**: La galleria si adatta automaticamente a desktop, tablet e mobile
- **Gestione errori**: Se un'immagine non si carica, viene mostrato l'icona dell'album

## Icone disponibili per gli album
Alcune emoji suggerite per gli album:
- ✈️ Velivoli
- 🛫 Aviosuperficie
- 📅 Eventi
- 🏔️ Paesaggi
- 📸 Foto generiche
- 🎓 Corsi/Scuola
- 👥 Persone/Team
- 🏆 Premi/Successi
