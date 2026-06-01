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
            timezone: 'Europe/Rome',
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
            const now = new Date(cur.time);
            setText('m-updated', 'Aggiornato alle ' +
                now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));

            // Grafico orario QNH + temperatura
            renderChart(data.hourly);

        } catch (err) {
            console.error('Errore meteo Open-Meteo:', err);
            const body = document.querySelector('.meteo-body');
            if (body) {
                const grid = body.querySelector('.meteo-grid');
                if (grid) grid.innerHTML =
                    '<p class="meteo-loading">Dati meteo momentaneamente non disponibili. ' +
                    'Riprova più tardi o consulta le fonti ufficiali qui sotto.</p>';
            }
        }
    }

    function renderChart(hourly) {
        const canvas = document.getElementById('meteoChartLiah');
        if (!canvas || typeof Chart === 'undefined') return;

        // Estrai le 24 ore del giorno
        const labels = hourly.time.map(t => t.split('T')[1]);
        const temps = hourly.temperature_2m;
        const press = hourly.pressure_msl;

        // Evidenzia l'ora corrente
        const nowHour = new Date().getHours();

        if (meteoChart) { meteoChart.destroy(); meteoChart = null; }

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
                            title: (items) => 'Ore ' + items[0].label
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: 'Inter', size: 10 },
                            maxTicksLimit: 12,
                            color: '#64748b'
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
            }
        });
    }

    // Avvia quando il DOM e Chart.js sono pronti
    function init() {
        if (!document.getElementById('meteo-widget-liah')) return;
        loadMeteo();
        // Aggiorna ogni 15 minuti se la pagina resta aperta
        setInterval(loadMeteo, 15 * 60 * 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
