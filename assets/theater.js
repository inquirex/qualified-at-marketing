/* ==========================================================================
   The homepage theater: the flow builder, the copilot and the lead-facing
   form, animated in the page instead of screenshotted.

   Two acts. Act one is the copilot drawing the flow on the canvas. Act two is
   a lead arriving, writing one paragraph, and the form answering itself. Both
   are scripted from real flows — see scenes.js.

   Everything is driven by one clock that stops when the theater is off screen
   or the tab is hidden, so an idle page costs nothing.
   ========================================================================== */

(function () {
  'use strict';

  var DATA = window.QA_SCENES;
  if (!DATA) return;

  var CANCELLED = { cancelled: true };
  var NODE_W = 250;

  /* ---------------------------------------------------------------- clock */

  function Clock() {
    this.t = 0;
    this.running = false;
    this.waiters = [];
    var self = this;
    var last = 0;
    requestAnimationFrame(function frame(now) {
      if (!last) last = now;
      var dt = now - last;
      last = now;
      if (self.running) {
        self.t += Math.min(dt, 64);
        self.flush();
      }
      if (self.onFrame) self.onFrame();
      requestAnimationFrame(frame);
    });
  }

  Clock.prototype.flush = function () {
    if (!this.waiters.length) return;
    var due = [];
    var keep = [];
    for (var i = 0; i < this.waiters.length; i++) {
      (this.waiters[i].at <= this.t ? due : keep).push(this.waiters[i]);
    }
    this.waiters = keep;
    for (var j = 0; j < due.length; j++) due[j].resolve();
  };

  Clock.prototype.wait = function (ms) {
    var self = this;
    return new Promise(function (resolve) {
      self.waiters.push({ at: self.t + ms, resolve: resolve });
    });
  };

  /* ----------------------------------------------------------- dom helpers */

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
              'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg>';

  var SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
               'stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3"/><path d="M9 12l2 2l4 -4"/></svg>';

  /* --------------------------------------------------------------- theater */

  function Theater(root) {
    this.root = root;
    this.clock = new Clock();
    this.runId = 0;
    this.act = 0;
    this.started = false;
    this.sceneKey = DATA.order[0];

    var self = this;
    this.el = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-el]'), function (node) {
      self.el[node.getAttribute('data-el')] = node;
    });

    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.bindControls();
    this.mount(this.sceneKey);

    window.addEventListener('resize', function () { self.fit(); }, { passive: true });

    this.clock.onFrame = function () { self.tickTimeline(); };

    if (this.reduced) {
      this.root.classList.add('is-idle');
      this.finalStill();
    } else {
      this.observe();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) self.clock.running = false;
      else if (self.visible) self.clock.running = true;
    });
  }

  Theater.prototype.bindControls = function () {
    var self = this;

    Array.prototype.forEach.call(this.root.querySelectorAll('[data-scene]'), function (btn) {
      btn.addEventListener('click', function () {
        self.select(btn.getAttribute('data-scene'));
      });
    });

    Array.prototype.forEach.call(this.root.querySelectorAll('[data-goto-act]'), function (btn) {
      btn.addEventListener('click', function () {
        self.wake();
        self.play(Number(btn.getAttribute('data-goto-act')));
      });
    });

    if (this.el.replay) {
      this.el.replay.addEventListener('click', function () {
        self.wake();
        self.play(1);
      });
    }

    if (this.el.playbtn) {
      this.el.playbtn.addEventListener('click', function () {
        self.wake();
        self.play(1);
      });
    }
  };

  Theater.prototype.wake = function () {
    this.root.classList.remove('is-idle');
    this.clock.running = true;
    this.started = true;
  };

  Theater.prototype.observe = function () {
    var self = this;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        self.visible = entry.intersectionRatio > 0.25;
        if (self.visible && !document.hidden) {
          self.clock.running = true;
          if (!self.started) {
            self.started = true;
            self.play(1);
          }
        } else {
          self.clock.running = false;
        }
      });
    }, { threshold: [0, 0.25, 0.6] });
    io.observe(this.el.window || this.root);
  };

  /* Public: let other parts of the page point the theater at a scene. */
  Theater.prototype.select = function (key) {
    if (!DATA.scenes[key]) return;
    this.mount(key);
    this.wake();
    this.play(1);
  };

  /* ------------------------------------------------------------- mounting */

  Theater.prototype.mount = function (key) {
    this.runId++;
    this.sceneKey = key;
    this.scene = DATA.scenes[key];

    Array.prototype.forEach.call(this.root.querySelectorAll('[data-scene]'), function (btn) {
      btn.setAttribute('aria-selected', String(btn.getAttribute('data-scene') === key));
    });

    this.root.style.setProperty('--qa-accent', this.scene.accent);
    if (this.el.wintitle) this.el.wintitle.textContent = this.scene.windowTitle;
    if (this.el.pvname) this.el.pvname.textContent = this.scene.firm;
    if (this.el.pvicon) this.el.pvicon.textContent = this.scene.initial;
    if (this.el.demolink) {
      this.el.demolink.href = this.scene.demoUrl;
      this.el.demolink.textContent = 'Open the real ' + this.scene.label.toLowerCase() + ' form';
    }
    if (this.el.summary) {
      this.el.summary.textContent =
        'An animated walkthrough of the ' + this.scene.label.toLowerCase() + ' flow: the AI copilot ' +
        'draws a branching intake form on a canvas, then a lead describes their situation in one ' +
        'paragraph and the form fills in ' + this.scene.facts.length + ' of its ' +
        this.scene.totalSteps + ' steps and asks only the ' + this.scene.remaining.length +
        ' questions that are left, ending in an estimate of ' + money(this.scene.estimate.low) +
        ' to ' + money(this.scene.estimate.high) + '.';
    }

    this.buildGraph();
    this.resetPanes();
  };

  Theater.prototype.resetPanes = function () {
    this.el.chat.innerHTML = '';
    this.bot('Tell me about your business — what you do, what you sell, and what makes one ' +
             'job cost more than another. The more you write, the better the form I can build.');
    this.el.prompttext.textContent = '';
    this.el.prompt.classList.remove('is-active');
    this.el.prompt.setAttribute('data-placeholder', 'Describe your business — what you do, and what drives your pricing…');
    this.el.send.classList.remove('is-armed', 'is-hit');
    this.el.preview.classList.remove('is-in');
    this.el.scrim.classList.remove('is-in');
    this.el.firm.classList.remove('is-in');
    this.el.accum.classList.remove('is-in');
    this.el.previewbtn.classList.remove('is-lit');
    this.el.pvbody.innerHTML = '';
    this.setProgress(1);
    this.pan(0, false);
    this.setActUI(1);
  };

  Theater.prototype.buildGraph = function () {
    var scene = this.scene;
    var layout = DATA.layout;

    this.el.nodes.innerHTML = '';
    this.el.labels.innerHTML = '';
    this.el.edges.innerHTML = '';

    this.nodeEls = scene.nodes.map(function (node, i) {
      var box = el('div', 'qa-node qa-node-' + node.verb);
      box.style.left = layout[i].x + 'px';
      box.style.top = layout[i].y + 'px';

      var chips = '';
      if (node.type) chips += '<span class="qa-type">' + esc(node.type) + '</span>';
      if (node.skip) chips += '<span class="qa-type">skip_if answered</span>';

      box.innerHTML =
        '<div class="qa-node-top">' +
          '<span class="qa-verb">' + esc(node.verb) + '</span>' +
          '<span class="qa-node-name">' + esc(node.name) + '</span>' +
        '</div>' +
        '<div class="qa-node-text">' + esc(node.text) + '</div>' +
        (chips ? '<div class="qa-node-foot">' + chips + '</div>' : '');

      return box;
    });

    var frag = document.createDocumentFragment();
    this.nodeEls.forEach(function (n) { frag.appendChild(n); });
    this.el.nodes.appendChild(frag);

    this.buildEdges();
    this.fit();
  };

  Theater.prototype.buildEdges = function () {
    var self = this;
    var layout = DATA.layout;
    var svgns = 'http://www.w3.org/2000/svg';

    this.edgeEls = DATA.edges.map(function (edge, i) {
      var a = layout[edge.from];
      var b = layout[edge.to];
      var ah = self.nodeEls[edge.from].offsetHeight || 76;

      var x1 = a.x + NODE_W / 2;
      var y1 = a.y + ah;
      var x2 = b.x + NODE_W / 2;
      var y2 = b.y - 7;

      var d;
      if (Math.abs(x1 - x2) < 2) {
        d = 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2;
      } else {
        var bend = Math.max(38, (y2 - y1) * 0.6);
        d = 'M' + x1 + ' ' + y1 +
            ' C' + x1 + ' ' + (y1 + bend) + ' ' + x2 + ' ' + (y2 - bend) + ' ' + x2 + ' ' + y2;
      }

      var path = document.createElementNS(svgns, 'path');
      path.setAttribute('d', d);
      if (edge.kind === 'branch') path.classList.add('is-hot');
      self.el.edges.appendChild(path);

      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;

      var arrow = document.createElementNS(svgns, 'path');
      arrow.setAttribute('class', 'qa-arrow');
      arrow.setAttribute('d', 'M' + (x2 - 4.5) + ' ' + (y2 - 6) + ' L' + (x2 + 4.5) + ' ' + (y2 - 6) +
                              ' L' + x2 + ' ' + (y2 + 2) + ' Z');
      self.el.edges.appendChild(arrow);

      var text = edge.kind === 'branch' ? self.scene.branchLabel
               : edge.kind === 'else'   ? '2 · else'
               : 'always';
      var label = el('div', 'qa-edge-label' + (edge.kind === 'branch' ? ' is-branch' : ''), esc(text));
      var at = edge.kind === 'branch' ? 0.66 : edge.kind === 'else' ? 0.3 : 0.5;
      var mid = path.getPointAtLength(len * at);
      label.style.left = mid.x + 'px';
      label.style.top = mid.y + 'px';
      self.el.labels.appendChild(label);

      return { path: path, arrow: arrow, label: label, edge: edge, len: len };
    });
  };

  Theater.prototype.fit = function () {
    if (!this.el.canvas) return;
    var w = this.el.canvas.clientWidth;
    var s = Math.min(1, Math.max(0.42, (w - 20) / 640));
    this.scale = s;
    this.el.fit.style.transform = 'translateX(-50%) scale(' + s + ')';
    this.pan(this.panIndex || 0, false);
  };

  Theater.prototype.pan = function (index, animate) {
    this.panIndex = index;
    var layout = DATA.layout[index] || DATA.layout[0];
    var h = this.el.canvas.clientHeight || 420;
    var s = this.scale || 1;
    var nodeH = (this.nodeEls && this.nodeEls[index] && this.nodeEls[index].offsetHeight) || 76;
    var target = layout.y + nodeH / 2 - (h * 0.5) / s;
    var max = 1240 - h / s + 40;
    var y = Math.max(-14, Math.min(target, Math.max(-14, max)));
    this.el.pan.style.transition = animate === false ? 'none' : '';
    this.el.pan.style.transform = 'translateY(' + (-y) + 'px)';
    if (animate === false) {
      // force the style to settle before transitions come back
      void this.el.pan.offsetHeight;
      this.el.pan.style.transition = '';
    }
  };

  /* ------------------------------------------------------------ act pieces */

  Theater.prototype.setActUI = function (act) {
    this.root.setAttribute('data-act', String(act));
    Array.prototype.forEach.call(this.root.querySelectorAll('[data-goto-act]'), function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-goto-act') === String(act));
    });
  };

  Theater.prototype.caption = function (text) {
    if (this.el.caption) this.el.caption.textContent = text;
  };

  Theater.prototype.tickTimeline = function () {
    if (!this.el.progress || !this.actDur) return;
    var f = Math.max(0, Math.min(1, (this.clock.t - this.actStart) / this.actDur));
    this.el.progress.style.width = (f * 100).toFixed(1) + '%';
  };

  Theater.prototype.bot = function (html) {
    var msg = el('div', 'qa-msg qa-msg-bot', html);
    this.el.chat.appendChild(msg);
    return msg;
  };

  Theater.prototype.user = function (text) {
    var msg = el('div', 'qa-msg qa-msg-user', esc(text));
    this.el.chat.appendChild(msg);
    return msg;
  };

  Theater.prototype.thinking = function () {
    var msg = el('div', 'qa-msg qa-msg-bot', '<span class="qa-thinking"><i></i><i></i><i></i></span>');
    this.el.chat.appendChild(msg);
    return msg;
  };

  Theater.prototype.revealNode = function (i) {
    var node = this.nodeEls[i];
    if (!node) return;
    node.classList.add('is-in', 'is-flash');
    var self = this;
    setTimeout(function () { node.classList.remove('is-flash'); }, 520);
    // draw every edge whose target has now arrived
    this.edgeEls.forEach(function (e) {
      if (e.edge.to !== i) return;
      if (!self.nodeEls[e.edge.from].classList.contains('is-in')) return;
      e.path.style.strokeDashoffset = 0;
      e.arrow.classList.add('is-in');
      e.label.classList.add('is-in');
    });
  };

  Theater.prototype.showAll = function () {
    var self = this;
    this.nodeEls.forEach(function (n) { n.classList.add('is-in'); });
    this.edgeEls.forEach(function (e) {
      e.path.style.strokeDashoffset = 0;
      e.arrow.classList.add('is-in');
      e.label.classList.add('is-in');
    });
    self.el.accum.classList.add('is-in');
  };

  Theater.prototype.setProgress = function (step) {
    var total = this.scene.totalSteps;
    var pct = Math.round(((step - 1) / total) * 100);
    if (this.el.pvstep) this.el.pvstep.textContent = 'Step ' + step + ' of ' + total;
    if (this.el.pvpct) this.el.pvpct.textContent = pct + '%';
    if (this.el.pvfill) this.el.pvfill.style.width = pct + '%';
  };

  /* --------------------------------------------------------------- runner */

  Theater.prototype.play = function (act) {
    var self = this;
    var id = ++this.runId;

    function wait(ms) {
      return self.clock.wait(ms).then(function () {
        if (self.runId !== id) throw CANCELLED;
      });
    }

    this.act = act;
    this.actStart = this.clock.t;
    this.actDur = act === 1 ? 13500 : 21000;
    this.setActUI(act);

    var run = act === 1 ? this.act1(wait) : this.act2(wait);
    run.catch(function (err) {
      if (err !== CANCELLED) throw err;
    });
  };

  Theater.prototype.type = function (target, text, cps, wait) {
    var i = 0;
    var out = '';
    function next() {
      if (i >= text.length) return Promise.resolve();
      var take = 1 + Math.floor(Math.random() * 3);
      out += text.slice(i, i + take);
      i += take;
      target.textContent = out;
      var delay = (1000 / cps) * take;
      var last = out.charAt(out.length - 1);
      if (last === '.' || last === ',' || last === '—') delay += 130;
      return wait(delay).then(next);
    }
    return next();
  };

  /* ----------------------------------------------------------------- act 1 */

  Theater.prototype.act1 = async function (wait) {
    var scene = this.scene;

    this.resetPanes();
    this.caption('Act one — you describe the job. The copilot draws the flow, you keep the canvas.');

    await wait(350);

    this.el.prompt.classList.add('is-active');
    await this.type(this.el.prompttext, scene.prompt, 62, wait);
    await wait(220);

    this.el.send.classList.add('is-armed');
    await wait(240);
    this.el.send.classList.add('is-hit');
    await wait(130);
    this.el.send.classList.remove('is-hit', 'is-armed');

    this.user(scene.prompt);
    this.el.prompttext.textContent = '';
    this.el.prompt.classList.remove('is-active');

    var dots = this.thinking();
    await wait(700);
    dots.remove();

    var msg = this.bot(scene.intro);
    var ops = el('div', 'qa-ops');
    msg.appendChild(ops);
    await wait(420);

    for (var i = 0; i < scene.ops.length; i++) {
      var op = scene.ops[i];
      var row = el('div', 'qa-op' + (op.kind === 'ai' ? ' is-ai' : op.kind === 'branch' ? ' is-branch' : ''),
        '<b>' + esc(op.op) + '</b> ' + esc(op.name) + (op.note ? ' <i>' + esc(op.note) + '</i>' : ''));
      ops.appendChild(row);

      this.revealNode(i);
      this.pan(i, true);

      if (i === scene.nodes.length - 1) this.el.accum.classList.add('is-in');
      await wait(i === 2 ? 880 : 600);
    }

    await wait(380);
    this.bot(scene.outro);
    this.el.previewbtn.classList.add('is-lit');

    await wait(1700);
    this.play(2);
  };

  /* ----------------------------------------------------------------- act 2 */

  Theater.prototype.act2 = async function (wait) {
    var scene = this.scene;
    var body = this.el.pvbody;

    this.runIdSnapshot = this.runId;
    this.showAll();
    this.el.previewbtn.classList.add('is-lit');
    this.caption('Act two — a lead lands on the site. Same flow, their side of it.');
    this.setProgress(1);
    this.pan(2, true);

    // The panel arrives
    this.el.scrim.classList.add('is-in');
    this.el.preview.classList.add('is-in');
    this.el.firm.classList.remove('is-in');
    body.innerHTML = '';

    var q = el('p', 'qa-pv-q', esc(scene.leadQuestion));
    var area = el('div', 'qa-pv-area');
    var areaText = el('span', null, '');
    var caret = el('i', 'qa-caret');
    area.appendChild(areaText);
    area.appendChild(caret);
    var next = el('button', 'qa-pv-next', 'Next');
    next.type = 'button';
    body.appendChild(q);
    body.appendChild(area);
    body.appendChild(next);

    await wait(700);
    area.classList.add('is-active');
    await this.type(areaText, scene.paragraph, 84, wait);
    caret.remove();
    await wait(420);

    next.classList.add('is-hit');
    await wait(180);
    next.classList.remove('is-hit');

    // The model reads it
    this.setProgress(3);
    body.innerHTML = '';
    body.appendChild(el('div', 'qa-reading',
      '<span class="qa-thinking"><i></i><i></i><i></i></span> Reading what you wrote…'));

    var clarify = this.nodeEls[2];
    clarify.classList.add('is-working');
    this.pan(4, true);
    await wait(1400);
    clarify.classList.remove('is-working');

    // What it picked up
    body.innerHTML = '';
    body.appendChild(el('p', 'qa-pv-q', "Here's what we picked up from what you wrote:"));
    var facts = el('div', 'qa-facts');
    body.appendChild(facts);

    var shown = Math.min(5, scene.facts.length);
    for (var i = 0; i < shown; i++) {
      var f = scene.facts[i];
      facts.appendChild(el('div', 'qa-fact',
        CHECK + '<b>' + esc(f.field) + '</b><span>' + esc(f.value) + '</span>'));

      if (typeof f.node === 'number') {
        var node = this.nodeEls[f.node];
        node.classList.add('is-filled');
        var foot = node.querySelector('.qa-node-foot');
        if (!foot) {
          foot = el('div', 'qa-node-foot');
          node.appendChild(foot);
        }
        foot.appendChild(el('span', 'qa-fillchip', '✓ ' + esc(f.value)));
        foot.appendChild(el('span', 'qa-skipchip', 'skipped'));
      }
      await wait(260);
    }

    if (scene.facts.length > shown) {
      facts.appendChild(el('div', 'qa-fact',
        CHECK + '<b>+ ' + (scene.facts.length - shown) + ' more fields</b><span>filled</span>'));
      await wait(280);
    }

    var tally = el('div', 'qa-tally',
      '<b>' + scene.remaining.length + '</b>' +
      '<span>questions left of ' + scene.totalSteps + ' steps — the paragraph answered ' +
      scene.facts.length + '</span>');
    body.appendChild(tally);
    await wait(1600);

    // The questions that are actually left
    var total = scene.totalSteps;
    for (var r = 0; r < scene.remaining.length; r++) {
      var item = scene.remaining[r];
      var step = Math.round(4 + r * ((total - 7) / Math.max(1, scene.remaining.length)));
      this.setProgress(step);

      body.innerHTML = '';
      body.appendChild(el('p', 'qa-pv-q', esc(item.q)));

      if (item.kind === 'number') {
        var num = el('div', 'qa-pv-area');
        num.style.minHeight = '42px';
        body.appendChild(num);
        var nextN = el('button', 'qa-pv-next', 'Next');
        body.appendChild(nextN);
        await wait(360);
        num.classList.add('is-active');
        num.textContent = item.value;
        await wait(430);
        nextN.classList.add('is-hit');
        await wait(180);
      } else {
        var opts = el('div', 'qa-opts');
        var optEls = item.opts.map(function (label) {
          var o = el('div', 'qa-opt', '<i></i><span>' + esc(label) + '</span>');
          opts.appendChild(o);
          return o;
        });
        body.appendChild(opts);
        var nextB = el('button', 'qa-pv-next', 'Next');
        body.appendChild(nextB);
        await wait(470);
        optEls[item.pick].classList.add('is-picked');
        await wait(400);
        nextB.classList.add('is-hit');
        await wait(180);
      }
    }

    // Nobody asked who they are
    this.setProgress(total - 3);
    body.innerHTML = '';
    body.appendChild(el('div', 'qa-privacy', SHIELD + '<span>' + esc(scene.privacy) + '</span>'));
    body.appendChild(el('button', 'qa-pv-next', 'Continue'));
    await wait(1900);

    // The number
    this.setProgress(total - 2);
    body.innerHTML = '';
    var est = el('div', 'qa-estimate',
      '<small>' + esc(scene.estimate.label) + '</small><strong>&nbsp;</strong>' +
      '<p>' + esc(scene.estimate.note) + '</p>');
    body.appendChild(est);
    var out = est.querySelector('strong');

    var steps = 26;
    for (var k = 1; k <= steps; k++) {
      var t = k / steps;
      var eased = 1 - Math.pow(1 - t, 3);
      var lo = Math.round(scene.estimate.low * eased / 100) * 100;
      var hi = Math.round(scene.estimate.high * eased / 100) * 100;
      out.textContent = money(lo) + ' – ' + money(hi);
      await wait(34);
    }
    out.textContent = money(scene.estimate.low) + ' – ' + money(scene.estimate.high);

    await wait(600);

    // …and what the firm sees, which the lead never does
    this.el.firmtier.textContent = scene.firmCard.tier;
    this.el.firmroute.textContent = scene.firmCard.route;
    this.el.firmfilled.textContent = scene.facts.length;
    this.el.firmasked.textContent = scene.remaining.length;
    this.el.firm.classList.add('is-in');
    this.caption('The lead sees a range. The firm sees a tier, a route, and every answer behind it.');

    await wait(2200);
    body.appendChild(el('div', 'qa-privacy',
      SHIELD + '<span>That is the whole product: a form that finishes the first call before anyone picks up.</span>'));

    await wait(3200);
    this.root.classList.add('is-idle');
    this.clock.running = false;
    this.started = false;
  };

  /* The still frame used when motion is turned off: act two, already over. */
  Theater.prototype.finalStill = function () {
    var scene = this.scene;

    this.user(scene.prompt);
    var msg = this.bot(scene.intro);
    var ops = el('div', 'qa-ops');
    scene.ops.forEach(function (op) {
      ops.appendChild(el('div', 'qa-op' + (op.kind === 'ai' ? ' is-ai' : op.kind === 'branch' ? ' is-branch' : ''),
        '<b>' + esc(op.op) + '</b> ' + esc(op.name) + (op.note ? ' <i>' + esc(op.note) + '</i>' : '')));
    });
    msg.appendChild(ops);
    this.bot(scene.outro);

    this.showAll();
    this.el.previewbtn.classList.add('is-lit');
    this.el.scrim.classList.add('is-in');
    this.el.preview.classList.add('is-in');
    this.setProgress(scene.totalSteps - 2);
    this.pan(4, false);

    var body = this.el.pvbody;
    body.innerHTML = '';
    body.appendChild(el('div', 'qa-estimate',
      '<small>' + esc(scene.estimate.label) + '</small>' +
      '<strong>' + money(scene.estimate.low) + ' – ' + money(scene.estimate.high) + '</strong>' +
      '<p>' + esc(scene.estimate.note) + '</p>'));
    body.appendChild(el('div', 'qa-tally',
      '<b>' + scene.remaining.length + '</b><span>questions left of ' + scene.totalSteps +
      ' steps — the paragraph answered ' + scene.facts.length + '</span>'));

    this.el.firmtier.textContent = scene.firmCard.tier;
    this.el.firmroute.textContent = scene.firmCard.route;
    this.el.firmfilled.textContent = scene.facts.length;
    this.el.firmasked.textContent = scene.remaining.length;
    this.el.firm.classList.add('is-in');
    this.caption('The lead sees a range. The firm sees a tier, a route, and every answer behind it.');
    this.setActUI(2);
  };

  /* ------------------------------------------------------------------ boot */

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-theater]');
    if (!root) return;
    window.qaTheater = new Theater(root);
  });
})();
