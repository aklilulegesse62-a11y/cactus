/**
 * CACTUS ETHIOPIA — LUXURY CINEMATIC MOTION ENGINE
 * Reference: Boldcraft Studio motion language
 * High-performance 60fps/120fps centralized RAF scroll & parallax system
 */

(function initCactusMotionSystem() {
  'use strict';

  if (typeof window === 'undefined') return;

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth <= 768;

  // Add motion-ready class to html root
  document.documentElement.classList.add('motion-ready');

  // Cache of tracked elements for zero-thrashing RAF loop
  let trackedGridCards = [];
  let trackedHeaders = [];
  let trackedAmbient = [];
  let trackedParallaxFrames = [];
  let trackedGhostNumbers = [];
  let trackedMonoliths = [];
  let trackedDriftElements = [];
  let trackedForegroundLayers = [];
  let heroBannerInner = null;
  let videoContainer = null;
  let vh = window.innerHeight;
  let vw = window.innerWidth;
  let ticking = false;

  function getGridColumnCount(gridEl) {
    if (!gridEl) return 1;
    const style = window.getComputedStyle(gridEl);
    const gridTemplateColumns = style.getPropertyValue('grid-template-columns');
    if (gridTemplateColumns && gridTemplateColumns !== 'none') {
      const cols = gridTemplateColumns.trim().split(/\s+/).length;
      if (cols > 0) return cols;
    }
    const w = gridEl.offsetWidth;
    if (w >= 1024) return 3;
    if (w >= 680) return 2;
    return 1;
  }

  /* ==========================================================================
     1. GEOMETRY CACHING & OBSERVERS
     ========================================================================== */
  function cacheGeometry() {
    vh = window.innerHeight;
    vw = window.innerWidth;
    const currentScrollY = window.scrollY;

    // 1. VISIBLE LAYOUT PARALLAX: Multi-Column Stagger & Grid Cards
    trackedGridCards = [];
    const gridSelectors = [
      '.projects-grid',
      '.featured-grid',
      '.capabilities-grid',
      '.capabilities-color-grid',
      '.caps-grid',
      '.cases-grid-list',
      '.family-grid',
      '.family-cards-grid',
      '.partners-grid',
      '.why-cards',
      '.why-grid',
      '.client-grid',
      '.clients-grid',
      '.all-cases-grid',
      '.discipline-work-grid',
      '.discipline-pillars',
      '.metrics-section',
      '.metrics-grid',
      '.office-grid',
      '.story-grid-4',
      '.story-heritage-grid',
      '.work-grid',
      '.section-catalog',
      '.section-featured'
    ];

    document.querySelectorAll(gridSelectors.join(', ')).forEach(grid => {
      const cards = Array.from(grid.querySelectorAll(
        '.project-card, .featured-card, .work-card, .partner-card, .why-card, .client-tile, .family-card, .discipline-card, .pillar-card, .metric-tile, .card-motion-reveal, .capability-card, .cap-card, .case-nav-tile, .metric-card, .office-details-card, .work-tile'
      ));
      if (!cards.length) return;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const media = card.querySelector('img, video');

        // Perfect level horizontal alignment across all columns in row
        card.style.setProperty('--layout-parallax-y', '0px');
        card.style.setProperty('--card-enter-x', '0px');

        trackedGridCards.push({
          element: card,
          media: media,
          top: rect.top + currentScrollY,
          height: rect.height
        });
      });
    });

    // 2. Section Headers & Eyebrows (Floating Lead)
    const headerSelectors = [
      '.section-header',
      '.page-hero-title',
      '.work-hero-title',
      '.services-hero-title',
      '.contact-hero-title',
      '.partners-hero-title',
      '.discipline-hero-title',
      '.section-heading',
      '.case-hook',
      '.contact-intro',
      '.hero-container'
    ];
    trackedHeaders = Array.from(document.querySelectorAll(headerSelectors.join(', '))).map(el => {
      const rect = el.getBoundingClientRect();
      return {
        element: el,
        top: rect.top + currentScrollY,
        height: rect.height
      };
    });

    // 3. Ambient Elements (Facets, Monoliths, Ghost Numbers, Ambient Haze)
    const ambientSelectors = [
      '.section-ghost-num',
      '.brand-monolith[data-parallax]',
      '.hero-facet',
      '.hero-ambient-layer',
      '.ambient-haze'
    ];
    trackedAmbient = Array.from(document.querySelectorAll(ambientSelectors.join(', '))).map(el => {
      const rect = (el.parentElement || el).getBoundingClientRect();
      const speed = parseFloat(el.getAttribute('data-parallax-speed') || (isMobile ? '0.08' : '0.18'));
      const baseTransform = el.getAttribute('data-base-transform') || '';
      return {
        element: el,
        top: rect.top + currentScrollY,
        height: rect.height,
        speed: speed,
        baseTransform: baseTransform
      };
    });

    // Layer 2: Explicit Parallax Frames (Image/Video Windows with Internal Counter-Depth)
    trackedParallaxFrames = Array.from(document.querySelectorAll('.parallax-frame')).map(frame => {
      const rect = frame.getBoundingClientRect();
      const img = frame.querySelector('img, video');
      const speed = parseFloat(frame.getAttribute('data-parallax-speed') || (isMobile ? '0.06' : '0.12'));
      return {
        element: frame,
        media: img,
        top: rect.top + currentScrollY,
        height: rect.height,
        speed: speed
      };
    });

    // Layer 1: Background Ghost Numbers (Slow, atmospheric depth)
    trackedGhostNumbers = Array.from(document.querySelectorAll('.section-ghost-num')).map(num => {
      const rect = num.getBoundingClientRect();
      const speed = parseFloat(num.getAttribute('data-parallax-speed') || (isMobile ? '0.05' : '0.18'));
      return {
        element: num,
        top: rect.top + currentScrollY,
        height: rect.height,
        speed: speed
      };
    });

    // Layer 1: Atmospheric Brand Monoliths (Edge-bleeding SVG marks)
    trackedMonoliths = Array.from(document.querySelectorAll('.brand-monolith[data-parallax]')).map(m => {
      const rect = (m.parentElement || m).getBoundingClientRect();
      const speed = parseFloat(m.getAttribute('data-parallax-speed') || (isMobile ? '0.04' : '0.08'));
      const baseTransform = m.getAttribute('data-base-transform') || '';
      return {
        element: m,
        top: rect.top + currentScrollY,
        height: rect.height,
        speed: speed,
        baseTransform: baseTransform
      };
    });

    // Layer 4: Large Display Typography & Accents (Directional X/Y Drift)
    trackedDriftElements = Array.from(document.querySelectorAll('[data-scroll-drift], [data-parallax-layer="4"]')).map(el => {
      const rect = el.getBoundingClientRect();
      const speedX = parseFloat(el.getAttribute('data-drift-x') || '0');
      const speedY = parseFloat(el.getAttribute('data-drift-y') || (el.getAttribute('data-parallax-layer') === '4' ? '-18' : '0'));
      return {
        element: el,
        top: rect.top + currentScrollY,
        height: rect.height,
        speedX: isMobile ? speedX * 0.35 : speedX,
        speedY: isMobile ? speedY * 0.35 : speedY
      };
    });

    // Layer 5: Foreground Anchors & Badges (Tactile Forward Lead)
    trackedForegroundLayers = Array.from(document.querySelectorAll('[data-parallax-layer="5"]')).map(el => {
      const rect = el.getBoundingClientRect();
      return {
        element: el,
        top: rect.top + currentScrollY,
        height: rect.height
      };
    });

    heroBannerInner = document.querySelector('.hero-banner-inner');
    videoContainer = document.getElementById('videoContainer') || document.querySelector('.video-container');
  }

  /* ==========================================================================
     2. CENTRALIZED 60FPS/120FPS RAF TICK
     ========================================================================== */
  function onScrollTick() {
    if (isReducedMotion) return;

    const scrollY = window.scrollY;

    // HERO MOMENT 1: Hero banner dissolution & Showreel video emergence
    if (heroBannerInner) {
      if (scrollY < vh * 0.95) {
        const heroProgress = Math.min(scrollY / (vh * 0.60), 1);
        const heroY = heroProgress * -42;
        const heroOpacity = Math.max(1 - heroProgress * 0.75, 0.25);
        heroBannerInner.style.transform = `translate3d(0, ${heroY.toFixed(1)}px, 0)`;
        heroBannerInner.style.opacity = heroOpacity.toFixed(2);
      }
    }

    if (videoContainer) {
      const vidRectTop = videoContainer.offsetTop;
      const vidDist = scrollY - (vidRectTop - vh * 0.72);
      if (vidDist > -350 && vidDist < 650) {
        const vidNorm = Math.min(Math.max((vidDist + 350) / 650, 0), 1);
        const scaleVal = 0.96 + vidNorm * 0.05; // 0.96 -> 1.01 aperture opening
        const liftVal = (1 - vidNorm) * 24;      // 24px -> 0px gentle settle
        videoContainer.style.transform = `scale(${scaleVal.toFixed(3)}) translate3d(0, ${liftVal.toFixed(1)}px, 0)`;
      }
    }

    // 1. VISIBLE LAYOUT PARALLAX: Multi-Column Stagger & Inner Image Counter-Pan
    for (let i = 0; i < trackedGridCards.length; i++) {
      const item = trackedGridCards[i];
      const progress = (scrollY + vh - item.top) / (vh + item.height);

      if (progress >= -0.25 && progress <= 1.25) {
        const delta = (progress - 0.5) * 2; // -1.0 to +1.0

        // Keep card frames 100% level and aligned in the grid
        item.element.style.setProperty('--layout-parallax-y', '0px');

        if (item.media) {
          const mediaY = delta * (isMobile ? -14 : -28);
          item.element.style.setProperty('--media-parallax-y', `${mediaY.toFixed(1)}px`);
        }
      }
    }

    // 2. SECTION HEADERS: Forward Floating Parallax Lead
    for (let i = 0; i < trackedHeaders.length; i++) {
      const item = trackedHeaders[i];
      const progress = (scrollY + vh - item.top) / (vh + item.height);

      if (progress >= -0.25 && progress <= 1.25) {
        const delta = (progress - 0.5) * 2;
        const headerY = delta * (isMobile ? -12 : -28);
        item.element.style.setProperty('--header-parallax-y', `${headerY.toFixed(1)}px`);
      }
    }

    // 3. AMBIENT FACETS, MONOLITHS & GHOST NUMBERS: Deep Atmospheric Float
    for (let i = 0; i < trackedAmbient.length; i++) {
      const item = trackedAmbient[i];
      const progress = (scrollY + vh - item.top) / (vh + item.height);

      if (progress >= -0.25 && progress <= 1.25) {
        const delta = (progress - 0.5) * 2;
        const ambY = delta * (item.speed * 260);
        item.element.style.setProperty('--ambient-parallax-y', `${ambY.toFixed(1)}px`);
      }
    }

    // Explicit Parallax Frames (Counter-Parallax in overflow: hidden)
    for (let i = 0; i < trackedParallaxFrames.length; i++) {
      const item = trackedParallaxFrames[i];
      if (!item.media) continue;

      const progress = (scrollY + vh - item.top) / (vh + item.height);

      if (progress >= -0.15 && progress <= 1.15) {
        const delta = (progress - 0.5) * -1;
        const yOffset = delta * (item.speed * 440);
        item.media.style.transform = `scale(1.15) translate3d(0, ${yOffset.toFixed(1)}px, 0)`;
      }
    }

    // Ghost Numbers
    for (let i = 0; i < trackedGhostNumbers.length; i++) {
      const item = trackedGhostNumbers[i];
      const progress = (scrollY + vh - item.top) / (vh + item.height);

      if (progress >= -0.15 && progress <= 1.15) {
        const delta = (progress - 0.5) * -1;
        const yOffset = delta * (item.speed * 500);
        item.element.style.transform = `translate3d(0, ${yOffset.toFixed(1)}px, 0)`;
      }
    }

    // Brand Monoliths
    for (let i = 0; i < trackedMonoliths.length; i++) {
      const item = trackedMonoliths[i];
      const progress = (scrollY + vh - item.top) / (vh + item.height);

      if (progress >= -0.15 && progress <= 1.15) {
        const delta = (progress - 0.5) * -1;
        const yOffset = delta * (item.speed * 420);
        item.element.style.transform = `${item.baseTransform} translate3d(0, ${yOffset.toFixed(1)}px, 0)`;
      }
    }

    // Display Typography & Accents Drift
    for (let i = 0; i < trackedDriftElements.length; i++) {
      const item = trackedDriftElements[i];
      const progress = (scrollY + vh - item.top) / (vh + item.height);

      if (progress >= -0.15 && progress <= 1.15) {
        const delta = (progress - 0.5);
        const xOffset = delta * item.speedX;
        const yOffset = delta * item.speedY;
        item.element.style.transform = `translate3d(${xOffset.toFixed(1)}px, ${yOffset.toFixed(1)}px, 0)`;
      }
    }

    // Foreground Anchors & Badges
    for (let i = 0; i < trackedForegroundLayers.length; i++) {
      const item = trackedForegroundLayers[i];
      const progress = (scrollY + vh - item.top) / (vh + item.height);

      if (progress >= -0.15 && progress <= 1.15) {
        const delta = (progress - 0.5);
        const yOffset = delta * (isMobile ? -10 : -22);
        item.element.style.transform = `translate3d(0, ${yOffset.toFixed(1)}px, 0)`;
      }
    }

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      window.requestAnimationFrame(onScrollTick);
      ticking = true;
    }
  }

  /* ==========================================================================
     3. UNIVERSAL EDITORIAL TYPOGRAPHY MOTION ENGINE
     ========================================================================== */
  function setupUniversalTypographyMotion() {
    if (isReducedMotion) {
      document.querySelectorAll(
        '.editorial-reveal-line, .editorial-reveal-inline, .flow-reveal, .text-reveal-title, .text-reveal-eyebrow, .text-reveal-body'
      ).forEach(el => {
        el.classList.add('is-revealed', 'is-in-view');
      });
      return;
    }

    // Auto-discover and classify major titles & headings across ALL pages
    const autoTitleSelectors = [
      'h1:not(.no-motion):not(.editorial-reveal-target):not(.text-reveal-title)',
      'h2:not(.no-motion):not(.editorial-reveal-target):not(.text-reveal-title):not(.site-footer__heading)',
      'h3:not(.no-motion):not(.editorial-reveal-target):not(.text-reveal-title):not(.site-footer__heading)',
      '.hero-heading:not(.text-reveal-title)',
      '.hero-title:not(.text-reveal-title)',
      '.work-hero-title:not(.text-reveal-title)',
      '.page-hero-title:not(.text-reveal-title)',
      '.discipline-hero-title:not(.text-reveal-title)',
      '.discipline-title:not(.text-reveal-title)',
      '.section-heading:not(.text-reveal-title)',
      '.section-title:not(.text-reveal-title)',
      '.work-section-title:not(.text-reveal-title)',
      '.case-title:not(.text-reveal-title)',
      '.form-title:not(.text-reveal-title)',
      '.contact-hero h1:not(.text-reveal-title)',
      '.partners-hero-title:not(.text-reveal-title)',
      '.card-title:not(.text-reveal-title)'
    ];
    document.querySelectorAll(autoTitleSelectors.join(', ')).forEach(el => {
      if (el.closest('.slide')) return;
      if (!el.querySelector('.editorial-reveal-line, .editorial-reveal-inline')) {
        el.classList.add('text-reveal-title');
      }
    });

    // Auto-discover and classify eyebrows, badges, and category tags across ALL pages
    const autoEyebrowSelectors = [
      '.section-number:not(.text-reveal-eyebrow)',
      '.eyebrow:not(.text-reveal-eyebrow)',
      '.cap-badge:not(.text-reveal-eyebrow)',
      '.people-eyebrow:not(.text-reveal-eyebrow)',
      '.why-card-num:not(.text-reveal-eyebrow)',
      '.service-row-num:not(.text-reveal-eyebrow)',
      '.service-row-tags:not(.text-reveal-eyebrow)',
      '.stat-label:not(.text-reveal-eyebrow)',
      '.site-footer__heading:not(.text-reveal-eyebrow)',
      '.site-footer__tagline-meta:not(.text-reveal-eyebrow)',
      '.site-footer__copyright:not(.text-reveal-eyebrow)',
      '.play-tag:not(.text-reveal-eyebrow)',
      '.work-filter-btn:not(.text-reveal-eyebrow)',
      '.work-card-category:not(.text-reveal-eyebrow)',
      '.work-card-client:not(.text-reveal-eyebrow)',
      '.work-card__tag:not(.text-reveal-eyebrow)',
      '.partner-num:not(.text-reveal-eyebrow)',
      '.partner-meta:not(.text-reveal-eyebrow)',
      '.partner-role:not(.text-reveal-eyebrow)',
      '.award-pill-note:not(.text-reveal-eyebrow)',
      '.case-eyebrow:not(.text-reveal-eyebrow)',
      '.tag-chip:not(.text-reveal-eyebrow)',
      '.metric-label:not(.text-reveal-eyebrow)',
      '.tile-client:not(.text-reveal-eyebrow)',
      '.card-cta:not(.text-reveal-eyebrow)'
    ];
    document.querySelectorAll(autoEyebrowSelectors.join(', ')).forEach(el => {
      if (el.closest('.slide')) return;
      el.classList.add('text-reveal-eyebrow');
    });

    // Auto-discover and classify narrative body copy, leads, and quotes across ALL pages
    const autoBodySelectors = [
      'h4:not(.no-motion):not(.editorial-reveal-target):not(.text-reveal-body)',
      '.story-editorial-lead:not(.text-reveal-body):not(.editorial-reveal-target)',
      '.people-body p:not(.text-reveal-body)',
      '.philosophy-sub:not(.text-reveal-body)',
      '.why-title:not(.text-reveal-body)',
      '.why-desc:not(.text-reveal-body)',
      '.service-row-title:not(.text-reveal-body)',
      '.service-row-desc p:not(.text-reveal-body)',
      '.services-statement-quote:not(.text-reveal-body)',
      '.clients-subtitle:not(.text-reveal-body)',
      '.site-footer__positioning:not(.text-reveal-body)',
      '.site-footer__contact-line:not(.text-reveal-body)',
      '.site-footer__contact-link:not(.text-reveal-body)',
      '.site-footer__nav-link:not(.text-reveal-body)',
      '.work-hero-sub:not(.text-reveal-body)',
      '.work-lead:not(.text-reveal-body)',
      '.work-card-title:not(.text-reveal-body)',
      '.work-card-summary:not(.text-reveal-body)',
      '.work-card__title:not(.text-reveal-body)',
      '.work-card__desc:not(.text-reveal-body)',
      '.partner-name:not(.text-reveal-body)',
      '.partner-quote:not(.text-reveal-body)',
      '.partner-desc:not(.text-reveal-body)',
      '.partner-stat-num:not(.text-reveal-body)',
      '.partner-stat-label:not(.text-reveal-body)',
      '.page-hero-sub:not(.text-reveal-body)',
      '.discipline-lead:not(.text-reveal-body)',
      '.discipline-hero-desc:not(.text-reveal-body)',
      '.pillar-title:not(.text-reveal-body)',
      '.pillar-desc:not(.text-reveal-body)',
      '.craft-quote:not(.text-reveal-body)',
      '.case-hook:not(.text-reveal-body)',
      '.case-breakdown-box h3:not(.text-reveal-body)',
      '.case-breakdown-box p:not(.text-reveal-body)',
      '.quote-block:not(.text-reveal-body)',
      '.tile-title:not(.text-reveal-body)',
      '.tile-desc:not(.text-reveal-body)',
      '.contact-intro:not(.text-reveal-body)',
      '.office-headline:not(.text-reveal-body)',
      '.office-location:not(.text-reveal-body)',
      '.office-details p:not(.text-reveal-body)',
      '.faq-question:not(.text-reveal-body)',
      '.faq-answer:not(.text-reveal-body)',
      '.section-desc:not(.text-reveal-body)',
      'p.lead:not(.text-reveal-body)',
      'p.subtext:not(.text-reveal-body)'
    ];
    document.querySelectorAll(autoBodySelectors.join(', ')).forEach(el => {
      if (el.closest('.slide')) return;
      if (!el.querySelector('.editorial-reveal-line, .editorial-reveal-inline')) {
        el.classList.add('text-reveal-body');
      }
    });

    // Auto-prepare any .editorial-reveal-target that hasn't been manually masked
    document.querySelectorAll('.editorial-reveal-target').forEach(el => {
      if (el.querySelector('.editorial-reveal-line, .editorial-reveal-inline')) return;
      const html = el.innerHTML.trim();
      if (html.includes('<br>') || html.includes('<br/>') || html.includes('<br />')) {
        const parts = html.split(/<br\s*\/?>/i);
        el.innerHTML = parts.map(part => `<span class="editorial-mask"><span class="editorial-reveal-line">${part.trim()}</span></span>`).join('');
      } else {
        el.innerHTML = `<span class="editorial-mask"><span class="editorial-reveal-line">${html}</span></span>`;
      }
    });

    // --------------------------------------------------------------------------
    // 3b. CONTINUOUS BIDIRECTIONAL SECTION MOTION ORCHESTRATOR
    // Cursor hover: moving cursor to a section animates it IN, leaving animates it OUT.
    // Viewport scroll: scrolling sections into view/under cursor animates IN, leaving animates OUT.
    // --------------------------------------------------------------------------

    function getDistinctSections() {
      const candidates = Array.from(document.querySelectorAll(
        'main > section, main > div, body > section, section, footer.site-footer, footer, .hero-banner, .page-hero, .contact-hero, .case-hero, .discipline-hero, .work-hero, .services-hero, .partners-hero'
      ));

      // Filter out internal non-section elements
      const valid = candidates.filter(sec => {
        if (sec.closest('.slide')) return false; // slide motion handles mainSlider on index.html
        if (sec.closest('.navsheet')) return false;
        if (sec.closest('.video-modal')) return false;
        if (sec.closest('.lightbox-modal')) return false;
        if (sec.closest('.preloader')) return false;
        if (sec.closest('.cursor')) return false;

        // Keep only top-level ancestor if nested
        const isNested = candidates.some(other => other !== sec && other.contains(sec));
        if (isNested) return false;

        // Must have some content or reasonable height
        return sec.offsetHeight > 30 || sec.querySelectorAll('.editorial-reveal-line, .text-reveal-title, .text-reveal-eyebrow, .text-reveal-body, .featured-card, .project-card, .card-motion-reveal, .editorial-reveal-target').length > 0;
      });

      return Array.from(new Set(valid));
    }

    const distinctSections = getDistinctSections();

    function animateSectionIn(sec) {
      if (!sec) return;
      if (sec.dataset.motionActive === 'in') return;
      sec.dataset.motionActive = 'in';

      // Clear any pending timeouts for this section
      if (sec._motionTimeouts) {
        sec._motionTimeouts.forEach(clearTimeout);
      }
      sec._motionTimeouts = [];

      const targets = Array.from(sec.querySelectorAll(
        '.editorial-reveal-line, .editorial-reveal-inline, .text-reveal-eyebrow, .text-reveal-title, .text-reveal-body, .flow-reveal, .featured-card, .project-card, .work-card, .partner-card, .card-motion-reveal, .editorial-reveal-target'
      ));

      if (sec.matches('.flow-reveal')) {
        targets.unshift(sec);
      }

      // Ensure all cards enter straight and stay level
      const cards = targets.filter(el =>
        el.classList.contains('featured-card') ||
        el.classList.contains('project-card') ||
        el.classList.contains('card-motion-reveal')
      );
      cards.forEach((card) => {
        card.style.setProperty('--card-enter-x', '0px');
        card.style.setProperty('--layout-parallax-y', '0px');
      });

      // Stagger elements in with luxury cinematic pacing
      targets.forEach((el, idx) => {
        let elDelay = 50 + Math.min(idx * 50, 480);
        if (el.classList.contains('text-reveal-eyebrow')) {
          elDelay = 30 + Math.min(idx * 30, 160);
        } else if (el.classList.contains('text-reveal-title') || el.classList.contains('editorial-reveal-line') || el.classList.contains('editorial-reveal-inline')) {
          elDelay = 70 + Math.min(idx * 60, 360);
        } else if (el.classList.contains('text-reveal-body')) {
          elDelay = 120 + Math.min(idx * 50, 420);
        } else if (el.classList.contains('featured-card') || el.classList.contains('project-card') || el.classList.contains('card-motion-reveal')) {
          elDelay = 140 + Math.min(idx * 60, 460);
        }

        const tid = setTimeout(() => {
          el.classList.add('is-revealed');
          if (el.classList.contains('flow-reveal')) {
            el.classList.add('is-in-view');
          }
        }, elDelay);

        sec._motionTimeouts.push(tid);
      });
    }

    function animateSectionOut(sec) {
      // User explicitly requested:
      // "i don't like the out animation when the cursor move the text and cards despering fix it just lets use the in part"
      // Elements stay permanently visible once animated in. Never hide or animate out.
      return;
    }

    let activeSection = null;

    function transitionToSection(newSec) {
      if (!newSec) return;
      activeSection = newSec;
      animateSectionIn(newSec);
    }

    function findSectionAtCoords(x, y) {
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return null;
      const el = document.elementFromPoint(x, y);
      if (el) {
        if (el.closest('#siteHeader, .header, .navsheet, .video-modal, .lightbox-modal, .cursor, .preloader')) {
          return 'chrome';
        }
        const matched = distinctSections.find(s => s.contains(el));
        if (matched) return matched;
      }

      // Vertical bounding box search across distinctSections
      for (let i = 0; i < distinctSections.length; i++) {
        const sec = distinctSections[i];
        const rect = sec.getBoundingClientRect();
        if (rect.top <= y && rect.bottom >= y) {
          return sec;
        }
      }
      return null;
    }

    // Cursor tracking
    let lastMouseX = -1;
    let lastMouseY = -1;
    let hasMouseEverMoved = false;
    let mouseRaf = null;
    let currentHoveredCard = null;

    window.addEventListener('mousemove', (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      hasMouseEverMoved = true;

      // Card 3D tilt & magnetic cursor depth on desktop
      if (!isMobile && !isReducedMotion) {
        const cardUnderMouse = e.target.closest(
          '.featured-card, .project-card, .work-card, .partner-card, .why-card, .client-tile, .family-card, .discipline-card, .pillar-card, .metric-tile'
        );

        if (cardUnderMouse !== currentHoveredCard) {
          if (currentHoveredCard) {
            currentHoveredCard.style.setProperty('--tilt-rx', '0deg');
            currentHoveredCard.style.setProperty('--tilt-ry', '0deg');
            currentHoveredCard.style.setProperty('--parallax-tilt-x', '0px');
          }
          currentHoveredCard = cardUnderMouse;
        }

        if (cardUnderMouse) {
          const rect = cardUnderMouse.getBoundingClientRect();
          const cardX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          const cardY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
          const tiltRx = (-cardY * 6).toFixed(1);
          const tiltRy = (cardX * 6).toFixed(1);
          const tiltX = (cardX * 5).toFixed(1);

          cardUnderMouse.style.setProperty('--tilt-rx', `${tiltRx}deg`);
          cardUnderMouse.style.setProperty('--tilt-ry', `${tiltRy}deg`);
          cardUnderMouse.style.setProperty('--parallax-tilt-x', `${tiltX}px`);
        }

        // Section ambient background drift
        if (activeSection) {
          const nx = (e.clientX / vw - 0.5) * 2;
          const ny = (e.clientY / vh - 0.5) * 2;
          activeSection.style.setProperty('--ambient-drift-x', `${(nx * -22).toFixed(1)}px`);
        }
      }

      if (mouseRaf) return;
      mouseRaf = requestAnimationFrame(() => {
        mouseRaf = null;
        if (distinctSections.length === 0) return;
        const targetSec = findSectionAtCoords(lastMouseX, lastMouseY);
        if (targetSec && targetSec !== 'chrome') {
          transitionToSection(targetSec);
        }
      });
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      if (currentHoveredCard) {
        currentHoveredCard.style.setProperty('--tilt-rx', '0deg');
        currentHoveredCard.style.setProperty('--tilt-ry', '0deg');
        currentHoveredCard.style.setProperty('--parallax-tilt-x', '0px');
        currentHoveredCard = null;
      }
    });

    // Scroll tracking: reveal sections as they enter the viewport; once revealed, they stay permanently visible
    let scrollRaf = null;
    window.addEventListener('scroll', () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        if (distinctSections.length === 0) return;

        // Reveal any sections entering the viewport (never animate them out)
        distinctSections.forEach(sec => {
          const rect = sec.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.95 && rect.bottom > 20) {
            animateSectionIn(sec);
          }
        });

        // Determine which section is currently focused for ambient background drift
        let targetSec = null;
        if (hasMouseEverMoved && lastMouseX >= 0 && lastMouseY >= 0) {
          const secUnderMouse = findSectionAtCoords(lastMouseX, lastMouseY);
          if (secUnderMouse && secUnderMouse !== 'chrome') {
            targetSec = secUnderMouse;
          }
        }

        // Fallback: section occupying the most vertical space in current viewport
        if (!targetSec) {
          let maxVisibleHeight = 0;
          distinctSections.forEach(sec => {
            const rect = sec.getBoundingClientRect();
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(window.innerHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            if (visibleHeight > maxVisibleHeight) {
              maxVisibleHeight = visibleHeight;
              targetSec = sec;
            }
          });
        }

        // Top-of-page override
        if (window.scrollY < 60 && distinctSections[0]) {
          targetSec = distinctSections[0];
        }

        if (targetSec && targetSec !== 'chrome') {
          activeSection = targetSec;
          animateSectionIn(targetSec);
        }
      });
    }, { passive: true });

    // Initial page load activation: activate all sections visible in initial viewport
    function initActiveSection() {
      if (distinctSections.length === 0) {
        document.querySelectorAll(
          '.editorial-reveal-line, .editorial-reveal-inline, .text-reveal-title, .text-reveal-eyebrow, .text-reveal-body, .featured-card, .project-card, .card-motion-reveal'
        ).forEach(el => el.classList.add('is-revealed'));
        return;
      }

      // Animate in all sections visible in initial viewport
      distinctSections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          animateSectionIn(sec);
        }
      });

      if (distinctSections[0]) {
        activeSection = distinctSections[0];
        animateSectionIn(distinctSections[0]);
      }
    }

    requestAnimationFrame(() => {
      setTimeout(initActiveSection, 120);
    });

    // Global motion helper for dynamic cards and programmatic calls
    window.CactusMotion = {
      animateSectionIn: animateSectionIn,
      animateSectionOut: animateSectionOut,
      activateSection: transitionToSection,
      refreshGeometry: function() {
        cacheGeometry();
        requestTick();
      },
      revealNewCards: function(container) {
        if (!container) return;
        const cards = Array.from(container.querySelectorAll('.project-card, .featured-card, .card-motion-reveal'));
        cards.forEach((card, idx) => {
          card.style.setProperty('--card-enter-x', '0px');
          card.style.setProperty('--layout-parallax-y', '0px');
          setTimeout(() => {
            card.classList.add('is-revealed');
          }, 40 + (idx % 6) * 70);
        });
        cacheGeometry();
        requestTick();
      },
      refreshTargets: function() {
        setupUniversalTypographyMotion();
        cacheGeometry();
        requestTick();
      }
    };
  }

  /* ==========================================================================
     4. SLIDER INTERACTION PHYSICS (For index.html)
     ========================================================================== */
  function setupSliderMotion() {
    const mainSlider = document.getElementById('mainSlider');
    if (!mainSlider) return;

    // Track mouse over slide content to add subtle depth on desktop
    if (!isMobile && !isReducedMotion) {
      let mouseX = 0;
      let mouseY = 0;
      let targetX = 0;
      let targetY = 0;
      let activeGiantNum = null;
      let activeSlideMedia = null;
      let activeMonolith = null;

      function updateActiveSlideElements() {
        const activeSlide = document.querySelector('.slide.active');
        if (activeSlide) {
          activeGiantNum = activeSlide.querySelector('.giant-number');
          activeSlideMedia = activeSlide.querySelector('.slide-image img, .slide-image video');
          activeMonolith = activeSlide.querySelector('.brand-monolith');
        }
      }

      window.addEventListener('mousemove', (e) => {
        const cx = vw * 0.5;
        const cy = vh * 0.5;
        targetX = (e.clientX - cx) / cx; // -1 to 1
        targetY = (e.clientY - cy) / cy; // -1 to 1
      }, { passive: true });

      function lerpSliderDepth() {
        mouseX += (targetX - mouseX) * 0.06;
        mouseY += (targetY - mouseY) * 0.06;

        if (activeGiantNum) {
          activeGiantNum.style.transform = `translate3d(${(mouseX * 18).toFixed(1)}px, ${(mouseY * 14).toFixed(1)}px, 0)`;
        }
        if (activeSlideMedia) {
          activeSlideMedia.style.transform = `scale(1.03) translate3d(${(mouseX * -12).toFixed(1)}px, ${(mouseY * -9).toFixed(1)}px, 0)`;
        }
        if (activeMonolith) {
          activeMonolith.style.transform = `translate3d(${(mouseX * 8).toFixed(1)}px, ${(mouseY * 6).toFixed(1)}px, 0)`;
        }

        requestAnimationFrame(lerpSliderDepth);
      }

      updateActiveSlideElements();
      requestAnimationFrame(lerpSliderDepth);

      // Re-query active elements when slide changes
      const observer = new MutationObserver(() => {
        updateActiveSlideElements();
      });
      observer.observe(mainSlider, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ==========================================================================
     5. INITIALIZATION & RESIZE LISTENER
     ========================================================================== */
  function init() {
    cacheGeometry();
    setupUniversalTypographyMotion();
    setupSliderMotion();

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', () => {
      cacheGeometry();
      requestTick();
    }, { passive: true });

    // Initial tick
    requestTick();

    // Secondary tick after fonts and images finish loading
    window.addEventListener('load', () => {
      cacheGeometry();
      requestTick();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
