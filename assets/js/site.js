// Light / dark mode switch (moon / sun button beside the menu icon)
(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  var root = document.documentElement;
  var fadeTimer;
  function label() {
    btn.setAttribute('aria-label', root.getAttribute('data-theme') === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  label();
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var dark = root.getAttribute('data-theme') !== 'dark';
    function apply() {
      if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      label();
    }
    try { localStorage.setItem('theme-choice', dark ? 'dark' : 'light'); } catch (err) {}

    // Slow, gentle fade: every colour on the page eases to its new value
    // together, in place. Photos never change, and nothing is lifted out of
    // the page, so nothing can show through the header or pop at the end.
    clearTimeout(fadeTimer);
    root.classList.add('theme-fading');
    void root.offsetWidth;
    apply();
    fadeTimer = setTimeout(function () { root.classList.remove('theme-fading'); }, 1600);
  });
})();

// Drop-down menu (top right)
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;
  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
  }
  var hoverOpenedAt = 0;
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    // a click right after hovering opened it shouldn't immediately close it
    if (Date.now() - hoverOpenedAt < 600) return;
    setOpen(!nav.classList.contains('open'));
  });
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // With a mouse or trackpad (computers, and iPads with a trackpad), open when
  // the pointer moves over the menu icon and close shortly after it leaves
  // both the icon and the menu. Finger taps are ignored here and use the
  // click handler above instead.
  var closeTimer;
  [toggle, nav].forEach(function (el) {
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(closeTimer);
      if (!nav.classList.contains('open')) hoverOpenedAt = Date.now();
      setOpen(true);
    });
    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      closeTimer = setTimeout(function () { setOpen(false); }, 250);
    });
  });
})();

