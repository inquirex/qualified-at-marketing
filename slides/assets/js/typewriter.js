/* Typewriter effect — configurable per slide.
 *
 * Each entry in TARGETS picks a slide by matching any heading (h1–h4) against
 * `titleMatch`, then animates the text content of every element that matches
 * `elementSelector` within that slide. Letters reveal sequentially via CSS
 * animation-delay, restarting whenever the slide becomes current.
 */

(function () {
  // Disable entirely for PDF export (?pdf in URL).
  if (new URLSearchParams(window.location.search).has('pdf')) return;

  const TYPING_SPEED = 14;   // ms per letter
  const LINE_PAUSE   = 80;   // ms gap between successive elements

  const TARGETS = [
    // "Nothing Combines" — animate each h4 bullet
    { titleMatch: /nothing\s+combines/i,            elementSelector: 'h4' },
    // Closing bumper slide — animate both h2 lines
    { titleMatch: /ask\s+the\s+right\s+questions/i, elementSelector: 'h2' }
  ];

  function wrapLetters(elements) {
    if (!elements || !elements.length) return false;
    let delay = 0;
    let wrapped = false;
    elements.forEach((el) => {
      if (el.dataset.tw === 'true') return;
      el.dataset.tw = 'true';

      const text = el.textContent;
      el.textContent = '';
      for (const ch of text) {
        const span = document.createElement('span');
        span.className = 'tw-letter';
        span.textContent = ch;
        span.style.animationDelay = `${delay}ms`;
        el.appendChild(span);
        delay += TYPING_SPEED;
      }
      delay += LINE_PAUSE;
      wrapped = true;
    });
    return wrapped;
  }

  function findSlide(titleMatch) {
    const sections = document.querySelectorAll('.reveal .slides > section');
    for (const s of sections) {
      const headings = s.querySelectorAll('h1, h2, h3, h4');
      for (const h of headings) {
        if (titleMatch.test(h.textContent)) return s;
      }
    }
    return null;
  }

  function trigger(section) {
    // Remove + re-add to restart the CSS animation from zero.
    section.classList.remove('tw-playing');
    void section.offsetWidth;
    section.classList.add('tw-playing');
  }

  function init() {
    if (!window.Reveal) {
      document.addEventListener('DOMContentLoaded', init, { once: true });
      return;
    }

    Reveal.on('ready', () => {
      const slides = new Set();

      for (const target of TARGETS) {
        const section = findSlide(target.titleMatch);
        if (!section) continue;

        section.classList.add('tw-slide');
        const elements = section.querySelectorAll(target.elementSelector);
        if (wrapLetters(elements)) slides.add(section);
      }

      if (!slides.size) return;

      Reveal.on('slidechanged', (event) => {
        if (slides.has(event.currentSlide)) trigger(event.currentSlide);
      });

      const current = Reveal.getCurrentSlide();
      if (slides.has(current)) trigger(current);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
