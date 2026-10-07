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
    var size = sizes[0] || null;
    if (size) unit = parseFloat(size.price) || unit;
    panel.innerHTML =
      '<div class="lb-panel-title"></div><p class="lb-panel-desc"></p>' +
      '<div class="lb-panel-row">' +
        '<div class="lb-qty"><button type="button" data-q="-1" aria-label="One fewer">\u2212</button><span>1</span><button type="button" data-q="1" aria-label="One more">+</button></div>' +
        '<div class="lb-panel-price"></div>' +
        '<button type="button" class="lb-panel-add"><span>ADD TO CART</span></button>' +
      '</div>' +
      (sizes.length ?
        '<div class="lb-size">' +
          '<button type="button" class="lb-size-btn" aria-haspopup="listbox" aria-expanded="false">' +
            '<span>SIZE</span><span class="lb-size-val"></span>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>' +
          '</button>' +
          '<div class="lb-size-list" role="listbox"></div>' +
        '</div>' : '');
    panel.querySelector('.lb-panel-title').textContent = d.title || '';
    panel.querySelector('.lb-panel-desc').textContent = d.desc || '';
    var qtyEl = panel.querySelector('.lb-qty span'), priceEl = panel.querySelector('.lb-panel-price');
    var sizeBox = panel.querySelector('.lb-size');
    if (sizeBox) {
      var list = sizeBox.querySelector('.lb-size-list');
      sizes.forEach(function (sz, i) {
        var o = document.createElement('button');
        o.type = 'button'; o.className = 'lb-size-opt'; o.setAttribute('role', 'option'); o.dataset.i = i;
        o.innerHTML = '<span></span><span></span>';
        o.firstChild.textContent = sz.size + ' in'; o.lastChild.textContent = money(parseFloat(sz.price) || 0);
        list.appendChild(o);
      });
    }
    function update() {
      qtyEl.textContent = qty;
      priceEl.textContent = link.hasAttribute('data-sold-out') ? 'Sold out' : money(unit * qty);
      if (sizeBox) {
        sizeBox.querySelector('.lb-size-val').textContent = size.size + ' IN';
        Array.prototype.forEach.call(sizeBox.querySelectorAll('.lb-size-opt'), function (o) {
          o.setAttribute('aria-selected', sizes[o.dataset.i] === size ? 'true' : 'false');
        });
      }
    }
    function sizeMenu(open) {
      if (!sizeBox) return;
      sizeBox.classList.toggle('open', open);
      sizeBox.querySelector('.lb-size-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    update();
    if (link.hasAttribute('data-sold-out')) {
      panel.querySelector('.lb-panel-add').hidden = true; panel.querySelector('.lb-qty').hidden = true;
      if (sizeBox) sizeBox.hidden = true;
    }
    panel.onclick = function (e) {
      var q = e.target.closest('[data-q]');
      if (q) { qty = Math.max(1, Math.min(99, qty + parseInt(q.dataset.q, 10))); update(); return; }
      if (e.target.closest('.lb-size-btn')) { sizeMenu(!sizeBox.classList.contains('open')); return; }
      var opt = e.target.closest('.lb-size-opt');
      if (opt) { size = sizes[opt.dataset.i]; unit = parseFloat(size.price) || 0; update(); sizeMenu(false); return; }
      sizeMenu(false);
      if (e.target.closest('.lb-panel-add') && window.eyeseercCart) {
        var sid = size ? '-' + size.size.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
        // (the cart slides in over the print, which stays open behind it)
        window.eyeseercCart.add({ id: d.id + sid, title: (d.title || '') + (size ? ' \u2014 ' + size.size + ' in' : ''),
          price: unit, image: d.image, variant: d.variant || '' }, qty);
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
    panel.style.width = img.getBoundingClientRect().width + 'px';
    img.style.transform = t;
    fitAdd();
  }
  window.addEventListener('resize', sizePanel);
  // a click anywhere else in the viewer closes an open SIZE list
  box.addEventListener('click', function (e) {
    var open = panel.querySelector('.lb-size.open');
    if (open && !open.contains(e.target)) { open.classList.remove('open'); open.querySelector('.lb-size-btn').setAttribute('aria-expanded', 'false'); }
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
    deck.style.opacity = 0; deck.style.pointerEvents = 'none'; img.style.opacity = '';
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
    if (window.innerWidth <= 760) { panel.style.width = (W - 2 * over) + 'px'; if (show !== deckShown) fitAdd(); }
    deck.style.opacity = show ? 1 : 0;
    deck.style.pointerEvents = show > 0.9 ? 'auto' : 'none';
    img.style.opacity = show ? 0 : '';
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
      deck.style.opacity = 0; deck.style.pointerEvents = 'none'; img.style.opacity = '';
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
    if (e.target !== box && e.target !== stage) return;
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
  // the cart icon opens the drawer too (the full cart page stays reachable
  // from it); caught early so the page doesn't change
  document.addEventListener('click', function (e) {
    var icon = e.target.closest && e.target.closest('.cart-link');
    if (!icon || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openDrawer();
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