// Full-screen photo viewer (click a photo to open; arrows / swipe to browse)
(function () {
  var links = [];

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML =
    '<button class="lb-close" aria-label="Close">&times;</button>' +
    '<div class="lb-stage">' +
      '<button class="lb-prev" aria-label="Previous">&#8249;</button>' +
      '<figure class="lb-figure"><img alt=""><figcaption class="lightbox-caption"></figcaption><div class="lb-panel"></div></figure>' +
      '<button class="lb-more" type="button" aria-label="Show details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg></button>' +
      '<button class="lb-next" aria-label="Next">&#8250;</button>' +
    '</div>';
  document.body.appendChild(box);

  var img = box.querySelector('img');
  var stage = box.querySelector('.lb-stage');

  // A soft glow of the photo's own colours behind it (left, middle and
  // right of the photo), fading between photos as you go through them
  var glow = document.createElement('div');
  glow.className = 'lb-glow';
  box.insertBefore(glow, box.firstChild);
  var gCanvas = document.createElement('canvas'); gCanvas.width = 12; gCanvas.height = 8;
  var gCtx = gCanvas.getContext('2d', { willReadFrequently: true });
  function setGlow(el) {
    var d;
    try { gCtx.clearRect(0, 0, 12, 8); gCtx.drawImage(el, 0, 0, 12, 8); d = gCtx.getImageData(0, 0, 12, 8).data; } catch (e) { return; }
    function avg(x0, x1, y0, y1) {
      var r = 0, g = 0, b = 0, n = 0;
      for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) { var k = (y * 12 + x) * 4; r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
      r /= n; g /= n; b /= n;
      // a little richer and never too dark or too bright, so it reads as a glow
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
      var lift = Math.max(70, Math.min(170, l)) - l;
      var mid = (r + g + b) / 3;
      r = mid + (r - mid) * 1.35 + lift; g = mid + (g - mid) * 1.35 + lift; b = mid + (b - mid) * 1.35 + lift;
      var c = function (v) { return Math.round(Math.max(0, Math.min(255, v))); };
      return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
    }
    glow.style.setProperty('--g1', avg(0, 4, 0, 8));
    glow.style.setProperty('--g2', avg(8, 12, 0, 8));
    glow.style.setProperty('--g3', avg(3, 9, 2, 6));
    glow.classList.add('on');
  }
  img.addEventListener('load', function () { setGlow(img); });
  var caption = box.querySelector('.lightbox-caption');
  var panel = box.querySelector('.lb-panel');
  var more = box.querySelector('.lb-more');
  var foot = document.createElement('div');
  foot.className = 'lb-foot';
  box.appendChild(foot);
  // a link in it (Instagram, email...) closes the viewer first
  foot.addEventListener('click', function () {
    box.classList.add('instant'); box.classList.remove('open', 'shop-mode');
    document.body.style.overflow = '';
    stage.style.transform = '';
    setTimeout(function () { box.classList.remove('instant'); }, 50);
  });
  more.addEventListener('click', function () { scrollTo(1); });
  var index = 0;

  // Shop items: no arrows or name; instead a box like the menu sits under
  // the photo with a description, how many to add, the price for that many
  // and ADD TO CART.
  function money(n) { return ((window.SHOP && window.SHOP.currency) || '$') + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0); }
  // Prints also get a SIZE drop-down along the bottom of the box (the sizes
  // and their prices are set in _config.yml); the price follows the size.
  function buildPanel(link) {
    var d = link.dataset, unit = parseFloat(d.price) || 0, qty = 1;
    var sizes = link.hasAttribute('data-sizes') && window.SHOP && window.SHOP.sizes || [];
    // prints also come on a choice of papers (PAPER, under SIZE)
    var papers = sizes.length && window.SHOP && window.SHOP.papers || [];
    var lists = { size: sizes, paper: papers }, pick = { size: sizes[0] || null, paper: papers[0] || null };
    function menu(key, label) {
      return '<div class="lb-size" data-pick="' + key + '">' +
        '<button type="button" class="lb-size-btn" aria-haspopup="listbox" aria-expanded="false">' +
          '<span>' + label + '</span><span class="lb-size-val"></span>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="lb-size-list" role="listbox"></div>' +
      '</div>';
    }
    panel.innerHTML =
      '<div class="lb-panel-title"></div><p class="lb-panel-desc"></p>' +
      '<div class="lb-panel-row">' +
        '<div class="lb-qty"><button type="button" data-q="-1" aria-label="One fewer">\u2212</button><span>1</span><button type="button" data-q="1" aria-label="One more">+</button></div>' +
        '<div class="lb-panel-price"></div>' +
        '<button type="button" class="lb-panel-add"><span>ADD TO CART</span></button>' +
      '</div>' +
      (sizes.length ? menu('size', 'SIZE') : '') +
      (papers.length ? menu('paper', 'PAPER') : '');
    panel.querySelector('.lb-panel-title').textContent = d.title || '';
    panel.querySelector('.lb-panel-desc').textContent = d.desc || '';
    var qtyEl = panel.querySelector('.lb-qty span'), priceEl = panel.querySelector('.lb-panel-price');
    var boxes = Array.prototype.slice.call(panel.querySelectorAll('.lb-size'));
    boxes.forEach(function (b) {
      var key = b.dataset.pick, list = b.querySelector('.lb-size-list');
      lists[key].forEach(function (o, i) {
        var el = document.createElement('button');
        el.type = 'button'; el.className = 'lb-size-opt'; el.setAttribute('role', 'option'); el.dataset.i = i;
        el.innerHTML = '<span></span><span></span>';
        var add = parseFloat(o.price) || 0;
        el.firstChild.textContent = key === 'size' ? o.size + ' in' : o.name;
        el.lastChild.textContent = key === 'size' ? money(add) : (add ? '+' + money(add) : '');
        list.appendChild(el);
      });
    });
    function update() {
      if (pick.size) unit = (parseFloat(pick.size.price) || 0) + (pick.paper ? parseFloat(pick.paper.price) || 0 : 0);
      qtyEl.textContent = qty;
      priceEl.textContent = link.hasAttribute('data-sold-out') ? 'Sold out' : money(unit * qty);
      if (box.classList.contains('open')) sizePanel();
      boxes.forEach(function (b) {
        var key = b.dataset.pick;
        b.querySelector('.lb-size-val').textContent = key === 'size' ? pick.size.size + ' IN' : pick.paper.name.toUpperCase();
        Array.prototype.forEach.call(b.querySelectorAll('.lb-size-opt'), function (o) {
          o.setAttribute('aria-selected', lists[key][o.dataset.i] === pick[key] ? 'true' : 'false');
        });
      });
    }
    function sizeMenu(b, open) {
      boxes.forEach(function (x) {
        var on = x === b && open;
        x.classList.toggle('open', on);
        x.querySelector('.lb-size-btn').setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    }
    update();
    if (link.hasAttribute('data-sold-out')) {
      panel.querySelector('.lb-panel-add').hidden = true; panel.querySelector('.lb-qty').hidden = true;
      boxes.forEach(function (b) { b.hidden = true; });
    }
    panel.onclick = function (e) {
      var q = e.target.closest('[data-q]');
      if (q) { qty = Math.max(1, Math.min(99, qty + parseInt(q.dataset.q, 10))); update(); return; }
      var btn = e.target.closest('.lb-size-btn');
      if (btn) { sizeMenu(btn.parentNode, !btn.parentNode.classList.contains('open')); return; }
      var opt = e.target.closest('.lb-size-opt');
      if (opt) { var key = opt.closest('.lb-size').dataset.pick; pick[key] = lists[key][opt.dataset.i]; update(); sizeMenu(null, false); return; }
      sizeMenu(null, false);
      if (e.target.closest('.lb-panel-add') && window.eyeseercCart) {
        var slug = function (t) { return '-' + String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
        var sid = (pick.size ? slug(pick.size.size) : '') + (pick.paper ? slug(pick.paper.name) : '');
        var title = (d.title || '') + (pick.size ? ' \u2014 ' + pick.size.size + ' in' : '') + (pick.paper ? ', ' + pick.paper.name.toLowerCase() + ' paper' : '');
        // (the cart slides in over the print, which stays open behind it)
        window.eyeseercCart.add({ id: d.id + sid, title: title, price: unit, image: d.image, variant: d.variant || '' }, qty);
      }
    };
  }
  // ADD TO CART keeps clear space on both sides of its words: where the box
  // is narrow (or a browser draws the letters wider) the letters close up a
  // little until they fit
  function fitAdd() {
    var b = panel.querySelector('.lb-panel-add');
    if (!b || !b.firstChild || !b.offsetWidth) return;
    var steps = [null, '.12em', '.1em', '.08em', '.06em', '.04em', '.02em'];
    for (var i = 0; i < steps.length; i++) {
      b.style.letterSpacing = steps[i] || '';
      if (b.firstChild.offsetWidth + 22 <= b.clientWidth) return;
    }
  }
  window.addEventListener('resize', fitAdd);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAdd);
  // the box is exactly as wide as the photo
  function sizePanel() {
    if (!box.classList.contains('shop-mode')) return;
    var t = img.style.transform; img.style.transform = '';
    var w = img.getBoundingClientRect().width;
    panel.style.width = w + 'px';
    img.style.transform = t;
    // ...but never so narrow that ADD TO CART loses its clear space either
    // side (measured, since browsers draw the letters at different widths):
    // under a tall, narrow photo the box is a little wider than the photo
    var b = panel.querySelector('.lb-panel-add');
    minPanel = 0;
    if (b && b.firstChild && b.clientWidth) {
      b.style.letterSpacing = '';
      minPanel = Math.min(panel.offsetWidth - b.clientWidth + b.firstChild.offsetWidth + 2 * 18, window.innerWidth - 16);
      if (minPanel > w) panel.style.width = minPanel + 'px';
    }
    // (phones: the stack sets the width from here on, keeping to the same minimum)
    if (deckCards.length && deckShown) placeDeck(Math.min(1, prog));
    fitAdd();
  }
  var minPanel = 0;
  window.addEventListener('resize', sizePanel);
  // a click anywhere else in the viewer closes an open SIZE list
  box.addEventListener('click', function (e) {
    Array.prototype.forEach.call(panel.querySelectorAll('.lb-size.open'), function (open) {
      if (!open.contains(e.target)) { open.classList.remove('open'); open.querySelector('.lb-size-btn').setAttribute('aria-expanded', 'false'); }
    });
  }, true);

  // ---- Shop items: more photos stacked behind the main one ----
  // Once the details are showing, the item's other photos (up to 4) fade in
  // as a stack peeking out to the right of the main photo. The arrow on the
  // right, a tap on a photo, a sideways swipe or the arrow keys move through
  // them: the front photo slides over to the left and stays stacked there
  // while the next comes forward from the right (and back again the other
  // way). Tapping the front photo brings the big view back, as before.
  var figure = box.querySelector('.lb-figure');
  var deck = document.createElement('div');
  deck.className = 'lb-deck';
  figure.insertBefore(deck, panel);
  var deckNext = document.createElement('button');
  deckNext.type = 'button'; deckNext.className = 'lb-deck-next'; deckNext.setAttribute('aria-label', 'Next photo');
  deckNext.innerHTML = '&#8250;';
  // and one to go back, on the left, once there's a photo over there
  var deckPrev = document.createElement('button');
  deckPrev.type = 'button'; deckPrev.className = 'lb-deck-next lb-deck-prev'; deckPrev.setAttribute('aria-label', 'Previous photo');
  deckPrev.innerHTML = '&#8249;';
  var deckCards = [], front = 0, deckShown = 0, deckBusy = false, swingCard = null, swingZ = 0;
  function setupDeck(link) {
    deck.innerHTML = ''; deckCards = []; front = 0; deckShown = 0; deckBusy = false;
    deck.style.opacity = 0; deck.style.pointerEvents = 'none'; img.style.opacity = ''; img.style.pointerEvents = '';
    var extra = link && link.dataset.more ? link.dataset.more.split('|').filter(Boolean).slice(0, 4) : [];
    if (!extra.length) return;
    [link.href].concat(extra).forEach(function (src) {
      var c = document.createElement('img');
      c.className = 'lb-card'; c.alt = ''; c.draggable = false; c.src = src;
      deck.appendChild(c); deckCards.push(c);
    });
    deck.appendChild(deckNext); deck.appendChild(deckPrev);
    // start on the first photo: no left arrow yet (never a flash of one)
    deckPrev.classList.add('hide'); deckNext.classList.remove('hide');
  }
  // room beside the photo for the stack, and how far apart its edges sit
  function deckRoom() {
    var right = geo ? window.innerWidth - geo.F.right - 8 : 60;
    var left = geo ? geo.F.left - 8 : 60;
    var n = deckCards.length;
    var step = Math.max(7, Math.min(24, Math.min(left, right) / Math.max(1, n - 1)));
    // narrow screens: the front photo shrinks so the edges fit on both sides
    var over = Math.max(0, (n - 1) * step - Math.min(left, right));
    if (window.innerWidth <= 760) {
      // phones: each photo behind sticks out a clear 9px, the whole stack
      // just fits the screen, and the arrows sit at its outer edges
      var W = img.offsetWidth || 1;
      var k = Math.min(1, (window.innerWidth / 2 - (n - 1) * 9 - 18) / (W / 2));
      step = 9 / k; over = (1 - k) * W / 2;
    }
    return { step: step, over: over, right: right, left: left };
  }
  // a card's place: d = 0 in front, d > 0 waiting on the right, d < 0
  // already seen, on the left; smaller and darker the further back it is
  function pose(d, room) {
    var W = deck.offsetWidth || 1, a = Math.abs(d), sc = 1 - a * 0.045;
    var x = d * room.step + (d > 0 ? 1 : -1) * (1 - sc) * W / 2;
    if (!a) x = 0;
    return { transform: 'translateX(' + x + 'px) scale(' + sc + ')', x: x, sc: sc,
             filter: a ? 'brightness(' + (1 - a * 0.12) + ')' : 'none', z: deckCards.length - a };
  }
  function layoutCards() {
    var room = deckRoom(), n = deckCards.length;
    deckCards.forEach(function (c, k) {
      var d = k - front, ps = pose(d, room);
      c.style.transform = ps.transform; c.style.filter = ps.filter; c.style.zIndex = ps.z;
      c.style.opacity = d === 0 ? 1 : deckShown;
    });
    // a photo that's still swinging away keeps the layer it's meant to be on
    if (swingCard) swingCard.style.zIndex = swingZ;
    // the arrows stay put (no chasing them): just past the furthest the
    // stack ever reaches when there's room, otherwise on the photo's edge
    // in a little circle. The left one only shows once a photo is over there.
    var W = deck.offsetWidth, reach = (n - 1) * room.step;
    var phone = window.innerWidth <= 760;
    var outside = phone || room.right - room.over / 2 - reach > 46;
    deckNext.classList.toggle('inside', !outside);
    deckNext.style.left = (phone ? W + reach - 26 : outside ? W + reach + 8 : W - 44) + 'px';
    deckNext.style.zIndex = n + 1;
    deckNext.classList.toggle('hide', front >= n - 1);
    var loutside = phone || room.left - room.over / 2 - reach > 46;
    deckPrev.classList.toggle('inside', !loutside);
    deckPrev.style.left = (phone ? -reach - 10 : loutside ? -reach - 44 : 8) + 'px';
    deckPrev.style.zIndex = n + 1;
    deckPrev.classList.toggle('hide', front <= 0);
  }
  // keeps the stack lined up with the (hidden) main photo as it moves
  function placeDeck(p) {
    if (!deckCards.length) return;
    var show = Math.max(0, Math.min(1, (p - 0.7) / 0.3));
    deck.style.left = img.offsetLeft + 'px'; deck.style.top = img.offsetTop + 'px';
    deck.style.width = img.offsetWidth + 'px'; deck.style.height = img.offsetHeight + 'px';
    var W = img.offsetWidth || 1, over = deckRoom().over * show;
    deckK = 1 - 2 * over / W;
    deck.style.transform = (img.style.transform || '') + ' scale(' + deckK + ')';
    // phones: the details box stays exactly as wide as the (smaller) front photo
    if (window.innerWidth <= 760) { panel.style.width = Math.max(W - 2 * over, minPanel) + 'px'; if (show !== deckShown) fitAdd(); }
    deck.style.opacity = show ? 1 : 0;
    deck.style.pointerEvents = show > 0.9 ? 'auto' : 'none';
    img.style.opacity = show ? 0 : '';
    // the hidden photo underneath is bigger than the (scaled) stack on phones:
    // it mustn't catch taps meant for the empty space around the stack
    img.style.pointerEvents = show ? 'none' : '';
    if (show !== deckShown) { deckShown = show; layoutCards(); }
  }
  function deckActive() { return shopOpen() && deckCards.length > 1 && deckShown > 0.9; }
  // move through the photos by m places (+ forward, - back); stops at the ends
  // (quick clicks each count: the slide just carries on to the newest spot)
  // Moving to the next (or previous) photo, like taking the top photo off a
  // pile: the front photo swings out to the side (going on: to the left;
  // going back: to the right) while the next one grows into the middle
  // underneath it, then the old one tucks in behind onto its pile. The
  // middle is always covered, so only ever one photo after the other.
  // With a thumb the front photo follows the thumb; the arrows, taps and
  // keys play the same move by themselves, slow-fast-slow.
  var deckK = 1, settleTimer, swing = null, swapTimer;
  // stop a swing that's still going, leaving that photo where it is now
  function freezeSwing() {
    clearTimeout(swapTimer); swingCard = null;
    if (!swing) return;
    var c = swing.effect && swing.effect.target;
    if (c) {
      var t = getComputedStyle(c).transform;
      swing.cancel();
      c.style.transition = 'none'; c.style.transform = t; void c.offsetWidth; c.style.transition = '';
    } else swing.cancel();
    swing = null;
  }
  function rotate(m, done, fromDrag) {
    var n = deckCards.length;
    var to = Math.max(0, Math.min(n - 1, front + m));
    if (to === front) { if (done) done(); return; }
    freezeSwing();
    clearTimeout(settleTimer);
    var was = front, room = deckRoom(), W = deck.offsetWidth, dir = to > was ? 1 : -1;
    var old = deckCards[was];
    var startT = fromDrag ? getComputedStyle(old).transform : pose(0, room).transform;
    deck.classList.add('stepping'); // the same smooth move as the arrows, after a swipe too
    front = to;
    if (deckCards[front] && deckCards[front].complete) setGlow(deckCards[front]);
    layoutCards();
    if (Math.abs(to - was) === 1 && old.animate) {
      var end = pose(was - to, room);
      // out to the side until it's completely clear of the new front photo
      // (so nothing overlaps when it goes behind), then back in behind onto
      // its pile
      var out = 'translateX(' + (-dir * W * 1.06) + 'px) scale(.93) rotate(' + (-dir * 3) + 'deg)';
      var bell = 'cubic-bezier(.37, 0, .63, 1)';
      var dur = fromDrag ? 1000 : 1100;
      swing = old.animate([
        // (after a swipe it's already moving, so it carries on from the thumb's speed)
        { transform: startT, filter: 'none', easing: fromDrag ? 'cubic-bezier(.3, .35, .5, 1)' : bell },
        { transform: out, filter: 'none', offset: 0.48, easing: 'linear' },
        { transform: out, filter: end.filter, offset: 0.5, easing: bell },
        { transform: end.transform, filter: end.filter }
      ], { duration: dur, easing: 'linear' });
      // which photo is on top is switched by the clock, not inside the
      // animation (Safari can't animate that): the old photo stays on top
      // while it leaves, and only goes behind once it's out in the clear
      swingCard = old; swingZ = n + 1; old.style.zIndex = swingZ;
      swapTimer = setTimeout(function () { swingZ = end.z; old.style.zIndex = swingZ; }, dur * 0.49);
      var me = swing;
      swing.onfinish = function () { me.cancel(); if (swing === me) { swing = null; swingCard = null; } };
    }
    settleTimer = setTimeout(function () { deck.classList.remove('stepping'); }, 1120);
    if (done) setTimeout(done, 1120);
  }
  // thumb dragging: the front photo follows the thumb; the photo it uncovers
  // (the next one going left, the previous one going right) grows into the
  // middle underneath
  function dragDeck(dx) {
    dx = dx / (deckK || 1); // (phones draw the stack a little smaller: stay under the thumb)
    var n = deckCards.length, room = deckRoom(), W = deck.offsetWidth || 1;
    // at the ends it doesn't move at all: the first photo can't be pulled
    // back and the last one can't be pulled on
    if ((dx < 0 && front >= n - 1) || (dx > 0 && front <= 0)) dx = 0;
    freezeSwing();
    clearTimeout(settleTimer);
    deck.classList.remove('stepping');
    deck.classList.add('dragging');
    var dir = dx < 0 ? 1 : dx > 0 ? -1 : 0;
    var p = Math.min(1, Math.abs(dx) / (W * 0.6));
    deckCards.forEach(function (c, k) {
      var d = k - front, ps;
      if (d === 0) {
        c.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / W * 6) + 'deg)';
        c.style.filter = 'none'; c.style.zIndex = n + 1;
        return;
      }
      if (dir && d === dir) {
        // the photo being uncovered: right under the dragged one (so it's the
        // only one that shows), and it only starts to come forward - the
        // rest of its move plays after letting go, like the arrows
        ps = pose(d * (1 - p * 0.3), room);
        c.style.transform = ps.transform; c.style.filter = ps.filter; c.style.zIndex = n;
        return;
      }
      ps = pose(d, room);
      c.style.transform = ps.transform; c.style.filter = ps.filter; c.style.zIndex = ps.z;
    });
  }
  function releaseDeck(dx, vx) {
    deck.classList.remove('dragging');
    var W = (deck.offsetWidth || 1) * (deckK || 1), n = deckCards.length;
    var can = (dx < 0 && front < n - 1) || (dx > 0 && front > 0);
    if (can && (Math.abs(dx) > W * 0.15 || (Math.abs(dx) > 16 && Math.abs(vx) > 0.2))) {
      rotate(dx < 0 ? 1 : -1, null, true);
      return;
    }
    layoutCards(); // not far enough: it springs back to the middle
  }


  // a double click on the stack or its arrows mustn't select the page
  box.addEventListener('mousedown', function (e) { if (e.detail > 1) e.preventDefault(); });
  deckNext.addEventListener('click', function (e) { e.stopPropagation(); if (deckActive()) rotate(1); });
  deckPrev.addEventListener('click', function (e) { e.stopPropagation(); if (deckActive()) rotate(-1); });
  deck.addEventListener('click', function (e) {
    var c = e.target.closest('.lb-card');
    if (!c || !deckActive()) return;
    e.stopPropagation();
    var d = deckCards.indexOf(c) - front;
    if (d) { rotate(d); return; }
    // the front photo: that photo goes big; scrolling down again comes back
    // to the stack just as it was
    minStep = 0;
    if (img.src === c.src) { scrollTo(0); return; }
    img.src = c.src;
    var grow = function () { sizePanel(); shopGeo(); applyProg(); scrollTo(0); };
    if (img.decode) img.decode().then(grow, grow); else grow();
  });
  window.addEventListener('resize', function () { if (deckCards.length) layoutCards(); });

  function show(i) {
    index = (i + links.length) % links.length;
    img.src = links[index].href;
    img.alt = links[index].dataset.caption || '';
    caption.textContent = links[index].dataset.caption || '';
  }
  // Animate the big photo between its spot in the gallery and the centre
  // of the screen, so it looks like the clicked photo lifts up and grows.
  // the tile's exact box on the page (the link around the photo; the photo
  // inside can be slightly enlarged by its hover effect, so it isn't used)
  function thumbRect() {
    var t = links[index];
    var r = t && t.getBoundingClientRect();
    var onScreen = r && r.width && r.bottom > 0 && r.top < window.innerHeight;
    return onScreen ? r : null;
  }
  // Animate the big photo between its tile and the centre of the screen. The
  // photo is scaled to cover the tile and cropped to the tile's shape, so at
  // the small end it matches the tile exactly, whatever the photo's shape.
  function flip(from, reverse, tucked) {
    // measure the photo's own box (without any resting transform), and end
    // the animation on whatever transform it rests at (shop items rest big)
    var base = img.style.transform;
    img.style.transform = '';
    var to = img.getBoundingClientRect();
    img.style.transform = base;
    if (!from || !to.width || !to.height || !img.animate) return null;
    var scale = Math.max(from.width / to.width, from.height / to.height);
    var cropX = Math.max(0, (to.width - from.width / scale) / 2);
    var cropY = Math.max(0, (to.height - from.height / scale) / 2);
    var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
    // tucked: how much of the tile's top is hidden under the sticky header;
    // the photo starts trimmed at the header line and grows out over it
    var hideTop = tucked ? tucked / scale : 0;
    var small = { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')',
                  clipPath: 'inset(' + (cropY + hideTop) + 'px ' + cropX + 'px ' + cropY + 'px)' };
    var big = { transform: base || 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px)' };
    var frames = reverse ? [big, small] : [small, big];
    // closing holds the last frame, so the photo stays in its tile's spot
    // until the viewer is gone (instead of jumping back to full size)
    return img.animate(frames,
      { duration: 380, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: reverse ? 'forwards' : 'none' });
  }

  // When the photo's tile is partly tucked under the sticky header, the
  // header is lifted above the viewer while the photo grows out of / shrinks
  // back into the tile, so the photo always passes underneath it, exactly
  // as the tile does. The header is dimmed and blurred to match the viewer's
  // backdrop and that fades in step, so lifting it doesn't show.
  function headerLift(closing) {
    var tile = thumbRect(), header = document.querySelector('.site-header');
    if (!tile || !header || !header.animate) return null;
    if (tile.top >= header.getBoundingClientRect().bottom) return null;
    var dim = header.querySelector('.header-dim');
    if (!dim) { dim = document.createElement('span'); dim.className = 'header-dim'; header.appendChild(dim); }
    header.classList.add('lb-lift');
    var timing = { duration: closing ? 350 : 380, easing: closing ? 'ease' : 'cubic-bezier(.2, .7, .2, 1)', fill: 'both' };
    // only the header's contents are blurred (blurring the header itself
    // would switch off its frosted background for a moment)
    var anims = [dim.animate([{ opacity: 1 }, { opacity: 0 }], timing)];
    Array.prototype.forEach.call(header.querySelectorAll('.brand, .header-actions'), function (el) {
      anims.push(el.animate([{ filter: 'blur(14px)' }, { filter: 'blur(0px)' }], timing));
    });
    var a = anims[0];
    if (!closing) anims.forEach(function (x) { x.reverse(); });
    var finished = false;
    function done() {
      if (finished) return; finished = true;
      anims.forEach(function (x) { x.cancel(); }); header.classList.remove('lb-lift');
    }
    // opening: once the viewer has fully covered the page, the header drops
    // back underneath it; closing: once the viewer is gone
    if (!closing) a.onfinish = done;
    else setTimeout(done, 600);
    return { done: done };
  }

  // Shop items open as big as on the Photography page. Scrolling (wheel,
  // swipe up, arrow keys) then shrinks the photo and lifts it, and the
  // details box fades in underneath; it stops once the photo reaches the
  // size where the box fits below it. Scrolling back reverses it.
  var prog = 0, target = 0, geo = null, raf = null;
  function shopGeo() {
    img.style.transform = ''; panel.style.transform = '';
    var F = img.getBoundingClientRect(), P = panel.getBoundingClientRect();
    var nw = img.naturalWidth || F.width, nh = img.naturalHeight || F.height;
    var wide = window.innerWidth > 760;
    var maxW = wide ? window.innerWidth - 160 : window.innerWidth - 24;
    var maxH = (wide ? 0.84 : 0.78) * window.innerHeight;
    var k = Math.min(maxW / nw, maxH / nh);
    geo = {
      F: F,
      s: (nw * k) / F.width,
      ox: window.innerWidth / 2 - (F.left + F.width / 2),
      oy: window.innerHeight / 2 - (F.top + F.height / 2),
      D: 160, // a short flick or one thumb swipe is enough
      Ph: P.height,
      gap: P.top - F.bottom
    };
  }
  // scrolling on to the bottom of the page: everything moves up and the
  // footer (links and copyright) comes in
  function applyFoot(p2) {
    var fh = foot.offsetHeight;
    stage.style.transform = p2 ? 'translateY(' + (-p2 * fh) + 'px)' : '';
    foot.style.transform = 'translateY(' + ((1 - p2) * 100) + '%)';
    foot.style.opacity = p2;
    foot.style.pointerEvents = p2 > 0.6 ? '' : 'none';
  }
  function applyProg() {
    // Photography / Projects: one step, photo -> footer, the photo keeps its size
    if (!box.classList.contains('shop-mode')) { applyFoot(prog); return; }
    if (!geo) return;
    // shop items: photo -> details -> footer
    applyFoot(Math.max(0, prog - 1));
    var p = Math.min(1, prog), s = geo.s * (1 - p) + p, ox = geo.ox * (1 - p), oy = geo.oy * (1 - p);
    img.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + s + ')';
    var bottom = geo.F.top + geo.F.height / 2 + oy + geo.F.height * s / 2;
    // the box's top always peeks up from the bottom of the screen (tucked
    // just behind the photo if they meet), fading away downward, so you can
    // tell there's more; it comes fully into view as you scroll
    var top = Math.min(bottom, window.innerHeight - 58 - geo.gap); /* the top of the box peeks up */
    panel.style.transform = 'translateY(' + (top - geo.F.bottom) + 'px)';
    var shown = 16 + p * geo.Ph;
    var mask = p > 0.97 ? '' : 'linear-gradient(to bottom, #000 ' + shown + 'px, transparent ' + (shown + 34) + 'px)';
    panel.style.webkitMaskImage = mask; panel.style.maskImage = mask;
    panel.style.opacity = 0.55 + 0.45 * Math.min(1, p / 0.7);
    panel.style.pointerEvents = p > 0.6 ? '' : 'none';
    // the little arrow fades away as soon as you start scrolling
    more.style.opacity = Math.max(0, 1 - p * 3.5);
    more.style.pointerEvents = p > 0.2 ? 'none' : '';
    placeDeck(p);
  }
  function step() {
    prog += (target - prog) * 0.2;
    if (Math.abs(target - prog) < 0.002) prog = target;
    applyProg();
    raf = prog === target ? null : requestAnimationFrame(step);
  }
  // once the details have been revealed they stay: scrolling back up only
  // goes back as far as the details, never to the big photo again
  var minStep = 0;
  function maxStep() { return box.classList.contains('shop-mode') ? 2 : 1; }
  function scrollTo(t) {
    if (t >= 1 && box.classList.contains('shop-mode')) minStep = 1;
    target = Math.max(minStep, Math.min(maxStep(), t));
    if (!raf) raf = requestAnimationFrame(step);
  }
  function shopOpen() { return box.classList.contains('open') && box.classList.contains('shop-mode') && geo; }
  function viewerOpen() { return box.classList.contains('open') && (geo || !box.classList.contains('shop-mode')); }
  // tapping the photo once the details are showing brings it back up big
  // (the only way back: scrolling up doesn't)
  img.addEventListener('click', function () {
    if (!shopOpen() || target < 1) return;
    minStep = 0;
    scrollTo(0);
  });
  // One wheel / trackpad gesture moves one step (photo -> details -> footer),
  // however long its momentum keeps going; it then glides to that step.
  var gesture = null, gestureTimer;
  box.addEventListener('wheel', function (e) {
    // the page behind never scrolls and the browser never zooms; the wheel /
    // trackpad steps through the viewer instead (Photography / Projects:
    // photo -> footer; shop items: photo -> details -> footer)
    if (!box.classList.contains('open')) return;
    e.preventDefault();
    if (!viewerOpen() || sliding) return;
    // a trackpad pinch (Chrome sends it as a wheel with ctrl) zooms
    if (e.ctrlKey && canZoom()) { mag.classList.remove('show'); zoomTo(zs * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY, false); return; }
    // zoomed in: two-finger scrolling moves around the photo instead
    if (zs > 1) { panBy(-(e.deltaX || 0), -(e.deltaY || 0), false); return; }
    // a sideways trackpad swipe on a shop item's stack turns it, once per swipe
    if (deckActive() && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (!sideGesture) { sideGesture = { acc: 0, fired: false }; }
      sideGesture.acc += e.deltaX;
      if (!sideGesture.fired && Math.abs(sideGesture.acc) > 30) { sideGesture.fired = true; rotate(sideGesture.acc > 0 ? 1 : -1); }
      clearTimeout(sideTimer);
      sideTimer = setTimeout(function () { sideGesture = null; }, 220);
      return;
    }
    var d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (!d) return;
    var dir = d > 0 ? 1 : -1;
    if (!gesture || gesture.dir !== dir) {
      var from = Math.round(target);
      gesture = { dir: dir, stop: Math.max(minStep, Math.min(maxStep(), from + dir)) };
    }
    var t = target + d / (geo ? geo.D : 160);
    scrollTo(dir > 0 ? Math.min(t, gesture.stop) : Math.max(t, gesture.stop));
    clearTimeout(gestureTimer);
    gestureTimer = setTimeout(function () { gesture = null; }, 220);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { if (gesture) scrollTo(gesture.stop); }, 90);
  }, { passive: false });
  var wheelTimer, sideGesture = null, sideTimer;
  // Safari's trackpad pinch: don't let it zoom the page while the viewer is open
  // (Safari's trackpad pinch zooms the photo, never the page)
  var gestureZ = 1;
  box.addEventListener('gesturestart', function (e) { if (box.classList.contains('open')) { e.preventDefault(); gestureZ = zs; } });
  box.addEventListener('gesturechange', function (e) {
    if (!box.classList.contains('open')) return;
    e.preventDefault();
    if (canZoom() && e.scale) { mag.classList.remove('show'); zoomTo(gestureZ * e.scale, e.clientX, e.clientY, false); }
  });
  var swipe = null, D_touch = 110;
  box.addEventListener('touchstart', function (e) {
    if (!viewerOpen() || e.touches.length !== 1 || e.target.closest('button') || zs > 1) return;
    swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: target, axis: null };
    D_touch = 110;
  }, { passive: true });
  box.addEventListener('touchmove', function (e) {
    if (!swipe || !viewerOpen()) return;
    if (zs > 1 || e.touches.length > 1) { swipe = null; return; } // (zooming / moving around a zoomed photo)
    // Photography / Projects: sideways swipes still browse the photos; only
    // up / down swipes move to the footer
    if (!swipe.axis) {
      var ax = Math.abs(e.touches[0].clientX - swipe.x), ay = Math.abs(e.touches[0].clientY - swipe.y);
      if (ax < 6 && ay < 6) return;
      swipe.axis = ay > ax ? 'y' : 'x';
    }
    if (swipe.axis === 'x' && deckActive()) {
      e.preventDefault();
      var now = Date.now(), x = e.touches[0].clientX;
      if (swipe.lt) swipe.vx = (x - swipe.lx) / Math.max(1, now - swipe.lt);
      swipe.lx = x; swipe.lt = now;
      swipe.dx = x - swipe.x;
      dragDeck(swipe.dx);
      return;
    }
    if (swipe.axis !== 'y' && !box.classList.contains('shop-mode')) { swipe = null; return; }
    e.preventDefault();
    scrollTo(swipe.t + (swipe.y - e.touches[0].clientY) / D_touch);
  }, { passive: false });
  function touchDone() {
    if (!swipe) return;
    if (swipe.axis === 'x' && deckActive()) {
      releaseDeck(swipe.dx || 0, swipe.vx || 0);
      swipe = null; return;
    }
    // let go and it finishes on its own: past a small nudge it goes all the way
    var moved = target - swipe.t;
    if (Math.abs(moved) > 0.08) scrollTo(moved > 0 ? Math.ceil(target - 0.001) : Math.floor(target + 0.001));
    else scrollTo(Math.round(swipe.t));
    swipe = null;
  }
  box.addEventListener('touchend', touchDone);
  // iPhone Safari sometimes cancels a quick sideways swipe instead of ending
  // it; finish it the same way (otherwise the photo was left stuck mid-drag)
  box.addEventListener('touchcancel', touchDone);
  window.addEventListener('resize', function () { if (shopOpen()) { sizePanel(); shopGeo(); applyProg(); } });

  function open(i) {
    show(i);
    var from = thumbRect();
    // the photo stays out of sight until its opening animation starts
    if (from) img.style.visibility = 'hidden';
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    var go = function () {
      sizePanel();
      if (box.classList.contains('shop-mode')) {
        var siteFoot = document.querySelector('.site-footer');
        foot.innerHTML = siteFoot ? siteFoot.innerHTML : '';
        shopGeo(); prog = target = 0; minStep = 0; applyProg();
      } else {
        geo = null; panel.style.transform = ''; panel.style.opacity = '';
      }
      img.style.visibility = '';
      // a tile partly under the header: the photo opens from the header line
      // up over it (the viewer's backdrop dims the header as it goes), so the
      // header never sits on top of the photo and then drops behind it
      var header = document.querySelector('.site-header');
      var tucked = from && header ? Math.max(0, Math.min(from.height, header.getBoundingClientRect().bottom - from.top)) : 0;
      if (!flip(from, false, tucked) && img.animate) {
        img.animate([{ transform: 'scale(.9)' }, { transform: 'none' }],
          { duration: 300, easing: 'ease-out' });
      }
    };
    if (img.decode) img.decode().then(go, go); else go();
  }
  // going to another page (VIEW CART in the cart, the cart icon...) while
  // a photo is open: it closes (back into its tile) as the new page loads
  document.addEventListener('pageswap:start', function () { if (box.classList.contains('open')) close(); });
  function close() {
    if (sliding) return;
    resetZoom(false);
    if (box.classList.contains('shop-mode')) {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      panel.style.opacity = 0; panel.style.pointerEvents = 'none';
      more.style.opacity = 0; more.style.pointerEvents = 'none';
      foot.style.opacity = 0; foot.style.pointerEvents = 'none';
    } else {
      place(0);
    }
    peekDir = 0; peek.classList.remove('show');
    caption.classList.remove('is-changing'); box.classList.remove('changing');
    // the stack goes; the main photo itself shrinks back into its tile
    if (deckCards.length) {
      deck.style.opacity = 0; deck.style.pointerEvents = 'none'; img.style.opacity = ''; img.style.pointerEvents = '';
      if (img.src !== deckCards[0].src) img.src = deckCards[0].src;
    }
    var anim = flip(thumbRect(), true);
    var trim = anim ? headerLift(true) : null;
    box.classList.remove('open');
    document.body.style.overflow = '';
    function hideNow() {
      box.classList.add('instant');
      setTimeout(function () {
        box.classList.remove('instant');
        if (anim) anim.cancel(); // reset the photo for next time, now that it's hidden
        if (trim) trim.done();
        stage.style.transform = '';
        foot.style.opacity = 0;
      }, 50);
    }
    if (!anim) {
      // nothing to shrink back into (tile is off-screen): close straight away
      hideNow();
    } else {
      // the moment the photo has shrunk back into its tile, the viewer vanishes
      anim.onfinish = function () { if (!box.classList.contains('open')) hideNow(); };
    }
  }

  // only browse the photos currently shown (e.g. just COLOR or just B&W)
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-lightbox]');
    if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var shopItem = link.hasAttribute('data-shop');
    box.classList.toggle('shop-mode', shopItem);
    if (!shopItem) {
      geo = null; prog = target = 0; minStep = 0;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      img.style.transform = ''; stage.style.transform = '';
      panel.style.transform = ''; panel.style.opacity = ''; panel.style.maskImage = ''; panel.style.webkitMaskImage = '';
      foot.style.opacity = 0; more.style.opacity = 0;
      var siteFoot2 = document.querySelector('.site-footer');
      foot.innerHTML = siteFoot2 ? siteFoot2.innerHTML : '';
      applyFoot(0);
    }
    if (shopItem) {
      links = [link]; // shop items open on their own: no browsing
      buildPanel(link);
      setupDeck(link);
    } else {
      panel.innerHTML = ''; panel.style.width = ''; img.style.transform = ''; geo = null;
      setupDeck(null);
      links = Array.prototype.filter.call(document.querySelectorAll('main:not([aria-hidden]) [data-lightbox]'),
        function (l) { return !l.closest('.is-filtered-out'); });
    }
    open(Math.max(0, links.indexOf(link)));
  });
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function () { slide(-1); });
  box.querySelector('.lb-next').addEventListener('click', function () { slide(1); });
  box.addEventListener('click', function (e) {
    // a tap on the empty space (not the photo, the stack, the details box or a button) closes it
    if (e.target !== box && e.target !== stage && e.target !== figure && e.target !== deck) return;
    // a click while a shop item's stack is still fading in (aimed at an
    // arrow or a photo) doesn't close the viewer
    if (deckCards.length && target >= 1 && !deckActive()) return;
    close();
  });

  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (viewerOpen()) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); scrollTo(Math.floor(target + 0.001) + 1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); scrollTo(Math.ceil(target - 0.001) - 1); }
      if (box.classList.contains('shop-mode')) {
        if (deckActive() && e.key === 'ArrowRight') rotate(1);
        if (deckActive() && e.key === 'ArrowLeft') rotate(-1);
        return;
      }
    }
    if (e.key === 'ArrowLeft') slide(-1);
    if (e.key === 'ArrowRight') slide(1);
  });

  // ---- Sliding between photos ----
  // The photo on screen and the next (or previous) one sit side by side, a
  // screen-width apart. Dragging moves both with your finger; let go past
  // about a quarter of the screen (or with a quick flick) and it snaps on to
  // the next photo, otherwise it springs back. The arrows and arrow keys
  // play the same slide.
  var peek = document.createElement('img');
  peek.className = 'lb-peek';
  peek.alt = '';
  box.appendChild(peek);
  var sliding = false;    // an animation is playing
  var drag = null;        // the finger currently dragging
  var peekDir = 0;        // which neighbour the peek photo shows (1 next, -1 previous)
  var centre = null;      // where the photo's middle is on screen

  var lastDx = 0;
  function distance() { return window.innerWidth; }
  // give the incoming photo the same size limits as the main one, at its own shape
  function sizePeek() {
    var cs = getComputedStyle(img);
    var maxW = parseFloat(cs.maxWidth) || window.innerWidth, maxH = parseFloat(cs.maxHeight) || window.innerHeight;
    var nw = peek.naturalWidth || 3, nh = peek.naturalHeight || 2;
    var k = Math.min(maxW / nw, maxH / nh, 1e9);
    peek.style.width = Math.round(nw * k) + 'px';
    peek.style.height = Math.round(nh * k) + 'px';
    peek.style.visibility = '';
  }
  function place(dx) {
    lastDx = dx;
    img.style.transform = dx ? 'translateX(' + dx + 'px)' : '';
    if (peekDir) {
      var w = peek.offsetWidth, h = peek.offsetHeight;
      peek.style.transform = 'translate(' + (dx + peekDir * distance() + centre.x - w / 2) + 'px, ' + (centre.y - h / 2) + 'px)';
    }
  }
  function preparePeek(dir) {
    caption.classList.add('is-changing'); box.classList.add('changing'); // the old name fades away while the photos move
    if (dir === peekDir) return;
    peekDir = dir;
    if (!dir || links.length < 2) { peekDir = 0; peek.classList.remove('show'); return; }
    var t = img.style.transform; img.style.transform = '';
    var r = img.getBoundingClientRect(); img.style.transform = t;
    centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    var next = links[(index + dir + links.length) % links.length];
    peek.style.visibility = 'hidden';
    peek.classList.add('show');
    peek.onload = function () { sizePeek(); place(lastDx); };
    peek.src = next.href;
    if (peek.complete && peek.naturalWidth) sizePeek();
  }
  // animate from the current offset to a target offset
  function animateTo(from, to, ms, done, bell) {
    sliding = true;
    var start = null;
    // after a swipe it carries on from the finger and slows down; from the
    // arrows / keys it's slow-fast-slow (a bell curve of speed)
    function ease(t) {
      if (bell === 'soft') return -(Math.cos(Math.PI * t) - 1) / 2; // gentler slow-fast-slow (after a swipe)
      return bell ? (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) : 1 - Math.pow(1 - t, 3);
    }
    function step(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / ms);
      place(from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else { sliding = false; done(); }
    }
    requestAnimationFrame(step);
  }
  // finish the move: the photo that slid in becomes the main photo
  function commit(dir) {
    show(index + dir);
    var settle = function () {
      place(0);
      peekDir = 0;
      peek.classList.remove('show');
      // once the new photo is in place, its name fades in underneath
      requestAnimationFrame(function () { caption.classList.remove('is-changing'); box.classList.remove('changing'); });
    };
    if (img.decode) img.decode().then(settle, settle); else settle();
  }
  function slide(dir, fromDx, fast) {
    if (sliding || links.length < 2) return;
    if (zs > 1) resetZoom(false); // (a zoomed-in photo goes back to normal first)
    preparePeek(dir);
    var start = fromDx || 0;
    var to = -dir * distance();
    if (!start) { animateTo(0, to, 700, function () { commit(dir); }, true); return; } // arrows / keys
    // after a swipe: the same slow-fast-slow feel, for the distance still to go
    var ms = Math.max(fast ? 320 : 380, 700 * Math.abs(to - start) / distance());
    animateTo(start, to, ms, function () { commit(dir); }, 'soft');
  }
  function springBack(fromDx) {
    animateTo(fromDx, 0, Math.max(300, 600 * Math.abs(fromDx) / distance()), function () {
      place(0); peekDir = 0; peek.classList.remove('show');
      caption.classList.remove('is-changing'); box.classList.remove('changing');
    }, 'soft');
  }

  box.addEventListener('touchstart', function (e) {
    if (sliding || e.touches.length !== 1 || e.target.closest('button') || box.classList.contains('shop-mode') || zs > 1) return;
    var t = e.touches[0];
    drag = { x: t.clientX, y: t.clientY, dx: 0, axis: null, lastX: t.clientX, lastT: Date.now(), v: 0 };
  }, { passive: true });
  box.addEventListener('touchmove', function (e) {
    if (!drag) return;
    if (e.touches.length > 1 || zs > 1) { if (drag.dx) springBack(drag.dx); drag = null; return; } // a pinch
    var t = e.touches[0];
    var dx = t.clientX - drag.x, dy = t.clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (drag.axis !== 'x') return;
    e.preventDefault();
    var now = Date.now();
    drag.v = (t.clientX - drag.lastX) / Math.max(1, now - drag.lastT);
    drag.lastX = t.clientX; drag.lastT = now;
    if (links.length < 2) dx = dx * .25; // only one photo: just a little give
    else preparePeek(dx < 0 ? 1 : -1);
    drag.dx = dx;
    place(dx);
  }, { passive: false });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.axis !== 'x' || !d.dx) return;
    var flick = Math.abs(d.v) > .45 && (d.v < 0) === (d.dx < 0);
    if (links.length > 1 && (Math.abs(d.dx) > distance() * .25 || flick)) {
      slide(d.dx < 0 ? 1 : -1, d.dx, flick);
    } else {
      springBack(d.dx);
    }
  }
  box.addEventListener('touchend', endDrag);
  box.addEventListener('touchcancel', endDrag);

  // ---- Zooming in (Photography and Projects; not shop items) ----
  // Fingers: pinch to zoom (up to 4x) around the fingers, drag with one
  // finger to look around, double-tap to zoom in / back out. Mouse or
  // trackpad: a little magnifying glass follows the pointer over the photo;
  // click zooms in a step on that spot, right-click zooms back out a step,
  // and dragging or two-finger scrolling moves around. Changing photo or
  // closing puts it back to normal.
  var zs = 1, zx = 0, zy = 0, MAXZ = 4;
  function canZoom() { return box.classList.contains('open') && !box.classList.contains('shop-mode') && !sliding && target < 0.05; }
  function zoomBox() { // the photo's own box, without any zoom
    var t = img.style.transform; img.style.transform = '';
    var r = img.getBoundingClientRect(); img.style.transform = t;
    return r;
  }
  function clampPan(r) {
    var mx = (zs - 1) * r.width / 2, my = (zs - 1) * r.height / 2;
    zx = Math.max(-mx, Math.min(mx, zx)); zy = Math.max(-my, Math.min(my, zy));
  }
  var zoomAnim = null;
  function draw(s, x, y) {
    img.style.transform = s > 1.001 ? 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')' : '';
  }
  // animate from where the photo is to (zs, zx, zy): the size changes
  // evenly and the spot being zoomed on (ax, ay on screen) stays put the
  // whole way, with any nudge to keep the photo in view blended in - so it
  // never drifts off or bounces partway through
  function animateZoom(s0, x0, y0, ax, ay) {
    if (zoomAnim) cancelAnimationFrame(zoomAnim);
    var r = zoomBox(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var s1 = zs, x1 = zx, y1 = zy;
    if (ax == null) { ax = cx + x0; ay = cy + y0; }
    var ux = (ax - cx - x0) / s0, uy = (ay - cy - y0) / s0; // that spot on the unzoomed photo
    var ex = x1 - (ax - cx - s1 * ux), ey = y1 - (ay - cy - s1 * uy); // the nudge at the end
    var start = null, ms = 380;
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / ms), e = ease(t);
      var s = s0 * Math.pow(s1 / s0, e);
      draw(s, ax - cx - s * ux + ex * e, ay - cy - s * uy + ey * e);
      zoomAnim = t < 1 ? requestAnimationFrame(frame) : null;
      if (!zoomAnim) draw(zs, zx, zy);
    }
    zoomAnim = requestAnimationFrame(frame);
  }
  function applyZoom(animate, from, ax, ay) {
    if (animate && from) animateZoom(from[0], from[1], from[2], ax, ay);
    else { if (zoomAnim) { cancelAnimationFrame(zoomAnim); zoomAnim = null; } draw(zs, zx, zy); }
    box.classList.toggle('zoomed', zs > 1.001);
    box.classList.toggle('zoom-max', zs >= MAXZ - 0.01);
    magIcon();
  }
  // zoom to s, keeping the screen point (px, py) where it is
  function zoomTo(s, px, py, animate) {
    var from = [zs, zx, zy];
    var r = zoomBox(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    s = Math.max(1, Math.min(MAXZ, s));
    var ux = (px - cx - zx) / zs, uy = (py - cy - zy) / zs; // that point on the unzoomed photo
    zx = px - cx - s * ux; zy = py - cy - s * uy; zs = s;
    if (zs <= 1.001) { zs = 1; zx = zy = 0; }
    clampPan(r); applyZoom(animate, from, px, py);
  }
  function panBy(dx, dy, animate) {
    zx += dx; zy += dy; clampPan(zoomBox()); applyZoom(animate);
  }
  function resetZoom(animate) {
    if (zs === 1 && !zx && !zy) return;
    var from = [zs, zx, zy];
    zs = 1; zx = zy = 0; applyZoom(animate, from);
  }

  // fingers
  var pinch = null, pan = null, lastTap = 0, lastTapX = 0, lastTapY = 0;
  function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
  box.addEventListener('touchstart', function (e) {
    if (!canZoom() || e.target.closest('button')) return;
    if (e.touches.length === 2) {
      var a = e.touches[0], b = e.touches[1];
      pinch = { d: dist(a, b), s: zs, mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2, zx: zx, zy: zy };
      pan = null;
    } else if (e.touches.length === 1 && zs > 1) {
      pan = { x: e.touches[0].clientX, y: e.touches[0].clientY, zx: zx, zy: zy, moved: false };
    }
  }, { passive: true });
  box.addEventListener('touchmove', function (e) {
    if (pinch && e.touches.length === 2) {
      e.preventDefault();
      var a = e.touches[0], b = e.touches[1];
      var mx = (a.clientX + b.clientX) / 2, my = (a.clientY + b.clientY) / 2;
      var r = zoomBox(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var s = Math.max(1, Math.min(MAXZ, pinch.s * dist(a, b) / pinch.d)); // (stops exactly at the limits)
      var ux = (pinch.mx - cx - pinch.zx) / pinch.s, uy = (pinch.my - cy - pinch.zy) / pinch.s;
      zs = s; zx = mx - cx - s * ux; zy = my - cy - s * uy; // the photo follows the fingers too
      clampPan(r); applyZoom(false);
    } else if (pan && e.touches.length === 1) {
      e.preventDefault();
      var t = e.touches[0];
      if (Math.abs(t.clientX - pan.x) + Math.abs(t.clientY - pan.y) > 4) pan.moved = true;
      zx = pan.zx + t.clientX - pan.x; zy = pan.zy + t.clientY - pan.y;
      clampPan(zoomBox()); applyZoom(false);
    }
  }, { passive: false });
  function touchUp(e) {
    if (pinch && e.touches.length < 2) {
      pinch = null;
      // settle inside the photo's edges (the size is already within limits)
      var from = [zs, zx, zy];
      if (zs < 1.02) { zs = 1; zx = zy = 0; }
      clampPan(zoomBox()); applyZoom(true, from);
      if (e.touches.length === 1 && zs > 1) pan = { x: e.touches[0].clientX, y: e.touches[0].clientY, zx: zx, zy: zy, moved: true };
      return;
    }
    if (pan && !e.touches.length) { var moved = pan.moved; pan = null; if (moved) return; }
    // double-tap on the photo: zoom in there, or back out
    if (!canZoom() || e.touches.length || !e.changedTouches.length || e.target !== img) return;
    var c = e.changedTouches[0], now = Date.now();
    if (now - lastTap < 320 && Math.abs(c.clientX - lastTapX) < 30 && Math.abs(c.clientY - lastTapY) < 30) {
      if (zs > 1) resetZoom(true); else zoomTo(2.5, c.clientX, c.clientY, true);
      lastTap = 0;
    } else { lastTap = now; lastTapX = c.clientX; lastTapY = c.clientY; }
  }
  box.addEventListener('touchend', touchUp);
  box.addEventListener('touchcancel', function () { pinch = null; pan = null; if (zs < 1.02) resetZoom(true); });

  // mouse / trackpad
  var mag = document.createElement('div');
  mag.className = 'lb-mag';
  mag.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/><path class="mag-plus" d="M10.5 7.8v5.4M7.8 10.5h5.4"/></svg>';
  box.appendChild(mag);
  function magIcon() { mag.classList.toggle('max', zs >= MAXZ - 0.01); }
  var mdrag = null;
  img.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var on = canZoom();
    mag.classList.toggle('show', on && !mdrag);
    if (on) mag.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
  });
  img.addEventListener('pointerleave', function () { mag.classList.remove('show'); });
  img.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || e.button !== 0 || !canZoom()) return;
    e.preventDefault();
    mdrag = { x: e.clientX, y: e.clientY, zx: zx, zy: zy, moved: false };
  });
  window.addEventListener('pointermove', function (e) {
    if (!mdrag) return;
    if (Math.abs(e.clientX - mdrag.x) + Math.abs(e.clientY - mdrag.y) > 4) mdrag.moved = true;
    if (mdrag.moved && zs > 1) {
      box.classList.add('zoom-dragging'); mag.classList.remove('show');
      zx = mdrag.zx + e.clientX - mdrag.x; zy = mdrag.zy + e.clientY - mdrag.y;
      clampPan(zoomBox()); applyZoom(false);
    }
  });
  window.addEventListener('pointerup', function (e) {
    if (!mdrag) return;
    var d = mdrag; mdrag = null; box.classList.remove('zoom-dragging');
    if (d.moved || !canZoom()) return;
    zoomTo(zs * 2, e.clientX, e.clientY, true); // click: a step closer, on that spot
  });
  // right-click: a step back out (and no menu)
  img.addEventListener('contextmenu', function (e) {
    if (!box.classList.contains('open') || box.classList.contains('shop-mode')) return;
    e.preventDefault();
    if (zs > 1) zoomTo(zs / 2, e.clientX, e.clientY, true);
  });
})();

