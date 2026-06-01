/* ============================================================
   AEROCLUB DEI MARSI - numeri-random.js
   Numeri "ironici" della home: estratti a caso da un serbatoio
   ampio e fatti scorrere/ruotare in continuazione.
   ============================================================ */

(function() {
    'use strict';

    // Serbatoio dei numeri: { val, suffix, label }
    // Mix di dati reali e numeri simpatici/inattesi.
    const POOL = [
        { val: 2,      label: "hangar per riparare gli aerei (e qualche bici)" },
        { val: 800,    label: "metri di pista in asfalto" },
        { val: 2200,   label: "piedi di altitudine sul livello del mare" },
        { val: 6195,   label: "le marche del nostro P96 Golf" },
        { val: 8297,   label: "le marche del nostro P2002 Sierra" },
        { val: 33,     label: "ore di teoria nel corso VDS Basico" },
        { val: 16,     label: "ore di volo per l'attestato VDS" },
        { val: 180,    suffix: " km/h", label: "di crociera del P96 Golf" },
        { val: 200,    suffix: " km/h", label: "di crociera del P2002 Sierra" },
        { val: 100,    suffix: " HP",   label: "per ciascun motore Rotax 912" },
        { val: 42.05,  suffix: "° N",   label: "la nostra latitudine, più o meno" },
        { val: 13.56,  suffix: "° E",   label: "la nostra longitudine, idem" },
        { val: 123.5,  suffix: " MHz",  label: "la frequenza Traffico di Celano" },
        { val: 7000,   label: "lo squawk VFR di conformità" },
        { val: 1013,   suffix: " hPa",  label: "la pressione standard ISA" },
        { val: 2,      label: "i Tecnam che custodiamo come gioielli" },
        { val: 5,      suffix: " ore",  label: "di autonomia del Sierra (più della vescica)" },
        { val: 360,    suffix: "°",     label: "i gradi di cielo che ci girano intorno" },
        { val: 26,     label: "la pista quando atterri da est (08 al contrario)" },
        { val: 1,      label: "sola, grande passione" },
        { val: 0,      label: "scuse valide per non venirci a trovare" },
        { val: 15,     suffix: " L/h",  label: "di consumo del Golf: quasi un'utilitaria" },
        { val: 30,     suffix: " min",  label: "di luce VFR regalata dopo il tramonto" },
        { val: 9,      label: "le materie d'esame del VDS Basico" },
        { val: 3,      label: "i corsi: Basico, Avanzato, Radiofonia" },
    ];

    // Formatta il valore (gestisce decimali all'italiana)
    function fmt(val) {
        if (Number.isInteger(val)) return val.toLocaleString('it-IT');
        return val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Anima un contatore da 0 al target (durata breve)
    function animateValue(el, target, suffix) {
        const dur = 900;
        const start = performance.now();
        const isDec = !Number.isInteger(target);
        function step(now) {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            const cur = target * eased;
            el.textContent = (isDec ? cur.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.floor(cur).toLocaleString('it-IT')) + (suffix || '');
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = fmt(target) + (suffix || '');
        }
        requestAnimationFrame(step);
    }

    // Mescola un array (Fisher-Yates)
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    const SLOTS = 6;          // quanti box mostrare
    const ROTATE_MS = 3200;   // ogni quanto cambia un box

    function init() {
        const grid = document.getElementById('numeri-grid');
        if (!grid) return;

        // Costruisco 6 box vuoti
        grid.innerHTML = '';
        const boxes = [];
        for (let i = 0; i < SLOTS; i++) {
            const box = document.createElement('div');
            box.className = 'numero-box';
            box.innerHTML = '<div class="numero-valore">0</div><div class="numero-label"></div>';
            grid.appendChild(box);
            boxes.push(box);
        }

        // Stato: quali indici del POOL sono attualmente mostrati
        let deck = shuffle(POOL);
        let cursor = 0;
        const current = [];

        function nextItem() {
            if (cursor >= deck.length) { deck = shuffle(POOL); cursor = 0; }
            return deck[cursor++];
        }

        // Riempi i box iniziali (evitando duplicati nello stesso momento)
        boxes.forEach((box) => {
            const item = nextItem();
            current.push(item);
            fillBox(box, item, false);
        });

        function fillBox(box, item, animate) {
            const valEl = box.querySelector('.numero-valore');
            const lblEl = box.querySelector('.numero-label');
            lblEl.textContent = item.label;
            if (animate) animateValue(valEl, item.val, item.suffix);
            else valEl.textContent = fmt(item.val) + (item.suffix || '');
        }

        // Anima i primi all'ingresso
        boxes.forEach((box, i) => {
            const valEl = box.querySelector('.numero-valore');
            valEl.textContent = '0';
            setTimeout(() => animateValue(valEl, current[i].val, current[i].suffix), 200 + i * 120);
        });

        // Rotazione continua: ogni ROTATE_MS cambio UN box a rotazione
        let rot = 0;
        setInterval(() => {
            const idx = rot % SLOTS;
            const box = boxes[idx];
            // scelgo un nuovo item non già presente
            let item, guard = 0;
            do { item = nextItem(); guard++; }
            while (current.some(c => c.label === item.label) && guard < 30);
            current[idx] = item;

            // transizione: fade out, cambio, fade in
            box.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            box.style.opacity = '0';
            box.style.transform = 'translateY(8px)';
            setTimeout(() => {
                fillBox(box, item, true);
                box.style.opacity = '1';
                box.style.transform = 'translateY(0)';
            }, 360);

            rot++;
        }, ROTATE_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
