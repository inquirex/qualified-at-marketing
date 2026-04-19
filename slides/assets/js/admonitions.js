/* Admonition / callout rendering.
 *
 * Transforms GitHub / Obsidian-style blockquote callouts into styled
 * admonition blocks:
 *
 *     > [!INFO]
 *     >
 *     > Body paragraph goes here.
 *
 * becomes:
 *
 *     <div class="admonition admonition-info">
 *       <div class="admonition-title">INFO</div>
 *       <div class="admonition-body"><p>Body paragraph goes here.</p></div>
 *     </div>
 *
 * A custom title is supported on the same line as the marker:
 *
 *     > [!WARNING] Do not touch this
 *     > Body here
 *
 * Supported types: note, info, tip, hint, important, warning, caution, danger, success.
 * Unrecognized types are still rendered as admonitions with neutral styling.
 */

(function () {
  const MARKER = /^\s*\[!([A-Za-z]+)\](?:\s+(.*))?$/;

  function transformAdmonitions(root) {
    const scope = root || document;
    const blockquotes = scope.querySelectorAll('.reveal .slides blockquote');

    blockquotes.forEach((bq) => {
      // Skip if we've already processed the parent into an admonition.
      if (bq.dataset.admonitionProcessed === 'true') return;

      const firstP = bq.querySelector(':scope > p');
      if (!firstP) return;

      // We only match when the marker occupies the first paragraph on its own line.
      // textContent strips HTML but preserves the visible text.
      const text = firstP.textContent.trim();
      const match = text.match(MARKER);
      if (!match) return;

      const type = match[1].toLowerCase();
      const customTitle = (match[2] || '').trim();

      firstP.remove();

      const container = document.createElement('div');
      container.className = `admonition admonition-${type}`;
      container.dataset.admonitionProcessed = 'true';

      const title = document.createElement('div');
      title.className = 'admonition-title';
      title.textContent = customTitle || type.toUpperCase();
      container.appendChild(title);

      const body = document.createElement('div');
      body.className = 'admonition-body';
      while (bq.firstChild) body.appendChild(bq.firstChild);
      container.appendChild(body);

      bq.parentNode.replaceChild(container, bq);
    });
  }

  function init() {
    if (!window.Reveal) {
      // Reveal isn't loaded yet — try again after DOMContentLoaded.
      document.addEventListener('DOMContentLoaded', init, { once: true });
      return;
    }
    // `ready` fires after the markdown plugin has finished rendering slides.
    Reveal.on('ready', () => transformAdmonitions());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Expose for manual re-runs if needed.
  window.transformAdmonitions = transformAdmonitions;
})();