// Two-way switches: COLOR / B&W on the Photography page and PRINTS / SHIRTS
// on the Shop page. One kind shows at a time; the first button is the
// default and the other one is remembered in the address (e.g. #bw).
// Switching slides: the line under the buttons glides across to the one
// tapped, and the photos slide off the screen while the others slide in.
(function () {
  var busy = false;
  function currentBar() { return document.querySelector('main:not([aria-hidden]) .gallery-filter'); }
  function pressedKind(bar) {
    var b = bar.querySelector('button[aria-pressed="true"]');
    return b ? b.dataset.filter : null;
  }
  // the single line that glides between the buttons
  function moveLine(bar, instant) {
    var line = bar.querySelector('.filter-line');
    if (!line) {
      line = document.createElement('span');
      line.className = 'filter-line';
      line.setAttribute('aria-hidden', 'true');
      bar.appendChild(line);
      bar.classList.add('has-line');
      instant = true;
    }
    var b = bar.querySelector('button[aria-pressed="true"]');
    if (!b) return;
    var spacing = parseFloat(getComputedStyle(b).letterSpacing) || 0;
    if (instant) line.style.transition = 'none';
    line.style.left = b.offsetLeft + 'px';
    line.style.width = Math.max(0, b.offsetWidth - spacing) + 'px';
    if (instant) { void line.offsetWidth; line.style.transition = ''; }
  }
  // what moves: the photo grid / shop grid (or a lone "coming soon" note)
  function movers() {
    var set = [];
    Array.prototype.forEach.call(document.querySelectorAll('main:not([aria-hidden]) [data-kind]'), function (it) {
      var el = it.parentElement && it.parentElement.tagName !== 'MAIN' ? it.parentElement : it;
      if (set.indexOf(el) < 0) set.push(el);
    });
    return set;
  }
  function apply(kind, animate) {
    var bar = currentBar();
    if (!bar) return;
    var buttons = Array.prototype.slice.call(bar.querySelectorAll('button'));
    if (!kind) kind = buttons[0].dataset.filter;
    var before = pressedKind(bar);
    var from = buttons.findIndex(function (b) { return b.dataset.filter === before; });
    var to = buttons.findIndex(function (b) { return b.dataset.filter === kind; });
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.filter === kind ? 'true' : 'false');
    });
    moveLine(bar, !animate);
    var hash = kind === buttons[0].dataset.filter ? '' : '#' + kind;
    try { history.replaceState(history.state, '', hash || location.pathname + location.search); } catch (e) {}
    function swap() {
      Array.prototype.forEach.call(document.querySelectorAll('main:not([aria-hidden]) [data-kind]'), function (it) {
        it.classList.toggle('is-filtered-out', it.dataset.kind !== kind);
      });
    }
    var els = movers();
    if (!animate || before === kind || !els.length || !els[0].animate) { swap(); return; }
    // later button: everything slides left; earlier button: slides right.
    // The whole move follows one smooth speed curve: it starts slowly, picks
    // up speed as the old photos leave and the new ones arrive, then eases
    // gently to a stop (the two halves of an ease-in-out).
    var dir = to > from ? 1 : -1;
    var off = window.innerWidth;
    busy = true;
    var outs = els.map(function (el) {
      return el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + (-dir * off) + 'px)' }],
        { duration: 400, easing: 'cubic-bezier(.32, 0, .67, 0)', fill: 'forwards' });
    });
    outs[0].onfinish = function () {
      swap();
      var ins = movers().map(function (el) {
        return el.animate([{ transform: 'translateX(' + (dir * off) + 'px)' }, { transform: 'translateX(0)' }],
          { duration: 400, easing: 'cubic-bezier(.33, 1, .68, 1)' });
      });
      outs.forEach(function (a) { a.cancel(); });
      var done = function () { busy = false; };
      if (ins.length) { ins[0].onfinish = done; ins[0].oncancel = done; } else done();
    };
  }
  // a button that isn't open yet (COMING SOON): the line stays where it is
  // and gives a little shake, like shaking its head
  function shake(bar) {
    var line = bar.querySelector('.filter-line');
    if (!line || !line.animate || line.dataset.shaking) return;
    line.dataset.shaking = '1';
    var a = line.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-7px)' },
      { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }
    ], { duration: 480, easing: 'ease-in-out' });
    a.onfinish = a.oncancel = function () { delete line.dataset.shaking; };
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.gallery-filter button');
    if (!b || busy) return;
    if (b.hasAttribute('data-soon')) { shake(b.closest('.gallery-filter')); return; }
    apply(b.dataset.filter, true);
  });
  function fromAddress() {
    var bar = currentBar();
    if (!bar) return;
    var want = location.hash.slice(1);
    apply(want && bar.querySelector('button[data-filter="' + want + '"]:not([data-soon])') ? want : null, false);
  }
  window.addEventListener('hashchange', fromAddress);
  window.addEventListener('resize', function () { var bar = currentBar(); if (bar) moveLine(bar, true); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var bar = currentBar(); if (bar) moveLine(bar, true); });
  document.addEventListener('pageswap:done', fromAddress);
  fromAddress();
})();

