/* ==========================================================================
   Page motion: navigation state, entrance reveals, the scroll-scrubbed
   "one paragraph" section, the embed loop, and the small interactions.
   No dependencies. Everything degrades to a readable static page.
   ========================================================================== */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* ------------------------------------------------------------------- nav */

  function nav() {
    var bar = document.querySelector('[data-nav]');
    if (!bar) return;

    var burger = bar.querySelector('[data-nav-toggle]');

    var onScroll = function () {
      bar.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (burger) {
      burger.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = bar.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
      });

      bar.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          bar.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('click', function (e) {
        if (!bar.contains(e.target)) {
          bar.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          bar.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* -------------------------------------------------------- reading ribbon */

  function ribbon() {
    var fill = document.querySelector('[data-read]');
    if (!fill) return;
    var tick = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      fill.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
  }

  /* -------------------------------------------------------- headline words */

  function words() {
    each(document.querySelectorAll('[data-words]'), function (host) {
      var parts = [];
      each(host.childNodes, function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (chunk) {
            if (!chunk) return;
            if (/^\s+$/.test(chunk)) { parts.push(document.createTextNode(chunk)); return; }
            var span = document.createElement('span');
            span.className = 'qa-word';
            span.textContent = chunk;
            parts.push(span);
          });
        } else if (node.nodeType === 1) {
          // Keep inline elements (the washed phrase) whole, but animate them.
          node.classList.add('qa-word');
          parts.push(node);
        }
      });
      host.innerHTML = '';
      parts.forEach(function (p) { host.appendChild(p); });

      var spans = host.querySelectorAll('.qa-word');
      each(spans, function (span, i) {
        if (reduced) { span.classList.add('is-in'); return; }
        setTimeout(function () { span.classList.add('is-in'); }, 90 + i * 55);
      });
    });
  }

  /* --------------------------------------------------------------- reveals */

  function reveals() {
    var targets = document.querySelectorAll('.qa-in, .qa-stagger');
    if (reduced || !('IntersectionObserver' in window)) {
      each(targets, function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    each(targets, function (t) { io.observe(t); });
  }

  /* -------------------------------------------------------------- counters */

  function counters() {
    var cells = document.querySelectorAll('[data-count-to]');
    if (!cells.length) return;

    var animate = function (node) {
      var to = parseFloat(node.getAttribute('data-count-to'));
      var dur = 1100;
      var start = null;
      var step = function (now) {
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        node.textContent = Math.round(to * eased).toLocaleString('en-US');
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (reduced || !('IntersectionObserver' in window)) {
      each(cells, function (c) { c.textContent = Number(c.getAttribute('data-count-to')).toLocaleString('en-US'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    each(cells, function (c) { io.observe(c); });
  }

  /* --------------------------------------------- one paragraph, many skips */

  function scrub() {
    var track = document.querySelector('[data-scrub]');
    if (!track) return;

    var marks = track.querySelectorAll('mark[data-mark]');
    var rows = track.querySelectorAll('.qa-step[data-mark]');
    var asked = track.querySelectorAll('.qa-step[data-count]:not([data-mark])');
    var count = track.querySelector('[data-scrub-count]');
    var list = track.querySelector('[data-steplist]');
    var totalQuestions = track.querySelectorAll('.qa-step[data-count]').length;

    var groups = [];
    each(marks, function (mark) {
      var key = mark.getAttribute('data-mark');
      var owned = [];
      each(rows, function (row) {
        if (row.getAttribute('data-mark') === key) owned.push(row);
      });
      groups.push({ mark: mark, rows: owned });
    });

    var settle = function () {
      groups.forEach(function (g) {
        g.mark.classList.add('is-lit');
        g.rows.forEach(function (r) { r.classList.add('is-filled'); });
      });
      each(asked, function (r) { r.classList.add('is-asked'); });
      if (count) count.textContent = String(asked.length);
    };

    if (reduced || window.matchMedia('(max-width: 900px)').matches) {
      settle();
      return;
    }

    var applied = -1;

    var apply = function (reached) {
      if (reached === applied) return;
      applied = reached;
      var remaining = totalQuestions;

      groups.forEach(function (g, i) {
        var on = i < reached;
        g.mark.classList.toggle('is-lit', on);
        g.rows.forEach(function (r) {
          r.classList.toggle('is-filled', on);
          if (on) remaining -= 1;
        });
      });

      var done = reached >= groups.length;
      each(asked, function (r) { r.classList.toggle('is-asked', done); });
      if (count) count.textContent = String(remaining);

      // Keep the newest filled row in view inside the clipped list, but only
      // when the list is actually taller than its frame -- otherwise scrollTop
      // is a no-op that leaves the list stranded when the scrub rewinds.
      if (list && list.scrollHeight > list.clientHeight + 1) {
        if (reached <= 0) {
          list.scrollTop = 0;
        } else {
          var last = groups[Math.min(reached, groups.length) - 1].rows.slice(-1)[0];
          if (last) list.scrollTop = Math.max(0, last.offsetTop - list.clientHeight * 0.55);
        }
      }
    };

    var onScroll = function () {
      var rect = track.getBoundingClientRect();
      var span = rect.height - window.innerHeight;
      if (span <= 0) { apply(groups.length); return; }
      var p = Math.min(1, Math.max(0, -rect.top / span));
      // hold a beat at each end so the first and last states can be read
      var eased = Math.min(1, Math.max(0, (p - 0.12) / 0.7));
      apply(Math.round(eased * groups.length));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------- embed replay */

  function embed() {
    var host = document.querySelector('[data-embed]');
    if (!host) return;

    var launcher = host.querySelector('.qa-launcher');
    var mini = host.querySelector('.qa-mini');
    if (!launcher || !mini) return;

    if (reduced) {
      mini.classList.add('is-in');
      return;
    }

    var timers = [];
    var clear = function () { timers.forEach(clearTimeout); timers = []; };

    var cycle = function () {
      clear();
      launcher.classList.remove('is-in');
      mini.classList.remove('is-in');
      timers.push(setTimeout(function () { launcher.classList.add('is-in'); }, 400));
      timers.push(setTimeout(function () {
        launcher.classList.remove('is-in');
        mini.classList.add('is-in');
      }, 2200));
      // The open widget is the point of the section, so hold it far longer than
      // the launcher that precedes it.
      timers.push(setTimeout(function () { mini.classList.remove('is-in'); }, 9000));
      timers.push(setTimeout(cycle, 9600));
    };

    // Watch the browser mock rather than the whole two-column section: a third
    // of this section can be on screen while the mock itself is still below the
    // fold, which would spend the animation before anyone is looking at it.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) cycle();
        else clear();
      });
    }, { threshold: 0.6 });
    io.observe(host.querySelector('.qa-browser') || host);
  }

  /* -------------------------------------------------------------- spotlight */

  function spotlight() {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest('.qa-card, .qa-demo');
      if (!card) return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    }, { passive: true });
  }

  /* ------------------------------------------------------------- float pill */

  function floatPill() {
    var pill = document.querySelector('[data-float]');
    var hero = document.querySelector('.qa-hero');
    if (!pill || !hero) return;
    var end = document.querySelector('.qa-cta');

    var tick = function () {
      // Show it once the hero's own buttons are gone, and retire it again when
      // the closing call to action arrives -- two competing CTAs on top of each
      // other reads as clutter, and on a phone the pill would cover it.
      var past = window.scrollY > hero.offsetHeight * 0.75;
      var atEnd = end && end.getBoundingClientRect().top < window.innerHeight * 0.75;
      pill.classList.toggle('is-in', past && !atEnd);
    };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
  }

  /* --------------------------------------- "play this one here" on a card */

  function sceneJumps() {
    each(document.querySelectorAll('[data-play-scene]'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var key = btn.getAttribute('data-play-scene');
        var theater = document.getElementById('theater');
        if (theater) theater.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        if (window.qaTheater) {
          setTimeout(function () { window.qaTheater.select(key); }, reduced ? 0 : 620);
        }
      });
    });
  }

  /* Duplicate the marquee row so the -50% translate loops seamlessly. */
  function marquee() {
    each(document.querySelectorAll('[data-marquee]'), function (row) {
      row.innerHTML = row.innerHTML + row.innerHTML;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    nav();
    ribbon();
    marquee();
    words();
    reveals();
    counters();
    scrub();
    embed();
    spotlight();
    floatPill();
    sceneJumps();
  });
})();
