/**
 * Cactus Ethiopia — Brand Architecture Parallax Engine
 * Provides subtle, physical, restrained scroll parallax for oversized brand marks.
 */
(function initBrandArchitecture() {
  if (typeof window === 'undefined') return;

  // Check prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  function setupParallax() {
    const monoliths = document.querySelectorAll('.brand-monolith[data-parallax]');
    if (!monoliths.length) return;

    let ticking = false;

    function updateParallax() {
      const vh = window.innerHeight;

      monoliths.forEach(el => {
        const rect = el.parentElement.getBoundingClientRect();
        // Check if parent section is in or near viewport
        if (rect.bottom > -200 && rect.top < vh + 200) {
          const speed = parseFloat(el.getAttribute('data-parallax-speed') || '0.06');
          // Distance of parent center from viewport center
          const parentCenter = rect.top + rect.height * 0.5;
          const delta = (vh * 0.5 - parentCenter) * speed;

          // Retain base rotation / transform if specified in data-base-transform
          const baseTransform = el.getAttribute('data-base-transform') || '';
          el.style.setProperty('--ambient-parallax-y', `${delta.toFixed(2)}px`);
          el.style.transform = `${baseTransform} translate3d(var(--ambient-drift-x, 0px), ${delta.toFixed(2)}px, 0)`;
        }
      });

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupParallax);
  } else {
    setupParallax();
  }
})();