// Instagram / YouTube buttons: on phones and tablets open the link in the
// same tab, so the phone can hand it straight to the Instagram or YouTube
// app (links opened in a new tab often stay in the browser). Computers keep
// opening them in a new tab.
(function () {
  var touch = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!touch) return;
  Array.prototype.forEach.call(document.querySelectorAll('.social-btn[target]'), function (a) {
    a.removeAttribute('target');
  });
})();


// Moving between pages: instead of loading a whole new page (a hard snap),
// fetch the next page and swap its content in, letting the old page
// dissolve into the new one. The header and footer simply stay put. If anything goes wrong it falls back
// to a normal page load.
(function () {
  if (!window.fetch || !window.DOMParser || !history.pushState) return;
  var root = document.documentElement;
  var nav = document.querySelector('.site-nav');
  var busy = false;

  function samePage(url) { return url.pathname === location.pathname && url.search === location.search; }

  // give the first photos a moment to arrive so the new page fades in whole
  function ready(main) {
    var imgs = Array.prototype.slice.call(main.querySelectorAll('img'), 0, 6);
    var loads = imgs.map(function (el) {
      var im = new Image(); im.src = el.currentSrc || el.src;
      return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
    });
    return Promise.race([Promise.all(loads), new Promise(function (r) { setTimeout(r, 600); })]);
  }

  // If the menu is open, let it roll up first (its usual 0.4s close) so the
  // page dissolve only ever changes the page itself, nothing moving inside it.
  function closeMenu() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (!nav || !nav.classList.contains('open')) return Promise.resolve();
    nav.classList.remove('open');
    var t = document.querySelector('.nav-toggle'); if (t) t.setAttribute('aria-expanded', 'false');
    return new Promise(function (r) { setTimeout(r, 450); });
  }

  function go(url, push, scrollY) {
    if (busy) return;
    busy = true;
    // (anything open over the page, like the photo viewer, closes as it goes)
    document.dispatchEvent(new Event('pageswap:start'));
    var fromY = document.body.scrollTop; // where this page was, for the back button
    var menuClosed = closeMenu();
    fetch(url.href, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('status ' + r.status);
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var main = doc.querySelector('main');
      if (!main || doc.querySelector('meta[http-equiv="refresh"]')) throw new Error('not swappable');
      // copy it in as brand-new elements (not moved across): Safari can drop
      // photos that are moved over from the page loaded in the background
      main = document.importNode(main, true);
      return Promise.all([ready(main), menuClosed]).then(function () {
        function update() {
          document.title = doc.title;
          if (push) {
            history.replaceState({ y: fromY }, '');
            history.pushState({ y: 0 }, '', url.href);
          }
          if (nav) {
            Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
              a.classList.toggle('active', new URL(a.href, location.href).pathname === location.pathname);
            });
          }
          document.dispatchEvent(new Event('pageswap:done'));
        }
        // The dissolve, done by hand (Safari's built-in page transitions
        // could make the home photo vanish once the fade finished): the old
        // page is pinned exactly where it is on screen, the new page goes in
        // underneath, and the old one fades away to reveal it.
        var old = document.querySelector('main');
        var r = old.getBoundingClientRect();
        old.style.position = 'fixed';
        old.style.top = r.top + 'px';
        old.style.left = r.left + 'px';
        old.style.width = r.width + 'px';
        old.style.height = r.height + 'px';
        old.style.margin = '0';
        old.style.zIndex = '5';
        old.style.background = 'var(--bg)';
        old.style.pointerEvents = 'none';
        old.setAttribute('aria-hidden', 'true');
        old.insertAdjacentElement('afterend', main);
        document.body.scrollTop = scrollY || 0;
        update();
        var finish = function () { old.remove(); busy = false; };
        if (old.animate) {
          var fade = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, easing: 'ease-in-out', fill: 'forwards' });
          fade.onfinish = finish;
          fade.oncancel = finish;
        } else {
          finish();
        }
      });
    }).catch(function () { location.href = url.href; });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    // the EYESEERC name on the page it leads to (home): do nothing, no reload
    if (a.classList.contains('brand') && url.origin === location.origin && samePage(url) && !url.hash) { e.preventDefault(); return; }
    if (url.origin !== location.origin || samePage(url)) return;
    if (/\.(jpe?g|png|gif|webp|pdf)$/i.test(url.pathname)) return;
    e.preventDefault();
    go(url, true);
  });

  // browser back / forward buttons
  var shown = location.pathname + location.search;
  document.addEventListener('pageswap:done', function () { shown = location.pathname + location.search; });
  window.addEventListener('popstate', function (e) {
    if (location.pathname + location.search === shown) return; // just the #bw switch
    go(new URL(location.href), false, e.state && e.state.y);
  });
})();


// Cart. What's been added is kept in this browser (localStorage), so it's
// still there when you move between pages or come back later. The cart icon
// beside the menu only shows when there's something in it. CHECK OUT sends
// the items to Shopify's checkout once the store is connected (_config.yml).
(function () {
  var KEY = 'eyeseerc-cart';
  var shop = window.SHOP || {};
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  function count(items) { return items.reduce(function (n, it) { return n + it.qty; }, 0); }
  function money(n) { return (shop.currency || '$') + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0); }

  function updateIcon(bump) {
    var link = document.querySelector('.cart-link');
    if (!link) return;
    var n = count(load());
    link.hidden = n === 0;
    link.setAttribute('aria-label', 'Cart, ' + n + (n === 1 ? ' item' : ' items'));
    link.querySelector('.cart-count').textContent = n > 99 ? '99+' : n;
    if (bump && n) { link.classList.remove('bump'); void link.offsetWidth; link.classList.add('bump'); }
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // fills in every cart list: the cart page and the slide-in cart drawer
  function renderCart() {
    Array.prototype.forEach.call(document.querySelectorAll('main:not([aria-hidden]) .cart-ui, .cart-drawer .cart-ui'), renderInto);
  }
  function renderInto(root) {
    var items = load();
    var list = root.querySelector('.cart-items');
    list.innerHTML = '';
    items.forEach(function (it) {
      var li = el('li', 'cart-item');
      var img = el('img'); img.src = it.image; img.alt = it.title; li.appendChild(img);
      var info = el('div');
      info.appendChild(el('div', 'cart-item-title', it.title));
      info.appendChild(el('div', 'cart-item-price', money(it.price * it.qty)));
      var qty = el('div', 'cart-qty');
      var minus = el('button', null, '−'); minus.type = 'button'; minus.dataset.act = 'dec'; minus.dataset.id = it.id; minus.setAttribute('aria-label', 'One fewer');
      var plus = el('button', null, '+'); plus.type = 'button'; plus.dataset.act = 'inc'; plus.dataset.id = it.id; plus.setAttribute('aria-label', 'One more');
      qty.appendChild(minus); qty.appendChild(el('span', null, it.qty)); qty.appendChild(plus);
      info.appendChild(qty);
      li.appendChild(info);
      var rm = el('button', 'cart-remove', 'REMOVE'); rm.type = 'button'; rm.dataset.act = 'remove'; rm.dataset.id = it.id;
      li.appendChild(rm);
      list.appendChild(li);
    });
    var empty = items.length === 0;
    root.querySelector('.cart-summary').hidden = empty;
    list.hidden = empty;
    root.querySelector('.cart-empty').hidden = !empty;
    root.querySelector('.cart-subtotal-amount').textContent = money(items.reduce(function (s, it) { return s + it.price * it.qty; }, 0));
    root.querySelector('.cart-soon').hidden = true;
  }

  function checkoutUrl(items) {
    if (!shop.store) return null;
    if (!items.every(function (it) { return it.variant; })) return null;
    var host = String(shop.store).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return 'https://' + host + '/cart/' + items.map(function (it) { return it.variant + ':' + it.qty; }).join(',');
  }

  // used by the details box in the photo viewer
  window.eyeseercCart = {
    add: function (item, qty) {
      var items = load();
      var found = items.filter(function (it) { return it.id === item.id; })[0];
      if (found) found.qty += qty;
      else { item.qty = qty; items.push(item); }
      save(items);
      updateIcon(true);
      openDrawer();
    }
  };

  // The slide-in cart: a slim panel from the right (slow-fast-slow), over
  // whatever's open, so you can keep looking after adding something.
  var drawer = null, drawerOpen = false;
  function buildDrawer() {
    if (drawer) return drawer;
    drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    var cartPage = (document.querySelector('.cart-link') || {}).getAttribute ? document.querySelector('.cart-link').getAttribute('href') : '/cart/';
    drawer.innerHTML =
      '<div class="cart-drawer-backdrop"></div>' +
      '<aside class="cart-drawer-panel" role="dialog" aria-label="Cart">' +
        '<div class="cart-drawer-head"><span>CART</span><button type="button" class="cart-drawer-close" aria-label="Close cart">&times;</button></div>' +
        '<div class="cart cart-ui">' +
          '<ul class="cart-items"></ul>' +
          '<div class="cart-summary">' +
            '<div class="cart-subtotal"><span>SUBTOTAL</span><span class="cart-subtotal-amount"></span></div>' +
            '<p class="cart-note">Shipping and taxes are worked out at checkout.</p>' +
            '<button type="button" class="shopify-checkout">Check out</button>' +
            '<p class="cart-secure">Secure checkout with Shopify</p>' +
            '<p class="cart-soon" hidden>Checkout opens soon.</p>' +
          '</div>' +
          '<div class="cart-empty" hidden><p>Your cart is empty.</p></div>' +
        '</div>' +
        '<a class="cart-drawer-page" href="' + cartPage + '">VIEW CART</a>' +
      '</aside>';
    document.body.appendChild(drawer);
    drawer.querySelector('.cart-drawer-page').addEventListener('click', function () { closeDrawer(true); });
    return drawer;
  }
  var bodyOverflow = '';
  function openDrawer() {
    buildDrawer();
    renderCart();
    if (drawerOpen) return;
    drawerOpen = true;
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.setAttribute('aria-hidden', 'false');
    void drawer.offsetWidth;
    drawer.classList.add('open');
  }
  function closeDrawer(instant) {
    if (!drawerOpen) return;
    drawerOpen = false;
    document.body.style.overflow = bodyOverflow;
    drawer.classList.toggle('instant', !!instant);
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (instant) setTimeout(function () { drawer.classList.remove('instant'); }, 50);
  }
  // the cart icon always goes to the cart page (with the usual page fade);
  // on the cart page itself it does nothing
  document.addEventListener('click', function (e) {
    var icon = e.target.closest && e.target.closest('.cart-link');
    if (!icon) return;
    if (document.querySelector('main:not([aria-hidden]) #cart-root')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    closeDrawer(true);
  }, true);
  // Escape closes the cart first (and only the cart)
  window.addEventListener('keydown', function (e) {
    if (drawerOpen && e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); closeDrawer(); }
  }, true);
  document.addEventListener('pageswap:done', function () { closeDrawer(true); });

  document.addEventListener('click', function (e) {
    var add = e.target.closest && e.target.closest('.add-to-cart');
    if (add) {
      var items = load();
      var found = items.filter(function (it) { return it.id === add.dataset.id; })[0];
      if (found) found.qty += 1;
      else items.push({ id: add.dataset.id, title: add.dataset.title, price: parseFloat(add.dataset.price) || 0,
                        image: add.dataset.image, variant: add.dataset.variant || '', qty: 1 });
      save(items);
      updateIcon(true);
      openDrawer(); // the cart slides in; shopping carries on underneath
      return;
    }
    if (e.target.closest && (e.target.closest('.cart-drawer-close') || e.target.classList.contains('cart-drawer-backdrop'))) { closeDrawer(); return; }
    var btn = e.target.closest && e.target.closest('.cart-ui [data-act]');
    if (btn) {
      var list = load();
      list = list.map(function (it) {
        if (it.id !== btn.dataset.id) return it;
        if (btn.dataset.act === 'inc') it.qty += 1;
        if (btn.dataset.act === 'dec') it.qty -= 1;
        if (btn.dataset.act === 'remove') it.qty = 0;
        return it;
      }).filter(function (it) { return it.qty > 0; });
      save(list);
      renderCart();
      updateIcon(false);
      return;
    }
    var pay = e.target.closest && e.target.closest('.shopify-checkout');
    if (pay) {
      var url = checkoutUrl(load());
      if (url) { location.href = url; return; }
      var soon = pay.parentNode.querySelector('.cart-soon');
      if (soon) { soon.hidden = false; soon.style.animation = 'none'; void soon.offsetWidth; soon.style.animation = ''; }
    }
  });

  // keep the icon right if the cart changes in another tab
  window.addEventListener('storage', function (e) { if (e.key === KEY) { updateIcon(false); renderCart(); } });
  document.addEventListener('pageswap:done', function () { renderCart(); updateIcon(false); });
  window.addEventListener('pageshow', function () { renderCart(); updateIcon(false); });
  updateIcon(false);
  renderCart();
})();

