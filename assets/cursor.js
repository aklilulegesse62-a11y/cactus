/**
 * Custom magnetic cursor removed per user request.
 * Native browser cursor restored across all pages.
 */
(function removeCustomCursor() {
  function cleanup() {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (dot) dot.remove();
    if (ring) ring.remove();
    document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(el => el.remove());
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanup);
  } else {
    cleanup();
  }
})();
