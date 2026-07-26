/* ============================================================
   AEROCLUB DEI MARSI - interactions.js v1.0
   Effetti raffinati: fade-in scroll, contatori, lightbox, header
   Zero dipendenze esterne. Vanilla JS.
   ============================================================ */

(function() {
    'use strict';

    // ============ Fonts: precarica Google Fonts ============
    function preloadFonts() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
    }

    // ============ Header sticky: aggiunge classe al scroll ============
    function initStickyHeader() {
        const header = document.querySelector('header');
        if (!header) return;

        let lastY = 0;
        let ticking = false;

        function update() {
            const y = window.scrollY;
            if (y > 20) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            lastY = y;
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }

    // ============ Reveal animations: fade-in al scroll ============
    function initRevealAnimations() {
        // Auto-aggiungi .reveal a card, h3, h4 se non già presenti
        const targets = document.querySelectorAll(
            'main > h3, main > h4, .card, .numeri-section, .info-box, .gallery-strip img'
        );
        targets.forEach((el, i) => {
            if (!el.classList.contains('reveal') && !el.closest('.hero')) {
                el.classList.add('reveal');
            }
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    // ============ Contatori animati ============
    function animateCounter(el, target, duration = 1800) {
        const start = 0;
        const startTime = performance.now();
        const isDecimal = String(target).includes('.');
        const decimals = isDecimal ? String(target).split('.')[1].length : 0;
        const finalValue = parseFloat(target);

        // Determina se è un formato speciale (es. "08/26")
        const isFraction = String(target).includes('/');
        if (isFraction) {
            el.textContent = target;
            return;
        }

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing: easeOutQuart
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = start + (finalValue - start) * eased;

            if (isDecimal) {
                el.textContent = current.toFixed(decimals);
            } else {
                el.textContent = Math.floor(current).toLocaleString('it-IT');
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = isDecimal ? finalValue.toFixed(decimals) : Math.floor(finalValue).toLocaleString('it-IT');
            }
        }

        requestAnimationFrame(step);
    }

    function initCounters() {
        const counters = document.querySelectorAll('.numero-valore[data-target]');
        if (counters.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target.dataset.target;
                    animateCounter(entry.target, target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(c => {
            c.textContent = '0';
            observer.observe(c);
        });
    }

    // ============ Lightbox per le foto ============
    function initLightbox() {
        // Crea il DOM del lightbox una volta
        const lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.innerHTML = `
            <button class="lightbox-close" aria-label="Chiudi">&times;</button>
            <img alt="" />
        `;
        document.body.appendChild(lb);

        const lbImg = lb.querySelector('img');
        const lbClose = lb.querySelector('.lightbox-close');

        function open(src, alt) {
            lbImg.src = src;
            lbImg.alt = alt || '';
            lb.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            lb.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => { lbImg.src = ''; }, 300);
        }

        lb.addEventListener('click', (e) => {
            if (e.target === lb || e.target === lbClose) close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lb.classList.contains('active')) close();
        });

        // Aggiungi listener a tutte le foto con classe .lightbox-trigger oppure dentro .gallery-strip
        function attachTriggers() {
            const triggers = document.querySelectorAll(
                '.gallery-strip img, .aircraft-photo, .lightbox-trigger'
            );
            triggers.forEach(img => {
                if (img.dataset.lbAttached) return;
                img.dataset.lbAttached = '1';
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', () => open(img.src, img.alt));
            });
        }

        attachTriggers();
        // Re-attach quando arriva nuovo contenuto (es. galleria dinamica)
        const obs = new MutationObserver(attachTriggers);
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // ============ Smooth scroll per link interni ============
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href === '#' || href.length < 2) return;
                const target = document.querySelector(href);
                if (!target) return;
                e.preventDefault();
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            });
        });
    }

    // ============ Back to top ============
    function initBackToTop() {
        const btn = document.createElement('button');
        btn.className = 'back-to-top';
        btn.setAttribute('aria-label', 'Torna su');
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>';
        document.body.appendChild(btn);

        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        let ticking = false;
        function update() {
            if (window.scrollY > 500) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
            ticking = false;
        }
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }

    // ============ Init ============
    function init() {
        preloadFonts();
        initStickyHeader();
        initRevealAnimations();
        initCounters();
        initLightbox();
        initSmoothScroll();
        initBackToTop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