// Keep the site up to date when it's saved to a phone's home screen. Those
// web apps can keep showing an old copy of a page for a long time, so each
// time the site comes back into view it quietly checks whether a newer
// version has been published and, if so, reloads to it.
(function () {
  var meta = document.querySelector('meta[name="build"]');
  if (!meta || !window.fetch) return;
  var current = meta.content, last = 0;
  var home = (document.querySelector('.brand') || {}).href || '/';
  function check() {
    if (Date.now() - last < 30000) return;
    last = Date.now();
    fetch(home + (home.indexOf('?') < 0 ? '?' : '&') + 'check=' + last, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        var m = html.match(/<meta name="build" content="(\d+)"/);
        if (!m || m[1] === current) return;
        // only once per new version, in case a copy somewhere is still catching up
        var key = 'eyeseerc-reloaded-for';
        try { if (sessionStorage.getItem(key) === m[1]) return; sessionStorage.setItem(key, m[1]); } catch (e) { return; }
        location.reload();
      })
      .catch(function () {});
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) check(); });
  check();
})();

// The page scrolls inside the body (so it can't bounce past its ends), which
// browsers don't steer with the keyboard on their own: arrow keys, Page
// Up/Down, Space, Home and End scroll it here instead. Keys the photo viewer
// or a text box has already used are left alone.
(function () {
  var body = document.body;
  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
    if (getComputedStyle(body).overflowY === 'hidden') return;
    var page = body.clientHeight - 60, line = 60, top = null, by = null;
    switch (e.key) {
      case 'ArrowDown': by = line; break;
      case 'ArrowUp': by = -line; break;
      case 'PageDown': by = page; break;
      case 'PageUp': by = -page; break;
      case ' ': by = e.shiftKey ? -page : page; break;
      case 'Home': top = 0; break;
      case 'End': top = body.scrollHeight; break;
      default: return;
    }
    e.preventDefault();
    if (top !== null) body.scrollTo({ top: top, behavior: 'smooth' });
    else body.scrollBy({ top: by, behavior: 'smooth' });
  });
})();


// Arriving with ?open=<photo file> (the moving strip on the home page):
// the page (and its Color / B&W tab) fades in first, already scrolled to
// that photo; then, after a short pause, the photo opens full screen. The
// address is tidied so a reload or the back button doesn't open it again.
(function () {
  function openFromAddress(e) {
    var want = new URLSearchParams(location.search).get('open');
    if (!want) return;
    var clean = location.pathname + location.hash;
    try { history.replaceState(history.state, '', clean); } catch (e) {}
    var link = Array.prototype.find.call(document.querySelectorAll('main:not([aria-hidden]) [data-lightbox]'), function (a) {
      return decodeURIComponent(a.getAttribute('href') || '').split('/').pop() === want && !a.closest('.is-filtered-out');
    });
    if (!link) return;
    link.scrollIntoView({ block: 'center' });
    // coming from another page: wait for its 0.8s fade to finish; a fresh
    // load: give the page a moment to settle in view
    var wait = e ? 1150 : 700;
    var here = location.pathname;
    setTimeout(function () {
      if (!link.isConnected || location.pathname !== here) return; // moved on
      if (document.querySelector('.lightbox.open')) return;
      link.click();
    }, wait);
  }
  document.addEventListener('pageswap:done', openFromAddress);
  openFromAddress();
})();

// Photography and Projects: a small switch above the photos for how many
// sit side by side (computers / iPads: 2, 3 or 4; phones: 1, 2 or 3). The
// photos glide to their new places, and the choice is remembered for next
// time (for each page, phones and bigger screens separately).
(function () {
  function phone() { return window.innerWidth <= 700; }
  function key() { return 'grid-cols:' + location.pathname + (phone() ? ':phone' : ':wide'); }
  function saved() { try { return parseInt(localStorage.getItem(key()), 10) || 0; } catch (e) { return 0; } }
  function icon(n) {
    var w = 18, g = 2, bw = (w - g * (n - 1)) / n, r = '';
    for (var i = 0; i < n; i++) r += '<rect x="' + (i * (bw + g)).toFixed(2) + '" y="3" width="' + bw.toFixed(2) + '" height="12" rx=".6"/>';
    return '<svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">' + r + '</svg>';
  }
  function grid() { return document.querySelector('main:not([aria-hidden]) .gallery-grid'); }
  function defaultCols(g) {
    g.style.gridTemplateColumns = '';
    return getComputedStyle(g).gridTemplateColumns.split(' ').length;
  }
  function setCols(g, bar, n, animate) {
    var items = Array.prototype.slice.call(g.querySelectorAll('.gallery-item'));
    var before = animate ? items.map(function (it) { return it.getBoundingClientRect(); }) : null;
    g.style.gridTemplateColumns = 'repeat(' + n + ', minmax(0, 1fr))';
    g.dataset.cols = n;
    Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', +b.dataset.cols === n ? 'true' : 'false');
    });
    if (!before || !items[0] || !items[0].animate) return;
    // glide from where each photo was to where it is now
    items.forEach(function (it, i) {
      var a = before[i], b = it.getBoundingClientRect();
      if (!b.width || (a.top > innerHeight + 200 && b.top > innerHeight + 200)) return; // (far off screen)
      it.animate([
        { transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ')', transformOrigin: 'top left' },
        { transform: 'none', transformOrigin: 'top left' }
      ], { duration: 520, easing: 'cubic-bezier(.45, 0, .2, 1)' });
    });
  }
  function setup() {
    var g = grid(), filter = document.querySelector('main:not([aria-hidden]) .gallery-filter');
    if (!g || !filter) return;
    var bar = filter.parentNode.querySelector('.grid-size');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'grid-size'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Photos per row');
      [1, 2, 3, 4].forEach(function (n) {
        var b = document.createElement('button');
        b.type = 'button'; b.dataset.cols = n; b.setAttribute('aria-label', n + ' per row'); b.innerHTML = icon(n);
        bar.appendChild(b);
      });
      filter.insertAdjacentElement('afterend', bar);
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var n = +b.dataset.cols;
        try { localStorage.setItem(key(), n); } catch (err) {}
        setCols(grid(), bar, n, true);
      });
    }
    var n = saved() || defaultCols(g);
    if (phone() ? n > 3 : n < 2) n = defaultCols(g);
    setCols(g, bar, n, false);
  }
  var lastPhone = phone();
  window.addEventListener('resize', function () { if (phone() !== lastPhone) { lastPhone = phone(); setup(); } });
  document.addEventListener('pageswap:done', setup);
  setup();
})();

// Soft-focus loading: each photo with a tiny blurred preview behind it
// (class "soft") fades in sharp over the preview once it has loaded.
// Photos that are already there (cached) show at once.
(function () {
  function sharpen(img) { img.classList.add('sharp'); }
  document.addEventListener('load', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('soft')) sharpen(t);
  }, true);
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('soft')) sharpen(t);
  }, true);
  function sweep() {
    Array.prototype.forEach.call(document.querySelectorAll('.soft img'), function (img) {
      if (img.complete && img.naturalWidth) { img.style.transition = 'none'; sharpen(img); void img.offsetWidth; img.style.transition = ''; }
    });
  }
  sweep();
  document.addEventListener('pageswap:done', sweep);
})();

// The logo screen (see the top of the page): it stays at least a moment so
// the logo is seen turning, then fades once the page has loaded (or after a
// couple of seconds at most, on a slow connection), and tells the home page
// its entrance can begin.
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('splash')) return;
  var t0 = Date.now(), done = false;
  function finish() {
    if (done) return; done = true;
    var wait = Math.max(0, 1100 - (Date.now() - t0));
    setTimeout(function () {
      root.classList.add('splash-out');
      setTimeout(function () {
        root.classList.remove('splash', 'splash-out');
        document.dispatchEvent(new Event('splashdone'));
      }, 760);
    }, wait);
  }
  if (document.readyState === 'complete') finish(); else window.addEventListener('load', finish);
  setTimeout(finish, 2500);
})();

