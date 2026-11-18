export const MAIN_SCROLL_CONTAINER_ID = 'main-scroll-container';

/**
 * Smoothly scrolls the active main workspace container (and any nested scrollable regions)
 * back to the top using native GPU-accelerated smooth scrolling (zero JS frame lag).
 */
export function smoothScrollToTop(): void {
  if (typeof document === 'undefined') return;

  const mainEl = document.getElementById(MAIN_SCROLL_CONTAINER_ID);
  if (mainEl) {
    mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    // Also smoothly scroll any inner overflow-y-auto containers that are scrolled down
    const innerScrollables = mainEl.querySelectorAll<HTMLElement>('.overflow-y-auto');
    innerScrollables.forEach((el) => {
      if (el.scrollTop > 0) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  if (typeof window !== 'undefined' && window.scrollY > 0) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function getMainScrollTop(): number {
  if (typeof document === 'undefined') return 0;
  const mainEl = document.getElementById(MAIN_SCROLL_CONTAINER_ID);
  let maxTop = mainEl ? mainEl.scrollTop : 0;
  if (mainEl) {
    const innerScrollables = mainEl.querySelectorAll<HTMLElement>('.overflow-y-auto');
    innerScrollables.forEach((el) => {
      if (el.scrollTop > maxTop) maxTop = el.scrollTop;
    });
  }
  if (typeof window !== 'undefined' && window.scrollY > maxTop) {
    maxTop = window.scrollY;
  }
  return maxTop;
}
