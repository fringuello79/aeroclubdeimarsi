/* ============================================================
   AEROCLUB DEI MARSI - meteo-liah.js
   Widget condizioni indicative + Density Altitude per LIAH
   Fonte dati: Open-Meteo (CC BY 4.0, nessuna chiave API)
   NB: dati indicativi da modello meteo, NON osservazioni
       aeronautiche certificate. Vedi disclaimer in pagina.
   ============================================================ */

(function() {
    'use strict';

    // Coordinate ed elevazione aviosuperficie LIAH (Celano)
    const LIAH_LAT = 42.0510319041054;
    const LIAH_LNG = 13.55736715457585;
    const LIAH_ELEV_FT = 2200;

    // Conversione gradi -> rosa dei venti (italiano)
    function degToCompass(deg) {
        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
        return dirs[Math.round(deg / 22.5) % 16];
    }

    // Calcolo Density Altitude
    // pressureMsl = QNH equivalente (hPa), tempC = temperatura (°C)
    function computeDA(pressureMsl, tempC) {
        const elevationFt = LIAH_ELEV_FT;
        // Pressure Altitude: ogni hPa di scostamento da 1013.25 vale ~30 ft
        const PA = elevationFt + (1013.25 - pressureMsl) * 30;
        // Temperatura ISA attesa a quota campo
        const T_ISA = 15 - 1.98 * (elevationFt / 1000);
        // Density Altitude
        const DA = Math.round(PA + 120 * (tempC - T_ISA));
        return DA;
    }

    function daStatus(da) {
        // Soglie indicative per un campo a 2200 ft
        if (da >= 4500) return 'da-status-high';
        if (da >= 3500) return 'da-status-warn';
        return 'da-status-ok';
    }

    function setText(id, txt) {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    let meteoChart = null;

    async function loadMeteo() {
        const params = new URLSearchParams({
            latitude: LIAH_LAT.toFixed(4),
            longitude: LIAH_LNG.toFixed(4),
            current: 'temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code',
            hourly: 'temperature_2m,pressure_msl',
            daily: 'sunrise,sunset',
            timezone: 'Europe/Rome',
            past_days: '2',
            forecast_days: '1',
            wind_speed_unit: 'kn'
        });
        const url = 'https://api.open-meteo.com/v1/forecast?' + params.toString();

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();

            const cur = data.current;
            const temp = cur.temperature_2m;
            const rh = cur.relative_humidity_2m;
            const qnh = Math.round(cur.pressure_msl);
            const windKt = Math.round(cur.wind_speed_10m);
            const windDir = cur.wind_direction_10m;

            // Popola le celle
            setText('m-temp', temp.toFixed(1) + ' °C');
            setText('m-wind', windKt + ' kt ' + degToCompass(windDir));
            setText('m-qnh', qnh + ' hPa');
            setText('m-rh', Math.round(rh) + ' %');

            // Density Altitude
            const da = computeDA(cur.pressure_msl, temp);
            setText('m-da', da.toLocaleString('it-IT') + ' ft');
            const daCell = document.getElementById('da-cell');
            if (daCell) {
                daCell.classList.remove('da-status-ok', 'da-status-warn', 'da-status-high');
                daCell.classList.add(daStatus(da));
            }

            // Orario aggiornamento
            // Orario aggiornamento: uso l'ora REALE del momento (non solo cur.time,
            // che è arrotondato all'ora piena dal modello)
            const now = new Date();
            const dataOra = now.toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            setText('m-updated', 'Aggiornato ' + dataOra);

            // Titolo grafico con la data reale di oggi
            const oggiStr = now.toLocaleDateString('it-IT', {
                weekday: 'long', day: 'numeric', month: 'long'
            });
            const titleEl = document.getElementById('meteo-chart-title');
            if (titleEl) {
                const cap = oggiStr.charAt(0).toUpperCase() + oggiStr.slice(1);
                titleEl.textContent = 'Andamento QNH e Temperatura · ' + cap +
                    ' (agg. ' + now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ')';
            }

            // Grafico orario QNH + temperatura (solo se il canvas esiste in pagina)
            renderChart(data.hourly);

            // Barra-giorno / finestra VFR (solo se l'elemento esiste in pagina)
            if (data.daily && data.daily.sunrise && data.daily.sunset) {
                // Indice di "oggi" nella serie daily: con past_days=2 è il terzo elemento
                const idxOggi = data.daily.time ? data.daily.time.length - 1 : 2;
                const sunrise = new Date(data.daily.sunrise[idxOggi]);
                const sunset  = new Date(data.daily.sunset[idxOggi]);
                renderDaylight(sunrise, sunset);
            }

        } catch (err) {
            console.error('Errore meteo Open-Meteo:', err);
            const body = document.querySelector('.meteo-body');
            if (body) {
                const grid = body.querySelector('.meteo-grid');
                if (grid) grid.innerHTML =
                    '<p class="meteo-loading">Dati meteo momentaneamente non disponibili. ' +
                    'Riprova più tardi o consulta le fonti ufficiali qui sotto.</p>';
            }
            const upd = document.getElementById('m-updated');
            if (upd) upd.textContent = 'Dati non disponibili';
        }
    }

    // Stato effemeridi corrente (per il refresh dell'indicatore ORA al minuto)
    let _vfrData = null;

    // Disegna/aggiorna la barra-giorno con la finestra VFR.
    // VFR diurno Italia: da SR-30' a SS+30' (riserva di luce). Orari ufficiali
    // = effemeridi AIP; qui indicazione visiva.
    function renderDaylight(sunrise, sunset) {
        _vfrData = { sunrise, sunset };
        const wrap = document.getElementById('vfr-daybar');
        if (!wrap) return;

        const MIN = 60 * 1000;
        const vfrStart = new Date(sunrise.getTime() - 30 * MIN);
        const vfrEnd   = new Date(sunset.getTime()  + 30 * MIN);

        const pctOfDay = (d) => {
            const mins = d.getHours() * 60 + d.getMinutes();
            return (mins / 1440) * 100;
        };

        const srPct  = pctOfDay(sunrise);
        const ssPct  = pctOfDay(sunset);
        const vsPct  = pctOfDay(vfrStart);
        const vePct  = pctOfDay(vfrEnd);

        // Costruisco la barra (una sola volta) o aggiorno le parti dinamiche
        if (!wrap.dataset.built) {
            wrap.innerHTML = `
                <div class="daybar-track" id="daybar-track">
                    <div class="daybar-band daybar-vfr" id="daybar-vfr"></div>
                    <div class="daybar-marker daybar-sr" id="dm-sr"><span></span></div>
                    <div class="daybar-marker daybar-ss" id="dm-ss"><span></span></div>
                    <div class="daybar-now" id="daybar-now"><div class="daybar-now-dot"></div></div>
                </div>
                <div class="daybar-times" id="daybar-times"></div>
                <div class="daybar-status" id="daybar-status"></div>
            `;
            wrap.dataset.built = "1";
        }

        const fmt = (d) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        // Banda VFR (verde) da vfrStart a vfrEnd
        const vfrBand = document.getElementById('daybar-vfr');
        if (vfrBand) {
            vfrBand.style.left = vsPct + '%';
            vfrBand.style.width = (vePct - vsPct) + '%';
        }
        // Marker alba/tramonto
        const mSr = document.getElementById('dm-sr');
        const mSs = document.getElementById('dm-ss');
        if (mSr) mSr.style.left = srPct + '%';
        if (mSs) mSs.style.left = ssPct + '%';

        // Orari sotto la barra
        const times = document.getElementById('daybar-times');
        if (times) {
            times.innerHTML = `
                <div class="dt-item"><span class="dt-lbl">VFR da</span><span class="dt-val">${fmt(vfrStart)}</span></div>
                <div class="dt-item"><span class="dt-lbl">🌅 Alba</span><span class="dt-val">${fmt(sunrise)}</span></div>
                <div class="dt-item"><span class="dt-lbl">🌇 Tramonto</span><span class="dt-val">${fmt(sunset)}</span></div>
                <div class="dt-item"><span class="dt-lbl">VFR fino a</span><span class="dt-val">${fmt(vfrEnd)}</span></div>
            `;
        }

        updateDaylightNow();
    }

    // Aggiorna solo l'indicatore "ORA" e il badge di stato (chiamabile al minuto)
    function updateDaylightNow() {
        if (!_vfrData) return;
        const track = document.getElementById('daybar-track');
        const nowEl = document.getElementById('daybar-now');
        const statusEl = document.getElementById('daybar-status');
        if (!track || !nowEl) return;

        const MIN = 60 * 1000;
        const { sunrise, sunset } = _vfrData;
        const vfrStart = new Date(sunrise.getTime() - 30 * MIN);
        const vfrEnd   = new Date(sunset.getTime()  + 30 * MIN);
        const now = new Date();
        const nowPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
        nowEl.style.left = nowPct + '%';

        if (!statusEl) return;
        const inVfr = now >= vfrStart && now <= vfrEnd;
        if (inVfr) {
            const restaMin = Math.round((vfrEnd - now) / MIN);
            const h = Math.floor(restaMin / 60), m = restaMin % 60;
            statusEl.className = 'daybar-status vfr-open';
            statusEl.innerHTML = `✅ <strong>Finestra VFR aperta</strong> · restano ${h}h ${String(m).padStart(2,'0')}min di luce utile`;
        } else {
            // Quanto manca alla prossima apertura?
            let next = vfrStart;
            if (now > vfrEnd) {
                // domani: stima +1 giorno (indicativa)
                next = new Date(vfrStart.getTime() + 24 * 60 * MIN);
            }
            const mancaMin = Math.max(0, Math.round((next - now) / MIN));
            const h = Math.floor(mancaMin / 60), m = mancaMin % 60;
            statusEl.className = 'daybar-status vfr-closed';
            statusEl.innerHTML = `🌙 <strong>Fuori finestra VFR</strong> · riapre tra circa ${h}h ${String(m).padStart(2,'0')}min`;
        }
    }

    function renderChart(hourly) {
        const canvas = document.getElementById('meteoChartLiah');
        if (!canvas || typeof Chart === 'undefined') return;

        const giorniBrevi = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

        // Costruisco le etichette dalla timeline completa (2 giorni passati + oggi).
        // Ogni punto è un'ora; mostro il giorno solo a mezzanotte e ogni 6 ore l'ora.
        const times = hourly.time.map(t => new Date(t));
        const labels = times.map((d) => {
            const h = d.getHours();
            if (h === 0) return giorniBrevi[d.getDay()] + ' 00';
            return String(h).padStart(2, '0');
        });
        const temps = hourly.temperature_2m;
        const press = hourly.pressure_msl;

        // Indice del punto più vicino all'ora attuale (per la linea "ora")
        const now = new Date();
        let nowIdx = 0, best = Infinity;
        times.forEach((d, i) => {
            const diff = Math.abs(d - now);
            if (diff < best) { best = diff; nowIdx = i; }
        });

        if (meteoChart) { meteoChart.destroy(); meteoChart = null; }

        // Plugin per la linea verticale "ORA" e i separatori di mezzanotte
        const nowLinePlugin = {
            id: 'nowLine',
            afterDraw(chart) {
                const { ctx, chartArea, scales } = chart;
                const xPos = scales.x.getPixelForValue(nowIdx);
                // Linea ORA
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(xPos, chartArea.top);
                ctx.lineTo(xPos, chartArea.bottom);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#c9a960';
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                // Etichetta ORA
                ctx.setLineDash([]);
                ctx.fillStyle = '#c9a960';
                ctx.font = "700 10px Inter, sans-serif";
                ctx.textAlign = 'center';
                const lblX = Math.min(Math.max(xPos, chartArea.left + 18), chartArea.right - 18);
                ctx.fillText('ORA', lblX, chartArea.top + 11);
                ctx.restore();
            }
        };

        const ctx = canvas.getContext('2d');
        meteoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperatura (°C)',
                        data: temps,
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.08)',
                        yAxisID: 'yTemp',
                        tension: 0.35,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        fill: true
                    },
                    {
                        label: 'QNH (hPa)',
                        data: press,
                        borderColor: '#1e3a8a',
                        backgroundColor: 'rgba(30, 58, 138, 0.05)',
                        yAxisID: 'yQnh',
                        tension: 0.35,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 16 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleFont: { family: 'Outfit' },
                        bodyFont: { family: 'Inter' },
                        padding: 10,
                        callbacks: {
                            title: (items) => {
                                const d = times[items[0].dataIndex];
                                return d.toLocaleString('it-IT', {
                                    weekday: 'short', day: '2-digit', month: '2-digit',
                                    hour: '2-digit', minute: '2-digit'
                                });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: 'Inter', size: 10 },
                            maxTicksLimit: 14,
                            autoSkip: true,
                            color: (c) => {
                                const lbl = c.tick && c.tick.label;
                                return (lbl && lbl.length > 2) ? '#c9a960' : '#64748b';
                            }
                        }
                    },
                    yTemp: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: '°C', font: { family: 'Inter' }, color: '#dc2626' },
                        ticks: { font: { family: 'Inter', size: 10 }, color: '#dc2626' },
                        grid: { color: 'rgba(15,23,42,0.04)' }
                    },
                    yQnh: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'hPa', font: { family: 'Inter' }, color: '#1e3a8a' },
                        ticks: { font: { family: 'Inter', size: 10 }, color: '#1e3a8a' },
                        grid: { drawOnChartArea: false }
                    }
                }
            },
            plugins: [nowLinePlugin]
        });
    }

    // Avvia quando il DOM e Chart.js sono pronti
    function init() {
        if (!document.getElementById('meteo-widget-liah') &&
            !document.getElementById('meteo-home')) return;
        loadMeteo();
        // Aggiorna i dati meteo ogni 10 minuti
        setInterval(loadMeteo, 10 * 60 * 1000);
        // Muovi l'indicatore ORA della barra-giorno ogni minuto (senza richiamare l'API)
        setInterval(updateDaylightNow, 60 * 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