// Home: full-screen photos that crossfade on their own every few
// seconds. Swipe, the arrows, the arrow keys or the lines at the bottom move it by hand.
(function () {
  var TIME = 6000, FADE = 1600;
  var root = null, slides = [], dots = [], title = null, cur = 0, timer = 0, busy = false;

  function load(s) {
    var both = s.querySelectorAll('img'), im = s.querySelector('.show-photo');
    Array.prototype.forEach.call(both, function (el) { if (!el.getAttribute('src') && el.dataset.src) el.src = el.dataset.src; });
    if (!im.decode) return Promise.resolve();
    return Promise.race([im.decode().catch(function () {}), new Promise(function (r) { setTimeout(r, 5000); })]);
  }
  function restartDot() {
    dots.forEach(function (d, i) { d.classList.toggle('done', i < cur); d.classList.remove('now'); });
    void root.offsetWidth; // so the fill starts again from empty
    dots[cur].classList.add('now');
  }
  function schedule() {
    clearTimeout(timer);
    root.classList.remove('paused');
    restartDot();
    timer = setTimeout(function () { go(cur + 1); }, TIME);
  }
  function go(n) {
    if (!root || !document.contains(root)) { stop(); return; }
    n = (n + slides.length) % slides.length;
    if (n === cur || busy) return;
    busy = true; clearTimeout(timer);
    var next = slides[n], prev = slides[cur];
    load(next).then(function () {
      if (!document.contains(root)) return;
      slides.forEach(function (s) { if (s !== next && s !== prev) s.classList.remove('was'); });
      // the old photo carries on drifting under the new one as it fades in
      // (it isn't stopped and re-measured: Safari reported its end size,
      // so it jumped smaller just as the change began)
      prev.classList.add('was'); prev.classList.remove('on');
      next.classList.remove('was'); void next.offsetWidth;
      next.classList.add('on');
      cur = n;
      var old = title; old.classList.add('out');
      setTimeout(function () {
        // the new name goes in as a fresh element: Safari could leave the end
        // of a longer old name painted behind a shorter new one
        var t = old.cloneNode(false);
        t.textContent = next.dataset.title; t.href = next.dataset.link;
        if (old.parentNode) old.parentNode.replaceChild(t, old);
        title = t; void t.offsetWidth;
        t.classList.remove('out');
      }, 450);
      setTimeout(function () { if (!prev.classList.contains('on')) prev.classList.remove('was'); }, FADE + 50);
      setTimeout(function () { busy = false; }, 500);
      schedule();
      load(slides[(n + 1) % slides.length]); // get the one after ready too
    });
  }
  function stop() { clearTimeout(timer); root = null; }

  function setup() {
    var el = document.querySelector('main:not([aria-hidden]) .show');
    if (!el || el === root) return;
    root = el; cur = 0; busy = false;
    root.style.setProperty('--show-time', TIME + 'ms');
    lens();
    slides = Array.prototype.slice.call(root.querySelectorAll('.show-slide'));
    dots = Array.prototype.slice.call(root.querySelectorAll('.show-dot'));
    title = root.querySelector('.show-title');
    root.querySelector('.show-prev').addEventListener('click', function () { go(cur - 1); });
    root.querySelector('.show-next').addEventListener('click', function () { go(cur + 1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    var x0 = null, y0 = 0;
    var area = root.querySelector('.show-slides');
    area.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } else x0 = null; }, { passive: true });
    function end(e) {
      if (x0 === null) return;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
    }
    area.addEventListener('touchend', end);
    area.addEventListener('touchcancel', end);
    load(slides[1]);
    // (the first photo's drift starts once the logo screen has gone)
    function start() {
      if (!document.contains(root)) return;
      Array.prototype.forEach.call(slides[0].querySelectorAll('.show-photo, .show-drift'), function (el) { el.style.transform = ''; });
      schedule();
    }
    if (document.documentElement.classList.contains('splash')) {
      root.classList.add('paused');
      document.addEventListener('splashdone', start, { once: true });
    } else start();
  }
  // the magnifying strip behind the header stays with the header as the
  // page scrolls (the photo slides through it)
  function lens() {
    if (root && document.contains(root)) root.style.setProperty('--s', document.body.scrollTop + 'px');
  }
  document.body.addEventListener('scroll', lens, { passive: true });
  // the photos run up behind the see-through header: the page is pulled up by its height
  var header = document.querySelector('.site-header');
  function measure() { if (header) document.documentElement.style.setProperty('--hdr', header.getBoundingClientRect().height + 'px'); lens(); }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  document.addEventListener('keydown', function (e) {
    if (!root || !document.contains(root) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('.lightbox.open, .cart-drawer.open, .site-nav.open')) return;
    if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1);
  });
  // a hidden tab doesn't run the clock down
  document.addEventListener('visibilitychange', function () {
    if (!root || !document.contains(root)) return;
    if (document.hidden) { clearTimeout(timer); root.classList.add('paused'); } else schedule();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
  document.addEventListener('pageswap:done', setup);
})();

// Paint: the hidden drawing page (5 clicks on the footer's spinning mark).
// Tools down the left: brush (with a list of brushes), eraser, smudge, blur,
// line, shapes (a list), fill, gradient, text (a list of fonts), select &
// move, colour picker and hand; filled shapes and mirror. Down the right:
// two colours, swatches, recent colours, size, opacity, undo / redo, open,
// clear, layers and SAVE. The picture can be zoomed (pinch, ctrl + scroll,
// the corner buttons) and moved around (hand, space, two fingers). An Apple
// Pencil's pressure thickens and thins the line. Strokes are drawn on a
// see-through sheet on top while the pointer is down, then laid onto the
// layer, so a stroke's opacity stays even.
(function () {
  var SWATCHES = ['#141414', '#ffffff', '#8a8a8a', '#d6332f', '#f08a24', '#f5d33a', '#3fa34d', '#2f7fd6', '#7b4bc9', '#e36aa6', '#8b5a2b', '#1f3d5c'];
  var BRUSHES = [['round', 'Round'], ['feather', 'Feather'], ['marker', 'Marker'], ['pencil', 'Pencil'], ['spray', 'Spray'], ['calligraphy', 'Calligraphy'], ['highlighter', 'Highlighter']];
  var SHAPES = [['rect', 'Rectangle'], ['rounded', 'Rounded'], ['ellipse', 'Ellipse'], ['triangle', 'Triangle'], ['star', 'Star'], ['arrow', 'Arrow']];
  var FONTS = [['Jost, "Helvetica Neue", Arial, sans-serif', 'Jost'], ['Georgia, "Times New Roman", serif', 'Serif'], ['"Courier New", Courier, monospace', 'Typewriter'], ['"Marker Felt", "Chalkboard SE", "Comic Sans MS", cursive', 'Marker'], ['Impact, "Arial Black", sans-serif', 'Poster']];
  var app = null;

  function init(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    var $ = function (q) { return root.querySelector(q); };
    var stage = $('.paint-stage'), world = $('.paint-world'), stack = $('.paint-layers'), guide = $('.paint-guide');
    var ov = $('.paint-over'), octx = ov.getContext('2d');
    var colorIn = $('.paint-current input'), colorDot = $('.paint-current span');
    var color2In = $('.paint-second input'), color2Dot = $('.paint-second span');
    var sizeIn = $('.paint-size'), alphaIn = $('.paint-alpha'), zoomVal = $('.paint-zoom-val'), selbar = $('.paint-selbar');
    var left = $('.paint-left'), right = $('.paint-right');
    var st = { tool: 'brush', brush: 'round', shape: 'rect', font: FONTS[0][0], color: colorIn.value, color2: color2In.value,
      size: +sizeIn.value, alpha: +alphaIn.value / 100, solid: false, mirror: false };
    var W = 0, H = 0, R = 1, view = { k: 1, x: 0, y: 0 }, fitK = 1;
    var layers = [], active = null, undo = [], redo = [], LIMIT = 14, recent = [];

    // ---- the picture: a stack of layers, zoomed and moved as one ----
    W = Math.max(1, Math.round(stage.clientWidth)); H = Math.max(1, Math.round(stage.clientHeight));
    R = Math.min(window.devicePixelRatio || 1, 2);
    world.style.width = W + 'px'; world.style.height = H + 'px';
    ov.width = Math.round(W * R); ov.height = Math.round(H * R); ov.style.width = W + 'px'; ov.style.height = H + 'px';
    function base(c) { c.setTransform(R, 0, 0, R, 0, 0); }
    base(octx);
    var count = 1;
    function makeLayer(name, white) {
      var c = document.createElement('canvas');
      c.width = ov.width; c.height = ov.height; c.style.width = W + 'px'; c.style.height = H + 'px';
      var x = c.getContext('2d', { willReadFrequently: true }); base(x);
      if (white) { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); }
      return { cv: c, ctx: x, name: name, visible: true };
    }
    function mount() {
      stack.innerHTML = '';
      layers.forEach(function (L) { L.cv.style.visibility = L.visible ? '' : 'hidden'; stack.appendChild(L.cv); });
      renderLayers();
    }
    layers.push(makeLayer('Background', true)); active = layers[0]; mount();

    function applyView() {
      world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
      zoomVal.textContent = Math.round(view.k / fitK * 100) + '%';
      if (textBox) placeTextBox();
    }
    function fit() {
      var sw = stage.clientWidth, sh = stage.clientHeight;
      if (!sw || !sh) return;
      fitK = Math.min(sw / W, sh / H);
      view.k = fitK; view.x = (sw - W * fitK) / 2; view.y = (sh - H * fitK) / 2;
      applyView();
    }
    function zoomAt(k, cx, cy) {
      k = Math.max(fitK * 0.25, Math.min(fitK * 8, k));
      view.x = cx - (cx - view.x) * k / view.k; view.y = cy - (cy - view.y) * k / view.k; view.k = k;
      applyView();
    }
    function pos(e) { var r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k }; }

    // ---- colours ----
    var sw = $('.paint-swatches');
    SWATCHES.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.style.background = c; b.dataset.color = c; b.setAttribute('aria-label', 'Colour ' + c);
      sw.appendChild(b);
    });
    var recentBox = $('.paint-recent');
    function setColor(c) {
      st.color = c; colorIn.value = c; colorDot.style.background = c;
      Array.prototype.forEach.call(root.querySelectorAll('.paint-swatches button, .paint-recent button'), function (b) { b.classList.toggle('on', b.dataset.color.toLowerCase() === c.toLowerCase()); });
    }
    function setColor2(c) { st.color2 = c; color2In.value = c; color2Dot.style.background = c; }
    function useColor() {
      // the last few colours used, as quick swatches
      var c = st.color.toLowerCase();
      recent = [c].concat(recent.filter(function (x) { return x !== c; })).slice(0, 4);
      recentBox.innerHTML = recent.map(function (x) { return '<button type="button" data-color="' + x + '" style="background:' + x + '" aria-label="Recent colour ' + x + '"></button>'; }).join('');
      setColor(st.color);
    }
    function setSize(v) { st.size = Math.max(1, Math.min(80, Math.round(v))); sizeIn.value = st.size; sizeIn.nextElementSibling.textContent = st.size; }

    // ---- lists that open beside a tool: brushes, shapes, fonts ----
    var menus = {};
    function makeMenu(tool, items, key, sample) {
      var m = document.createElement('div');
      m.className = 'paint-brushes'; m.setAttribute('role', 'menu'); m.hidden = true;
      m.innerHTML = items.map(function (it) {
        return '<button type="button" role="menuitemradio" data-pick="' + key + '" data-val="' + it[0].replace(/"/g, '&quot;') + '">' + sample(it) + '<span>' + it[1].toUpperCase() + '</span></button>';
      }).join('');
      left.appendChild(m);
      menus[tool] = { el: m, key: key };
    }
    makeMenu('brush', BRUSHES, 'brush', function (b) { return '<i class="pb-' + b[0] + '"></i>'; });
    makeMenu('shape', SHAPES, 'shape', function (s) { return '<i class="ps-' + s[0] + '"></i>'; });
    makeMenu('text', FONTS, 'font', function (f) { return '<i class="pf" style="font-family:' + f[0].replace(/"/g, '\'') + '">Aa</i>'; });
    function openMenu(tool) {
      Object.keys(menus).forEach(function (t) {
        var m = menus[t], on = t === tool, btn = root.querySelector('button[data-tool="' + t + '"]');
        m.el.hidden = !on;
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (on) {
          m.el.style.top = Math.min(btn.offsetTop, left.clientHeight - m.el.offsetHeight) + 'px';
          Array.prototype.forEach.call(m.el.children, function (b) { b.setAttribute('aria-checked', b.dataset.val === st[m.key] ? 'true' : 'false'); });
        }
      });
    }
    function anyMenu() { return Object.keys(menus).some(function (t) { return !menus[t].el.hidden; }); }

    function setTool(t) {
      if (textBox) commitText();
      if (sel && t !== 'select' && t !== 'lasso') commitSelection();
      st.tool = t;
      Array.prototype.forEach.call(root.querySelectorAll('button[data-tool]'), function (b) { b.setAttribute('aria-pressed', b.dataset.tool === t ? 'true' : 'false'); });
      stage.dataset.tool = t;
      octx.clearRect(0, 0, W, H);
    }

    // ---- undo / redo: snapshots of one layer, or of the layer list ----
    function snapOf(L) { return L.ctx.getImageData(0, 0, L.cv.width, L.cv.height); }
    function push(e) { undo.push(e); if (undo.length > LIMIT) undo.shift(); redo = []; buttons(); }
    function remember() { push({ L: active, data: snapOf(active) }); }
    function rememberLayers() { push({ list: layers.slice(), active: active, vis: layers.map(function (L) { return L.visible; }) }); }
    function capture(e) { return e.L ? { L: e.L, data: snapOf(e.L) } : { list: layers.slice(), active: active, vis: layers.map(function (L) { return L.visible; }) }; }
    function apply(e) {
      if (e.L) { e.L.ctx.save(); e.L.ctx.setTransform(1, 0, 0, 1, 0, 0); e.L.ctx.putImageData(e.data, 0, 0); e.L.ctx.restore(); }
      else { layers = e.list.slice(); layers.forEach(function (L, i) { L.visible = e.vis[i]; }); active = layers.indexOf(e.active) >= 0 ? e.active : layers[layers.length - 1]; mount(); }
    }
    function doUndo() { if (textBox) commitText(); if (sel) commitSelection(); if (!undo.length) return; var e = undo.pop(); redo.push(capture(e)); apply(e); buttons(); }
    function doRedo() { if (!redo.length) return; var e = redo.pop(); undo.push(capture(e)); apply(e); buttons(); }
    function buttons() { $('[data-act="undo"]').disabled = !undo.length; $('[data-act="redo"]').disabled = !redo.length; }

    // ---- brushes ----
    var down = null, pts = [];
    function strokeStyle(c) { c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = st.size; c.strokeStyle = c.fillStyle = st.color; }
    function kind() { return st.tool === 'eraser' ? 'round' : st.brush; }
    function grain() {
      var g = document.createElement('canvas'); g.width = g.height = 48;
      var gx = g.getContext('2d'), c = parseInt(st.color.slice(1), 16), im = gx.createImageData(48, 48);
      for (var i = 0; i < im.data.length; i += 4) {
        im.data[i] = c >> 16 & 255; im.data[i + 1] = c >> 8 & 255; im.data[i + 2] = c & 255;
        im.data[i + 3] = Math.random() < 0.72 ? 120 + Math.random() * 135 : 0;
      }
      gx.putImageData(im, 0, 0);
      return octx.createPattern(g, 'repeat');
    }
    function brushStyle(c) {
      strokeStyle(c);
      var k = kind();
      if (k === 'marker') { c.lineCap = 'square'; c.lineJoin = 'miter'; }
      else if (k === 'highlighter') { c.lineCap = 'butt'; c.lineWidth = Math.max(10, st.size * 2.2); }
      else if (k === 'pencil') { c.lineWidth = Math.max(1, st.size * 0.4); c.strokeStyle = c.fillStyle = grain(); }
    }
    // everything drawn on the see-through sheet happens twice in mirror mode
    function both(c, fn) {
      fn();
      if (st.mirror) { c.save(); c.setTransform(-R, 0, 0, R, W * R, 0); fn(); c.restore(); }
    }
    function drawPath(c) {
      c.beginPath();
      if (pts.length === 1) { c.arc(pts[0].x, pts[0].y, c.lineWidth / 2, 0, Math.PI * 2); c.fill(); return; }
      c.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
      var l = pts[pts.length - 1]; c.lineTo(l.x, l.y); c.stroke();
    }
    function spray(c, p) {
      var r = Math.max(5, st.size * 1.6), n = Math.round(r * 0.9);
      c.fillStyle = st.color;
      for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, d = r * Math.sqrt(Math.random()); c.fillRect(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.2, 1.2); }
    }
    function nib(c, a, b) {
      var w = Math.max(1.5, st.size / 2), vx = w * Math.SQRT1_2, vy = -w * Math.SQRT1_2;
      c.fillStyle = st.color; c.beginPath();
      c.moveTo(a.x - vx, a.y - vy); c.lineTo(a.x + vx, a.y + vy); c.lineTo(b.x + vx, b.y + vy); c.lineTo(b.x - vx, b.y - vy);
      c.closePath(); c.fill();
    }
    // feather: the whole stroke as one very soft line (the line itself is
    // drawn off to the side; only its blurred shadow lands on the picture),
    // so there's nothing to stack up into rings
    var featherQueued = false;
    function featherStroke() {
      if (featherQueued) return;
      featherQueued = true;
      requestAnimationFrame(function () { if (featherQueued) featherNow(); });
    }
    function featherNow() {
      featherQueued = false;
      octx.clearRect(0, 0, W, H);
      var r = Math.max(3, st.size), OFF = W + 200;
      octx.save();
      octx.lineCap = 'round'; octx.lineJoin = 'round'; octx.lineWidth = r * 1.35;
      octx.strokeStyle = octx.fillStyle = '#000';
      octx.shadowColor = st.color; octx.shadowBlur = r * 0.85 * R; octx.shadowOffsetX = OFF * R; octx.shadowOffsetY = 0;
      [pts, st.mirror ? pts.map(function (q) { return { x: W - q.x, y: q.y }; }) : null].forEach(function (list) {
        if (!list || !list.length) return;
        octx.beginPath();
        if (list.length === 1) { octx.arc(list[0].x - OFF, list[0].y, r * 0.675, 0, Math.PI * 2); octx.fill(); return; }
        octx.moveTo(list[0].x - OFF, list[0].y);
        for (var i = 1; i < list.length - 1; i++) octx.quadraticCurveTo(list[i].x - OFF, list[i].y, (list[i].x + list[i + 1].x) / 2 - OFF, (list[i].y + list[i + 1].y) / 2);
        var l = list[list.length - 1]; octx.lineTo(l.x - OFF, l.y); octx.stroke();
      });
      octx.restore();
    }
    // an Apple Pencil: the line's width follows the pressure, smoothed (the
    // Pencil sometimes reports 0 between readings, which must not count as
    // a change), and it changes gradually along each little piece of the
    // line, so a light line never jumps into blobs
    function penWidth(base, raw) {
      var p = raw > 0 ? raw : (down.pr != null ? down.pr : 0.3);
      down.pr = down.pr == null ? p : down.pr * 0.6 + p * 0.4;
      return Math.max(0.6, base * (0.12 + 0.88 * Math.min(1, down.pr * 1.25)));
    }
    function taper(c, a, b, w0, w1) {
      var d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / Math.max(0.6, Math.min(w0, w1) / 2.5)));
      for (var i = 0; i < n; i++) {
        var t0 = i / n, t1 = (i + 1) / n;
        c.lineWidth = w0 + (w1 - w0) * t1;
        c.beginPath(); c.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0); c.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1); c.stroke();
      }
    }
    function pressed(c, a, b, raw) {
      var w1 = penWidth(c.base, raw), w0 = down.w != null ? down.w : w1;
      down.w = w1;
      both(c, function () { taper(c, a, b, w0, w1); });
    }
    function piecewise() { var k = kind(); return k === 'spray' || k === 'calligraphy' || (down && down.pen && k !== 'feather'); }
    var sprayTimer = 0;
    function segment(c, a, b, pr) {
      var k = kind();
      if (k !== 'spray' && k !== 'calligraphy') { pressed(c, a, b, pr); return; }
      both(c, function () { if (k === 'spray') spray(c, b); else nib(c, a, b); });
    }
    function commit(mode, alpha) {
      var c = active.ctx;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = alpha; if (mode) c.globalCompositeOperation = mode;
      c.drawImage(ov, 0, 0); c.restore();
      octx.clearRect(0, 0, W, H);
    }

    // ---- smudge and blur: worked straight into the layer, a dab at a time ----
    var carry = [null, null];
    function region(p) { var r = Math.max(4, st.size), s = Math.max(2, Math.round(2 * r * R)); return { x: Math.round((p.x - r) * R), y: Math.round((p.y - r) * R), s: s }; }
    function soft(cv) {
      // a soft round edge
      var x = cv.getContext('2d'), s = cv.width, g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, s, s); x.globalCompositeOperation = 'source-over';
    }
    function grab(q, into) {
      var c = into || document.createElement('canvas'); c.width = c.height = q.s;
      var x = c.getContext('2d'); x.clearRect(0, 0, q.s, q.s); x.drawImage(active.cv, q.x, q.y, q.s, q.s, 0, 0, q.s, q.s);
      return c;
    }
    function dab(p, i, first) {
      var q = region(p), c = active.ctx;
      if (st.tool === 'smudge') {
        if (first || !carry[i]) { carry[i] = grab(q); return; }
        var t = document.createElement('canvas'); t.width = t.height = q.s;
        t.getContext('2d').drawImage(carry[i], 0, 0, q.s, q.s); soft(t);
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.55 * st.alpha + 0.2; c.drawImage(t, q.x, q.y); c.restore();
        carry[i] = grab(q, carry[i]);
      } else {
        // blur: shrink the spot, grow it back (soft), and lay it over itself
        var small = document.createElement('canvas'), n = Math.max(2, Math.round(q.s / 5));
        small.width = small.height = n;
        small.getContext('2d').drawImage(active.cv, q.x, q.y, q.s, q.s, 0, 0, n, n);
        var t2 = document.createElement('canvas'); t2.width = t2.height = q.s;
        var tx = t2.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(small, 0, 0, q.s, q.s); soft(t2);
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.5 * st.alpha + 0.15; c.drawImage(t2, q.x, q.y); c.restore();
      }
    }
    function dabs(a, b, first) {
      var step = Math.max(1, st.size / 4), d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / step));
      for (var j = 1; j <= n; j++) {
        var p = { x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n };
        dab(p, 0, first && j === 1);
        if (st.mirror) dab({ x: W - p.x, y: p.y }, 1, first && j === 1);
      }
    }

    // ---- shapes ----
    function shapePath(c, a, b, shift) {
      var x = b.x, y = b.y, t = st.tool === 'line' ? 'line' : st.shape;
      if (shift && t === 'line') {
        var ang = Math.round(Math.atan2(y - a.y, x - a.x) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(x - a.x, y - a.y);
        x = a.x + Math.cos(ang) * len; y = a.y + Math.sin(ang) * len;
      } else if (shift) {
        var s = Math.max(Math.abs(x - a.x), Math.abs(y - a.y)); x = a.x + (x < a.x ? -s : s); y = a.y + (y < a.y ? -s : s);
      }
      var l = Math.min(a.x, x), tp = Math.min(a.y, y), w = Math.abs(x - a.x), h = Math.abs(y - a.y), cx = l + w / 2, cy = tp + h / 2;
      c.beginPath();
      if (t === 'line') { c.moveTo(a.x, a.y); c.lineTo(x, y); c.stroke(); return; }
      if (t === 'arrow') {
        // a line with a head at the end it's drawn to
        var an = Math.atan2(y - a.y, x - a.x), hl = Math.max(10, st.size * 3.2);
        c.moveTo(a.x, a.y); c.lineTo(x, y);
        c.moveTo(x - hl * Math.cos(an - 0.45), y - hl * Math.sin(an - 0.45)); c.lineTo(x, y); c.lineTo(x - hl * Math.cos(an + 0.45), y - hl * Math.sin(an + 0.45));
        c.stroke(); return;
      }
      if (t === 'rect') c.rect(l, tp, w, h);
      else if (t === 'rounded') { var r = Math.min(w, h) * 0.2; if (c.roundRect) c.roundRect(l, tp, w, h, r); else c.rect(l, tp, w, h); }
      else if (t === 'ellipse') c.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      else if (t === 'triangle') { c.moveTo(cx, tp); c.lineTo(l + w, tp + h); c.lineTo(l, tp + h); c.closePath(); }
      else if (t === 'star') {
        for (var i = 0; i < 10; i++) { var rr = i % 2 ? 0.42 : 1, ag = -Math.PI / 2 + i * Math.PI / 5; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(ag) * w / 2 * rr, cy + Math.sin(ag) * h / 2 * rr); }
        c.closePath();
      }
      if (st.solid) c.fill(); else c.stroke();
    }

    // ---- gradient: from the colour to the second colour, across the drag ----
    function gradient(a, b) {
      octx.clearRect(0, 0, W, H);
      var g = octx.createLinearGradient(a.x, a.y, b.x, b.y);
      // eased (smoothstep), so it fades in and out of each colour gently
      var c1 = parseInt(st.color.slice(1), 16), c2 = parseInt(st.color2.slice(1), 16);
      for (var i = 0; i <= 24; i++) {
        var t = i / 24, e = t * t * (3 - 2 * t), mix = function (sh) { var u = c1 >> sh & 255, v = c2 >> sh & 255; return Math.round(u + (v - u) * e); };
        g.addColorStop(t, 'rgb(' + mix(16) + ',' + mix(8) + ',' + mix(0) + ')');
      }
      octx.fillStyle = g;
      if (sel && sel.poly) { outline(octx, sel.x, sel.y, 1); octx.fill(); }
      else if (sel) octx.fillRect(sel.x, sel.y, sel.w, sel.h); else octx.fillRect(0, 0, W, H);
    }

    // a fine, invisible grain over the gradient as it's laid down: it breaks up
    // the steps a screen would otherwise show in a long, gentle blend
    function grainOver() {
      var d = octx.getImageData(0, 0, ov.width, ov.height), px = d.data;
      for (var i = 0; i < px.length; i += 4) {
        if (!px[i + 3]) continue;
        var n = (Math.random() + Math.random() - 1) * 2.2;
        px[i] += n; px[i + 1] += n; px[i + 2] += n;
      }
      octx.save(); octx.setTransform(1, 0, 0, 1, 0, 0); octx.putImageData(d, 0, 0); octx.restore();
    }

    // ---- fill and colour picker ----
    function hexOf(d) { return '#' + [d[0], d[1], d[2]].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
    function sampleAt(p) {
      var t = document.createElement('canvas'); t.width = t.height = 1;
      var x = t.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1, 1);
      layers.forEach(function (L) { if (L.visible) x.drawImage(L.cv, Math.floor(p.x * R), Math.floor(p.y * R), 1, 1, 0, 0, 1, 1); });
      return hexOf(x.getImageData(0, 0, 1, 1).data);
    }
    function fillAt(p) {
      var x0 = Math.floor(p.x * R), y0 = Math.floor(p.y * R), w = active.cv.width, h = active.cv.height;
      if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return;
      var img = active.ctx.getImageData(0, 0, w, h), d = img.data, i0 = (y0 * w + x0) * 4;
      var tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
      var c = parseInt(st.color.slice(1), 16), fr = c >> 16 & 255, fg = c >> 8 & 255, fb = c & 255, a = st.alpha;
      var seen = new Uint8Array(w * h), stack2 = [x0, y0];
      function like(k) { var j = k * 4; return Math.abs(d[j] - tr) + Math.abs(d[j + 1] - tg) + Math.abs(d[j + 2] - tb) + Math.abs(d[j + 3] - ta) <= 80; }
      function paint(j) {
        var da = d[j + 3] / 255, oa = a + da * (1 - a);
        d[j] = (fr * a + d[j] * da * (1 - a)) / oa; d[j + 1] = (fg * a + d[j + 1] * da * (1 - a)) / oa; d[j + 2] = (fb * a + d[j + 2] * da * (1 - a)) / oa; d[j + 3] = oa * 255;
      }
      while (stack2.length) {
        var y = stack2.pop(), x = stack2.pop(), k = y * w + x;
        while (x > 0 && !seen[k - 1] && like(k - 1)) { x--; k--; }
        var up = false, dn = false;
        while (x < w && !seen[k] && like(k)) {
          seen[k] = 1; paint(k * 4);
          if (y > 0) { var u = k - w; if (!seen[u] && like(u)) { if (!up) { stack2.push(x, y - 1); up = true; } } else up = false; }
          if (y < h - 1) { var v = k + w; if (!seen[v] && like(v)) { if (!dn) { stack2.push(x, y + 1); dn = true; } } else dn = false; }
          x++; k++;
        }
      }
      active.ctx.save(); active.ctx.setTransform(1, 0, 0, 1, 0, 0); active.ctx.putImageData(img, 0, 0); active.ctx.restore();
    }

    // ---- text: type where you tap; it's laid onto the layer when you're done ----
    var textBox = null, textAt = null;
    function fontSize() { return Math.max(14, st.size * 3); }
    function placeTextBox() {
      textBox.style.left = view.x + textAt.x * view.k + 'px'; textBox.style.top = view.y + textAt.y * view.k + 'px';
      textBox.style.fontSize = fontSize() * view.k + 'px';
    }
    function startText(p) {
      textAt = p;
      textBox = document.createElement('div');
      textBox.className = 'paint-text'; textBox.contentEditable = 'true'; textBox.spellcheck = false;
      textBox.style.fontFamily = st.font; textBox.style.color = st.color; textBox.style.opacity = st.alpha;
      stage.appendChild(textBox); placeTextBox();
      setTimeout(function () { textBox && textBox.focus({ preventScroll: true }); }, 0);
      textBox.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelText(); }
        else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
      });
      textBox.addEventListener('blur', function () { setTimeout(function () { if (textBox && document.activeElement !== textBox) commitText(); }, 0); });
    }
    function cancelText() { if (textBox) { textBox.remove(); textBox = null; } }
    function commitText() {
      if (!textBox) return;
      var lines = textBox.innerText.replace(/\n$/, '').split('\n'), fs = fontSize();
      cancelText();
      if (!lines.join('').trim()) return;
      remember();
      var c = active.ctx; c.save();
      c.font = fs + 'px ' + st.font; c.fillStyle = st.color; c.globalAlpha = st.alpha; c.textBaseline = 'top';
      lines.forEach(function (l, i) { c.fillText(l, textAt.x, textAt.y + i * fs * 1.2 + fs * 0.08); });
      c.restore();
      useColor();
    }

    // ---- select and move: a box round part of the layer; drag it to move it ----
    var sel = null, selMode = null, selOff = null, lasso = [];
    // (a lasso selection keeps its outline, relative to its box)
    function inSel(p) {
      if (!sel || p.x < sel.x || p.x > sel.x + sel.w || p.y < sel.y || p.y > sel.y + sel.h) return false;
      if (!sel.poly) return true;
      var x = p.x - sel.x, y = p.y - sel.y, inside = false, P = sel.poly;
      for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
        if ((P[i].y > y) !== (P[j].y > y) && x < (P[j].x - P[i].x) * (y - P[i].y) / (P[j].y - P[i].y) + P[i].x) inside = !inside;
      }
      return inside;
    }
    function outline(c, ox, oy, k) {
      c.beginPath();
      sel.poly.forEach(function (q, i) { c[i ? 'lineTo' : 'moveTo']((q.x + ox) * k, (q.y + oy) * k); });
      c.closePath();
    }
    function lift(keep) {
      // the pixels come up off the layer (or a copy of them does)
      if (sel.float) return;
      remember();
      var f = document.createElement('canvas'); f.width = Math.max(1, Math.round(sel.w * R)); f.height = Math.max(1, Math.round(sel.h * R));
      var fx = f.getContext('2d');
      fx.drawImage(active.cv, Math.round(sel.x * R), Math.round(sel.y * R), f.width, f.height, 0, 0, f.width, f.height);
      if (sel.poly) { fx.globalCompositeOperation = 'destination-in'; outline(fx, 0, 0, R); fx.fill(); fx.globalCompositeOperation = 'source-over'; }
      if (!keep) {
        var c = active.ctx; c.save();
        if (sel.poly) { outline(c, sel.x, sel.y, 1); c.clip(); }
        c.clearRect(sel.x, sel.y, sel.w, sel.h);
        if (active === layers[0]) { c.fillStyle = '#fff'; c.fillRect(sel.x, sel.y, sel.w, sel.h); }
        c.restore();
      }
      sel.float = f;
    }
    function drawSel() {
      octx.clearRect(0, 0, W, H);
      if (!sel) return;
      if (sel.float) octx.drawImage(sel.float, sel.x, sel.y, sel.w, sel.h);
      octx.save(); octx.lineWidth = 1 / view.k;
      var edge = function () { if (sel.poly) outline(octx, sel.x, sel.y, 1); else { octx.beginPath(); octx.rect(sel.x, sel.y, sel.w, sel.h); } octx.stroke(); };
      octx.setLineDash([5 / view.k, 4 / view.k]); octx.strokeStyle = '#000'; edge();
      octx.lineDashOffset = 4.5 / view.k; octx.strokeStyle = '#fff'; edge();
      octx.restore();
    }
    function commitSelection() {
      if (!sel) return;
      if (sel.float) { active.ctx.drawImage(sel.float, sel.x, sel.y, sel.w, sel.h); }
      sel = null; selbar.hidden = true; octx.clearRect(0, 0, W, H);
    }
    function selAction(a) {
      if (!sel) return;
      if (a === 'done') { commitSelection(); return; }
      if (a === 'layer') {
        // CUT TO LAYER: the selection comes out onto a layer of its own
        lift();
        rememberLayers();
        var L = makeLayer('Cutout', false); L.ctx.drawImage(sel.float, sel.x, sel.y, sel.w, sel.h);
        layers.splice(layers.indexOf(active) + 1, 0, L); active = L;
        sel = null; selbar.hidden = true; octx.clearRect(0, 0, W, H); mount(); return;
      }
      if (a === 'delete') { if (!sel.float) lift(); sel.float = null; sel = null; selbar.hidden = true; octx.clearRect(0, 0, W, H); return; }
      if (a === 'copy') {
        if (sel.float) active.ctx.drawImage(sel.float, sel.x, sel.y, sel.w, sel.h); else lift(true);
        sel.x += 14; sel.y += 14; drawSel(); return;
      }
      lift();
      var f = sel.float, g = document.createElement('canvas'); g.width = f.width; g.height = f.height;
      var gx = g.getContext('2d');
      if (a === 'fliph') { gx.translate(f.width, 0); gx.scale(-1, 1); } else { gx.translate(0, f.height); gx.scale(1, -1); }
      gx.drawImage(f, 0, 0); sel.float = g;
      if (sel.poly) sel.poly = sel.poly.map(function (q) { return a === 'fliph' ? { x: sel.w - q.x, y: q.y } : { x: q.x, y: sel.h - q.y }; });
      drawSel();
    }

    // ---- layers ----
    var panel = document.createElement('div');
    panel.className = 'paint-layerpanel'; panel.hidden = true;
    right.appendChild(panel);
    renderLayers();
    function renderLayers() {
      if (!panel) return;
      var rows = layers.slice().reverse().map(function (L) {
        var i = layers.indexOf(L);
        return '<div class="pl-row' + (L === active ? ' on' : '') + '" data-i="' + i + '">' +
          '<button type="button" class="pl-eye" data-layer-eye="' + i + '" aria-label="' + (L.visible ? 'Hide' : 'Show') + ' ' + L.name + '" aria-pressed="' + (!L.visible) + '">' +
            '<svg viewBox="0 0 24 24">' + (L.visible ? '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>' : '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.6 3.3M6.4 7.6A15 15 0 0 0 2.5 12s3.5 6 9.5 6a9 9 0 0 0 4.1-1"/>') + '</svg></button>' +
          '<button type="button" class="pl-name" data-layer="' + i + '" title="Tap again to rename">' + L.name.replace(/[<&]/g, function (ch) { return ch === '<' ? '&lt;' : '&amp;'; }) + '</button>' +
          '<span class="pl-grip" aria-label="Drag to reorder" title="Drag to reorder"><svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="1.3"/><circle cx="15" cy="7" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="17" r="1.3"/><circle cx="15" cy="17" r="1.3"/></svg></span></div>';
      }).join('');
      panel.innerHTML = '<div class="pl-title">LAYERS</div><div class="pl-list">' + rows + '</div>' +
        '<div class="pl-acts">' +
          '<button type="button" data-layer-act="add" title="New layer" aria-label="New layer"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>' +
          '<button type="button" data-layer-act="up" title="Move up" aria-label="Move layer up"' + (layers.indexOf(active) === layers.length - 1 ? ' disabled' : '') + '><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>' +
          '<button type="button" data-layer-act="down" title="Move down" aria-label="Move layer down"' + (layers.indexOf(active) === 0 ? ' disabled' : '') + '><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button>' +
          '<button type="button" data-layer-act="delete" title="Delete layer" aria-label="Delete layer"' + (layers.length < 2 ? ' disabled' : '') + '><svg viewBox="0 0 24 24"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7l1 12h8l1-12"/></svg></button>' +
        '</div>';
    }
    function layerPanel(open) {
      panel.hidden = !open;
      $('[data-act="layers"]').setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var b = $('[data-act="layers"]'); panel.style.top = Math.max(0, Math.min(b.offsetTop - panel.offsetHeight + b.offsetHeight, right.clientHeight - panel.offsetHeight)) + 'px'; }
    }
    // renaming: tap the picked layer's name again (or double-click any name)
    function rename(i) {
      var btn = panel.querySelector('[data-layer="' + i + '"]'); if (!btn) return;
      var L = layers[i], inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'pl-input'; inp.value = L.name; inp.maxLength = 24; inp.setAttribute('aria-label', 'Layer name');
      btn.replaceWith(inp); inp.focus({ preventScroll: true }); inp.select();
      var done = false;
      function finish(keep) {
        if (done) return; done = true;
        if (keep && inp.value.trim()) L.name = inp.value.trim();
        renderLayers(); layerPanel(true);
      }
      inp.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); });
      inp.addEventListener('blur', function () { finish(true); });
    }
    panel.addEventListener('dblclick', function (e) { var n = e.target.closest('[data-layer]'); if (n) rename(+n.dataset.layer); });
    // reordering: drag a layer by its grip
    panel.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('.pl-grip'); if (!g) return;
      e.preventDefault(); e.stopPropagation();
      var row = g.closest('.pl-row'), list = row.parentNode, y0 = e.clientY;
      try { g.setPointerCapture(e.pointerId); } catch (x) {}
      row.classList.add('dragging');
      function mv(ev) {
        var dy = ev.clientY - y0, prev = row.previousElementSibling, next = row.nextElementSibling;
        if (next && dy > next.offsetHeight / 2) { list.insertBefore(next, row); y0 += next.offsetHeight + 2; }
        else if (prev && dy < -prev.offsetHeight / 2) { list.insertBefore(row, prev); y0 -= prev.offsetHeight + 2; }
        row.style.transform = 'translateY(' + (ev.clientY - y0) + 'px)';
      }
      function up() {
        g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
        row.classList.remove('dragging'); row.style.transform = '';
        // the list shows the top layer first
        var order = Array.prototype.map.call(list.children, function (r) { return layers[+r.dataset.i]; }).reverse();
        if (order.some(function (L, i) { return L !== layers[i]; })) { if (sel) commitSelection(); rememberLayers(); layers = order; mount(); }
        else renderLayers();
        layerPanel(true);
      }
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
    });
    function layerAct(a) {
      if (sel) commitSelection();
      var i = layers.indexOf(active);
      if (a === 'add') {
        if (layers.length >= 10) return;
        rememberLayers();
        var L = makeLayer('Layer ' + (++count), false); layers.splice(i + 1, 0, L); active = L;
      } else if (a === 'delete') {
        if (layers.length < 2) return;
        rememberLayers();
        layers.splice(i, 1); active = layers[Math.max(0, i - 1)];
      } else if (a === 'up' && i < layers.length - 1) {
        rememberLayers(); layers.splice(i, 1); layers.splice(i + 1, 0, active);
      } else if (a === 'down' && i > 0) {
        rememberLayers(); layers.splice(i, 1); layers.splice(i - 1, 0, active);
      } else return;
      mount(); layerPanel(true);
    }

    // ---- the mouse's brush-size ring ----
    function ring(p) {
      octx.clearRect(0, 0, W, H);
      if (sel) { drawSel(); return; }
      if (!p || !/brush|eraser|smudge|blur/.test(st.tool)) return;
      var r = st.tool === 'brush' && st.brush === 'highlighter' ? Math.max(10, st.size * 2.2) / 2 : (st.tool === 'smudge' || st.tool === 'blur' ? Math.max(4, st.size) : st.size / 2);
      octx.save(); octx.lineWidth = 1 / view.k;
      octx.strokeStyle = 'rgba(0,0,0,.5)'; octx.beginPath(); octx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2); octx.stroke();
      octx.strokeStyle = 'rgba(255,255,255,.75)'; octx.beginPath(); octx.arc(p.x, p.y, Math.max(1, r) + 1 / view.k, 0, Math.PI * 2); octx.stroke();
      octx.restore();
    }

    // ---- pointers: drawing, moving the picture around, pinching to zoom ----
    var pointers = {}, gesture = null, pan = null, spaceDown = false;
    function screen(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function cancelStroke() {
      if (!down) return;
      clearInterval(sprayTimer);
      if (down.snap) { var e = undo.pop(); if (e) apply(e); buttons(); }
      down = null; octx.clearRect(0, 0, W, H);
    }
    function begin(e) {
      var p = pos(e), t = st.tool;
      if (t !== 'select' && t !== 'lasso' && sel) commitSelection();
      if (t === 'picker') { setColor(sampleAt(p)); setTool('brush'); return; }
      if (t === 'text') { if (textBox) { commitText(); return; } startText(p); return; }
      if (t === 'select' || t === 'lasso') {
        if (inSel(p)) { selMode = 'move'; selOff = { x: p.x - sel.x, y: p.y - sel.y }; lift(); }
        else if (t === 'lasso') { commitSelection(); selMode = 'lasso'; lasso = [p]; }
        else { commitSelection(); selMode = 'new'; sel = { x: p.x, y: p.y, w: 0, h: 0, ax: p.x, ay: p.y, float: null }; }
        down = { id: e.pointerId, start: p, last: p };
        return;
      }
      if (t === 'fill') { remember(); fillAt(p); if (st.mirror) fillAt({ x: W - p.x, y: p.y }); useColor(); return; }
      remember();
      down = { id: e.pointerId, start: p, last: p, pen: e.pointerType === 'pen', snap: true };
      pts = [p];
      octx.clearRect(0, 0, W, H);
      if (t === 'smudge' || t === 'blur') { dabs(p, p, true); return; }
      if (t === 'gradient') return;
      if (t === 'eraser') {
        // the eraser works straight on the layer, so you see it as you go
        var c = active.ctx; c.save(); c.globalCompositeOperation = active === layers[0] ? 'source-over' : 'destination-out';
        strokeStyle(c); c.strokeStyle = c.fillStyle = '#fff'; c.base = st.size;
        if (down.pen) pressed(c, p, p, e.pressure);
        else both(c, function () { c.beginPath(); c.arc(p.x, p.y, st.size / 2, 0, Math.PI * 2); c.fill(); });
        c.restore(); return;
      }
      if (t === 'brush') {
        brushStyle(octx); octx.base = octx.lineWidth;
        if (piecewise()) {
          if (kind() === 'spray') { segment(octx, p, p, 0.5); sprayTimer = setInterval(function () { both(octx, function () { spray(octx, pts[pts.length - 1]); }); }, 35); }

          else segment(octx, p, p, e.pressure);
        } else if (kind() === 'feather') featherStroke();
        else both(octx, function () { drawPath(octx); });
        return;
      }
      strokeStyle(octx); // line and shapes
    }
    function move(e) {
      var evs = e.getCoalescedEvents && e.getCoalescedEvents().length ? e.getCoalescedEvents() : [e];
      var p = pos(e), t = st.tool;
      if (selMode === 'lasso') {
        // the cutout's outline follows the pointer
        evs.forEach(function (ev) { var q = pos(ev), l = lasso[lasso.length - 1]; if (Math.hypot(q.x - l.x, q.y - l.y) > 2 / view.k) lasso.push(q); });
        octx.clearRect(0, 0, W, H); octx.save(); octx.lineWidth = 1.2 / view.k; octx.setLineDash([5 / view.k, 4 / view.k]);
        octx.beginPath(); lasso.forEach(function (q, i) { octx[i ? 'lineTo' : 'moveTo'](q.x, q.y); });
        octx.strokeStyle = '#000'; octx.stroke(); octx.lineDashOffset = 4.5 / view.k; octx.strokeStyle = '#fff'; octx.stroke(); octx.restore();
        return;
      }
      if (t === 'select' || t === 'lasso') {
        if (selMode === 'move') { sel.x = p.x - selOff.x; sel.y = p.y - selOff.y; }
        else { sel.x = Math.min(sel.ax, p.x); sel.y = Math.min(sel.ay, p.y); sel.w = Math.abs(p.x - sel.ax); sel.h = Math.abs(p.y - sel.ay); }
        drawSel(); return;
      }
      if (t === 'smudge' || t === 'blur') { evs.forEach(function (ev) { var q = pos(ev); dabs(down.last, q, false); down.last = q; }); return; }
      if (t === 'gradient') { gradient(down.start, p); return; }
      if (t === 'eraser') {
        var c = active.ctx; c.save(); c.globalCompositeOperation = active === layers[0] ? 'source-over' : 'destination-out';
        strokeStyle(c); c.strokeStyle = c.fillStyle = '#fff'; c.base = st.size;
        evs.forEach(function (ev) {
          var q = pos(ev), l = down.last;
          if (down.pen) pressed(c, l, q, ev.pressure);
          else both(c, function () { c.lineWidth = st.size; c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(q.x, q.y); c.stroke(); });
          down.last = q;
        });
        c.restore(); return;
      }
      if (t === 'brush') {
        if (piecewise()) {
          evs.forEach(function (ev) { var q = pos(ev); segment(octx, down.last, q, ev.pressure); down.last = q; pts.push(q); });
        } else {
          evs.forEach(function (ev) { var q = pos(ev), l = pts[pts.length - 1]; if (Math.hypot(q.x - l.x, q.y - l.y) > 0.8 / view.k) pts.push(q); });
          if (kind() === 'feather') featherStroke();
          else { octx.clearRect(0, 0, W, H); brushStyle(octx); both(octx, function () { drawPath(octx); }); }
        }
        return;
      }
      // line and shapes
      octx.clearRect(0, 0, W, H); strokeStyle(octx);
      both(octx, function () { shapePath(octx, down.start, p, e.shiftKey); });
    }
    function end() {
      var t = st.tool;
      clearInterval(sprayTimer);
      if (selMode === 'lasso') {
        var xs = lasso.map(function (q) { return q.x; }), ys = lasso.map(function (q) { return q.y; });
        var x0 = Math.max(0, Math.min.apply(null, xs)), y0 = Math.max(0, Math.min.apply(null, ys));
        var x1 = Math.min(W, Math.max.apply(null, xs)), y1 = Math.min(H, Math.max.apply(null, ys));
        sel = lasso.length > 2 && x1 - x0 > 3 && y1 - y0 > 3 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, float: null, poly: lasso.map(function (q) { return { x: q.x - x0, y: q.y - y0 }; }) } : null;
        if (!sel) octx.clearRect(0, 0, W, H);
        selbar.hidden = !sel; selMode = null; down = null; drawSel(); return;
      }
      if (t === 'select' || t === 'lasso') {
        if (selMode === 'new' && (sel.w < 3 || sel.h < 3)) { sel = null; octx.clearRect(0, 0, W, H); }
        selbar.hidden = !sel; selMode = null; down = null; drawSel(); return;
      }
      down = null;
      if (t === 'smudge' || t === 'blur') { carry = [null, null]; return; }
      if (t === 'eraser') return;
      if (t === 'gradient') grainOver();
      // (a feather stroke's last frame is drawn before it's laid down)
      if (t === 'brush' && st.brush === 'feather' && featherQueued) featherNow();
      if (t === 'brush' && st.brush === 'highlighter') commit('multiply', Math.min(st.alpha, 0.45));
      else commit(null, st.alpha);
      useColor();
    }

    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.paint-zoom, .paint-selbar, .paint-text')) return;
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
      if (anyMenu()) openMenu(null);
      if (!panel.hidden) layerPanel(false);
      e.preventDefault();
      try { stage.setPointerCapture(e.pointerId); } catch (x) {}
      pointers[e.pointerId] = screen(e);
      var ids = Object.keys(pointers);
      if (ids.length === 2 && e.pointerType === 'touch') {
        // two fingers: pinch to zoom, drag to move the picture
        cancelStroke(); pan = null;
        var a = pointers[ids[0]], b = pointers[ids[1]];
        gesture = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: view.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, vx: view.x, vy: view.y };
        return;
      }
      if (ids.length > 1) return;
      if (st.tool === 'hand' || spaceDown || e.button === 1) { var s = screen(e); pan = { x: s.x, y: s.y, vx: view.x, vy: view.y }; stage.classList.add('panning'); return; }
      begin(e);
    });
    stage.addEventListener('pointermove', function (e) {
      if (pointers[e.pointerId]) pointers[e.pointerId] = screen(e);
      if (gesture) {
        var ids = Object.keys(pointers); if (ids.length < 2) return;
        var a = pointers[ids[0]], b = pointers[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var k = Math.max(fitK * 0.25, Math.min(fitK * 8, gesture.k * d / gesture.d));
        var px = (gesture.mx - gesture.vx) / gesture.k, py = (gesture.my - gesture.vy) / gesture.k;
        view.k = k; view.x = mx - px * k; view.y = my - py * k; applyView();
        return;
      }
      if (pan) { var s = screen(e); view.x = pan.vx + s.x - pan.x; view.y = pan.vy + s.y - pan.y; applyView(); return; }
      if (down && e.pointerId === down.id) { move(e); return; }
      if (!down && e.pointerType === 'mouse') ring(pos(e));
    });
    function up(e) {
      delete pointers[e.pointerId];
      if (gesture) { if (Object.keys(pointers).length < 2) gesture = null; return; }
      if (pan) { pan = null; stage.classList.remove('panning'); return; }
      if (down && e.pointerId === down.id) end();
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', function (e) { if (down && e.pointerId === down.id) cancelStroke(); up(e); });
    stage.addEventListener('pointerleave', function (e) { if (!down && e.pointerType === 'mouse' && !sel) octx.clearRect(0, 0, W, H); });
    // ctrl / cmd + scroll (and a trackpad pinch) zooms; scrolling moves a zoomed-in picture
    stage.addEventListener('wheel', function (e) {
      var s = screen(e);
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(view.k * Math.exp(-e.deltaY * 0.01), s.x, s.y); }
      else if (view.k > fitK * 1.01) { e.preventDefault(); view.x -= e.deltaX; view.y -= e.deltaY; applyView(); }
    }, { passive: false });
    var g0 = 1;
    stage.addEventListener('gesturestart', function (e) { e.preventDefault(); g0 = view.k; });
    stage.addEventListener('gesturechange', function (e) { e.preventDefault(); var s = screen(e); zoomAt(g0 * e.scale, s.x, s.y); });

    // ---- the buttons ----
    root.addEventListener('click', function (e) {
      var pk = e.target.closest('[data-pick]');
      if (pk) { st[pk.dataset.pick] = pk.dataset.val; openMenu(null); var tool = pk.dataset.pick === 'brush' ? 'brush' : pk.dataset.pick === 'shape' ? 'shape' : 'text'; setTool(tool); return; }
      var t = e.target.closest('button[data-tool]'); // (the picture carries data-tool too, for its cursor)
      if (t) {
        var tl = t.dataset.tool, reopen = menus[tl] && (st.tool !== tl || menus[tl].el.hidden);
        setTool(tl); openMenu(menus[tl] && reopen ? tl : null); return;
      }
      var s = e.target.closest('[data-color]'); if (s) { setColor(s.dataset.color); if (/eraser|picker|smudge|blur|hand|select|lasso/.test(st.tool)) setTool('brush'); return; }
      if (e.target.closest('.paint-swap')) { var c1 = st.color; setColor(st.color2); setColor2(c1); return; }
      if (e.target.closest('.paint-solid')) { st.solid = !st.solid; $('.paint-solid').setAttribute('aria-pressed', st.solid ? 'true' : 'false'); return; }
      if (e.target.closest('.paint-mirror')) { st.mirror = !st.mirror; $('.paint-mirror').setAttribute('aria-pressed', st.mirror ? 'true' : 'false'); guide.hidden = !st.mirror; return; }
      var z = e.target.closest('[data-zoom]');
      if (z) { var cx = stage.clientWidth / 2, cy = stage.clientHeight / 2; if (z.dataset.zoom === 'fit') fit(); else zoomAt(view.k * (z.dataset.zoom === 'in' ? 1.4 : 1 / 1.4), cx, cy); return; }
      var sa = e.target.closest('[data-sel]'); if (sa) { selAction(sa.dataset.sel); return; }
      var le = e.target.closest('[data-layer-eye]'); if (le) { var L = layers[+le.dataset.layerEye]; L.visible = !L.visible; mount(); layerPanel(true); return; }
      var ln = e.target.closest('[data-layer]');
      if (ln) { var L2 = layers[+ln.dataset.layer]; if (L2 === active) { rename(+ln.dataset.layer); return; } if (sel) commitSelection(); active = L2; renderLayers(); layerPanel(true); return; }
      var la = e.target.closest('[data-layer-act]'); if (la) { layerAct(la.dataset.layerAct); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'layers') { openMenu(null); layerPanel(panel.hidden); }
      else if (a.dataset.act === 'undo') doUndo();
      else if (a.dataset.act === 'redo') doRedo();
      else if (a.dataset.act === 'clear') {
        if (sel) commitSelection();
        remember(); active.ctx.clearRect(0, 0, W, H);
        if (active === layers[0]) { active.ctx.fillStyle = '#fff'; active.ctx.fillRect(0, 0, W, H); }
      }
      else if (a.dataset.act === 'save') save();
    });
    document.addEventListener('pointerdown', function (e) {
      if (!document.contains(root)) return;
      if (anyMenu() && !e.target.closest('.paint-brushes, button[data-tool]')) openMenu(null);
      if (!panel.hidden && !e.target.closest('.paint-layerpanel, [data-act="layers"]')) layerPanel(false);
    }, true);
    colorIn.addEventListener('input', function () { setColor(colorIn.value); if (/eraser|picker|smudge|blur|hand|select/.test(st.tool)) setTool('brush'); });
    color2In.addEventListener('input', function () { setColor2(color2In.value); });
    sizeIn.addEventListener('input', function () { setSize(+sizeIn.value); if (textBox) placeTextBox(); });
    alphaIn.addEventListener('input', function () { st.alpha = +alphaIn.value / 100; alphaIn.nextElementSibling.textContent = alphaIn.value; });
    $('.paint-open input').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var im = new Image();
      im.onload = function () {
        // the picture comes in on a layer of its own
        if (sel) commitSelection();
        rememberLayers();
        var L = makeLayer('Picture', false), k = Math.min(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
        L.ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
        layers.splice(layers.indexOf(active) + 1, 0, L); active = L; mount();
        URL.revokeObjectURL(im.src);
      };
      im.src = URL.createObjectURL(f);
      e.target.value = '';
    });
    function save() {
      if (textBox) commitText();
      if (sel) commitSelection();
      var out = document.createElement('canvas'); out.width = ov.width; out.height = ov.height;
      var x = out.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, out.width, out.height);
      layers.forEach(function (L) { if (L.visible) x.drawImage(L.cv, 0, 0); });
      out.toBlob(function (blob) {
        if (!blob) return;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'eyeseerc-drawing.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }, 'image/png');
    }

    setColor(st.color); setColor2(st.color2); setTool('brush'); buttons(); fit();
    app = {
      root: root, fit: fit,
      key: function (e) {
        var k = e.key.toLowerCase(), mod = e.metaKey || e.ctrlKey;
        if (e.target && (e.target.isContentEditable || (/input|textarea|select/i.test(e.target.tagName || '') && e.target.type !== 'range'))) return;
        if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
        if (mod && k === 'y') { e.preventDefault(); doRedo(); return; }
        if (mod || e.altKey) return;
        if (k === ' ') { if (!spaceDown) { spaceDown = true; stage.classList.add('space'); } e.preventDefault(); return; }
        if (k === 'escape') { openMenu(null); layerPanel(false); if (sel) commitSelection(); return; }
        if ((k === 'delete' || k === 'backspace') && sel) { e.preventDefault(); selAction('delete'); return; }
        if (k === 'enter' && sel) { selAction('done'); return; }
        var map = { b: 'brush', e: 'eraser', s: 'smudge', u: 'blur', l: 'line', r: 'shape', f: 'fill', g: 'gradient', t: 'text', m: 'select', q: 'lasso', i: 'picker', h: 'hand' };
        if (map[k]) setTool(map[k]);
        else if (k === 'x') { var c1 = st.color; setColor(st.color2); setColor2(c1); }
        else if (k === '[') setSize(st.size - (st.size > 10 ? 4 : 1));
        else if (k === ']') setSize(st.size + (st.size >= 10 ? 4 : 1));
        else if (k === '+' || k === '=') zoomAt(view.k * 1.4, stage.clientWidth / 2, stage.clientHeight / 2);
        else if (k === '-') zoomAt(view.k / 1.4, stage.clientWidth / 2, stage.clientHeight / 2);
        else if (k === '0') fit();
      },
      keyup: function (e) { if (e.key === ' ') { spaceDown = false; stage.classList.remove('space'); } }
    };
  }
  // the footer's spinning mark opens it, but only on the 5th click in a row
  // (each click gives the mark a little bump; a pause starts the count again)
  var clicks = 0, clickTimer = 0;
  document.addEventListener('click', function (e) {
    var m = e.target.closest && e.target.closest('.footer-mark-wrap');
    if (!m || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // already on the drawing page: BABBA!!!
    if (document.querySelector('main:not([aria-hidden]) .paint')) { e.preventDefault(); e.stopImmediatePropagation(); babba(); return; }
    clearTimeout(clickTimer);
    clicks++;
    if (clicks >= 5) { clicks = 0; return; } // the 5th click goes through to the page
    e.preventDefault(); e.stopImmediatePropagation();
    m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump');
    clickTimer = setTimeout(function () { clicks = 0; }, 1500);
  }, true);
  // the cat pops up for 5 seconds, then zooms off to the left
  var babbaOn = false;
  function babba() {
    if (babbaOn) return;
    babbaOn = true;
    var mark = document.querySelector('.footer-mark');
    var src = mark ? mark.getAttribute('src').replace(/home-mark\.png.*$/, 'babba.jpg') : '/images/babba.jpg';
    var el = document.createElement('div');
    el.className = 'babba'; el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<figure><img alt="Babba the cat" draggable="false"><figcaption>BABBA!!!</figcaption></figure>';
    var im = el.querySelector('img');
    var go = function () {
      document.body.appendChild(el);
      void el.offsetWidth; el.classList.add('in');
      setTimeout(function () { el.classList.add('out'); }, 5000);
      setTimeout(function () { el.remove(); babbaOn = false; }, 5700);
    };
    im.onload = go; im.onerror = function () { babbaOn = false; };
    im.src = src;
  }

  function setup() {
    var root = document.querySelector('main:not([aria-hidden]) .paint');
    if (root) init(root); else app = null;
  }
  window.addEventListener('resize', function () { if (app && document.contains(app.root)) app.fit(); });
  document.addEventListener('keydown', function (e) { if (app && document.contains(app.root)) app.key(e); });
  document.addEventListener('keyup', function (e) { if (app && document.contains(app.root)) app.keyup(e); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
  document.addEventListener('pageswap:done', setup);
})();
