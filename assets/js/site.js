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
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (err) {}

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
  function buildPanel(link) {
    var d = link.dataset, unit = parseFloat(d.price) || 0, qty = 1;
    panel.innerHTML =
      '<div class="lb-panel-title"></div><p class="lb-panel-desc"></p>' +
      '<div class="lb-panel-row">' +
        '<div class="lb-qty"><button type="button" data-q="-1" aria-label="One fewer">\u2212</button><span>1</span><button type="button" data-q="1" aria-label="One more">+</button></div>' +
        '<div class="lb-panel-price"></div>' +
        '<button type="button" class="lb-panel-add">ADD TO CART</button>' +
      '</div>';
    panel.querySelector('.lb-panel-title').textContent = d.title || '';
    panel.querySelector('.lb-panel-desc').textContent = d.desc || '';
    var qtyEl = panel.querySelector('.lb-qty span'), priceEl = panel.querySelector('.lb-panel-price');
    function update() { qtyEl.textContent = qty; priceEl.textContent = link.hasAttribute('data-sold-out') ? 'Sold out' : money(unit * qty); }
    update();
    if (link.hasAttribute('data-sold-out')) { panel.querySelector('.lb-panel-add').hidden = true; panel.querySelector('.lb-qty').hidden = true; }
    panel.onclick = function (e) {
      var q = e.target.closest('[data-q]');
      if (q) { qty = Math.max(1, Math.min(99, qty + parseInt(q.dataset.q, 10))); update(); return; }
      if (e.target.closest('.lb-panel-add') && window.eyeseercCart) {
        window.eyeseercCart.add({ id: d.id, title: d.title, price: unit, image: d.image, variant: d.variant || '' }, qty);
        // tuck the viewer away and go to the cart
        box.classList.add('instant'); box.classList.remove('open', 'shop-mode');
        document.body.style.overflow = '';
        setTimeout(function () { box.classList.remove('instant'); }, 50);
        var cart = document.querySelector('.cart-link');
        if (cart) cart.click();
      }
    };
  }
  // the box is exactly as wide as the photo
  function sizePanel() {
    if (!box.classList.contains('shop-mode')) return;
    var t = img.style.transform; img.style.transform = '';
    panel.style.width = img.getBoundingClientRect().width + 'px';
    img.style.transform = t;
  }
  window.addEventListener('resize', sizePanel);

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
  function flip(from, reverse) {
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
    var small = { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')',
                  clipPath: 'inset(' + cropY + 'px ' + cropX + 'px)' };
    var big = { transform: base || 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px)' };
    var frames = reverse ? [big, small] : [small, big];
    // closing holds the last frame, so the photo stays in its tile's spot
    // until the viewer is gone (instead of jumping back to full size)
    return img.animate(frames,
      { duration: 380, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: reverse ? 'forwards' : 'none' });
  }

  // When the photo's tile is partly tucked under the sticky header, the
  // growing / shrinking photo is trimmed at the header's bottom edge as it
  // reaches the tile, so it slides under the header instead of covering it
  // and then popping behind it.
  function headerTrim(reverse) {
    var tile = thumbRect(), header = document.querySelector('.site-header');
    if (!tile || !header || !stage.animate) return null;
    var hb = header.getBoundingClientRect().bottom;
    if (tile.top >= hb) return null;
    var st = stage.getBoundingClientRect().top;
    function cut(y) { return 'polygon(-9999px ' + y + 'px, 9999px ' + y + 'px, 9999px 9999px, -9999px 9999px)'; }
    // from the top of the screen (nothing trimmed) to the header's bottom edge
    var frames = [{ clipPath: cut(-st) }, { clipPath: cut(hb - st) }];
    return stage.animate(reverse ? frames : frames.reverse(),
      { duration: 380, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: reverse ? 'forwards' : 'none' });
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
  function applyProg() {
    if (!geo) return;
    // past the details, keep scrolling down to the bottom of the page:
    // everything moves up and the footer (links and copyright) comes in
    var p2 = Math.max(0, prog - 1), fh = foot.offsetHeight;
    stage.style.transform = p2 ? 'translateY(' + (-p2 * fh) + 'px)' : '';
    foot.style.transform = 'translateY(' + ((1 - p2) * 100) + '%)';
    foot.style.opacity = p2;
    foot.style.pointerEvents = p2 > 0.6 ? '' : 'none';
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
  }
  function step() {
    prog += (target - prog) * 0.2;
    if (Math.abs(target - prog) < 0.002) prog = target;
    applyProg();
    raf = prog === target ? null : requestAnimationFrame(step);
  }
  function scrollTo(t) {
    target = Math.max(0, Math.min(2, t));
    if (!raf) raf = requestAnimationFrame(step);
  }
  function shopOpen() { return box.classList.contains('open') && box.classList.contains('shop-mode') && geo; }
  // One wheel / trackpad gesture moves one step (photo -> details -> footer),
  // however long its momentum keeps going; it then glides to that step.
  var gesture = null, gestureTimer;
  box.addEventListener('wheel', function (e) {
    if (!shopOpen()) return;
    e.preventDefault();
    var d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (!d) return;
    var dir = d > 0 ? 1 : -1;
    if (!gesture || gesture.dir !== dir) {
      var from = Math.round(target);
      gesture = { dir: dir, stop: Math.max(0, Math.min(2, from + dir)) };
    }
    var t = target + d / geo.D;
    scrollTo(dir > 0 ? Math.min(t, gesture.stop) : Math.max(t, gesture.stop));
    clearTimeout(gestureTimer);
    gestureTimer = setTimeout(function () { gesture = null; }, 220);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { if (gesture) scrollTo(gesture.stop); }, 90);
  }, { passive: false });
  var wheelTimer;
  var swipe = null, D_touch = 110;
  box.addEventListener('touchstart', function (e) {
    if (!shopOpen() || e.touches.length !== 1) return;
    swipe = { y: e.touches[0].clientY, t: target };
    D_touch = 110;
  }, { passive: true });
  box.addEventListener('touchmove', function (e) {
    if (!swipe || !shopOpen()) return;
    e.preventDefault();
    scrollTo(swipe.t + (swipe.y - e.touches[0].clientY) / D_touch);
  }, { passive: false });
  box.addEventListener('touchend', function () {
    if (!swipe) return;
    // let go and it finishes on its own: past a small nudge it goes all the way
    var moved = target - swipe.t;
    if (Math.abs(moved) > 0.08) scrollTo(moved > 0 ? Math.ceil(target - 0.001) : Math.floor(target + 0.001));
    else scrollTo(Math.round(swipe.t));
    swipe = null;
  });
  window.addEventListener('resize', function () { if (shopOpen()) { sizePanel(); shopGeo(); applyProg(); } });

  function open(i) {
    show(i);
    var from = thumbRect();
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    var go = function () {
      sizePanel();
      if (box.classList.contains('shop-mode')) {
        var siteFoot = document.querySelector('.site-footer');
        foot.innerHTML = siteFoot ? siteFoot.innerHTML : '';
        shopGeo(); prog = target = 0; applyProg();
      } else {
        geo = null; panel.style.transform = ''; panel.style.opacity = '';
      }
      headerTrim(false);
      if (!flip(from) && img.animate) {
        img.animate([{ transform: 'scale(.9)' }, { transform: 'none' }],
          { duration: 300, easing: 'ease-out' });
      }
    };
    if (img.decode) img.decode().then(go, go); else go();
  }
  function close() {
    if (sliding) return;
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
    var anim = flip(thumbRect(), true);
    var trim = anim ? headerTrim(true) : null;
    box.classList.remove('open');
    document.body.style.overflow = '';
    function hideNow() {
      box.classList.add('instant');
      setTimeout(function () {
        box.classList.remove('instant');
        if (anim) anim.cancel(); // reset the photo for next time, now that it's hidden
        if (trim) trim.cancel();
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
    if (shopItem) {
      links = [link]; // shop items open on their own: no browsing
      buildPanel(link);
    } else {
      panel.innerHTML = ''; panel.style.width = ''; img.style.transform = ''; geo = null;
      links = Array.prototype.filter.call(document.querySelectorAll('main:not([aria-hidden]) [data-lightbox]'),
        function (l) { return !l.closest('.is-filtered-out'); });
    }
    open(Math.max(0, links.indexOf(link)));
  });
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function () { slide(-1); });
  box.querySelector('.lb-next').addEventListener('click', function () { slide(1); });
  box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) close(); });

  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (shopOpen()) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); scrollTo(Math.floor(target + 0.001) + 1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); scrollTo(Math.ceil(target - 0.001) - 1); }
      return;
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
  function animateTo(from, to, ms, done) {
    sliding = true;
    var start = null;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
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
    preparePeek(dir);
    var start = fromDx || 0;
    var to = -dir * distance();
    var ms = Math.max(180, (fast ? 260 : 420) * Math.abs(to - start) / distance());
    animateTo(start, to, ms, function () { commit(dir); });
  }
  function springBack(fromDx) {
    animateTo(fromDx, 0, 260, function () {
      place(0); peekDir = 0; peek.classList.remove('show');
      caption.classList.remove('is-changing'); box.classList.remove('changing');
    });
  }

  box.addEventListener('touchstart', function (e) {
    if (sliding || e.touches.length !== 1 || e.target.closest('button') || box.classList.contains('shop-mode')) return;
    var t = e.touches[0];
    drag = { x: t.clientX, y: t.clientY, dx: 0, axis: null, lastX: t.clientX, lastT: Date.now(), v: 0 };
  }, { passive: true });
  box.addEventListener('touchmove', function (e) {
    if (!drag) return;
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
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.gallery-filter button');
    if (!b || busy) return;
    apply(b.dataset.filter, true);
  });
  function fromAddress() {
    var bar = currentBar();
    if (!bar) return;
    var want = location.hash.slice(1);
    apply(want && bar.querySelector('button[data-filter="' + want + '"]') ? want : null, false);
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
            history.replaceState({ y: window.scrollY }, '');
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
        window.scrollTo(0, scrollY || 0);
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

  function renderCart() {
    var root = document.querySelector('main:not([aria-hidden]) #cart-root');
    if (!root) return;
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
    }
  };

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
      // straight to the cart (with the usual page fade)
      var link = document.querySelector('.cart-link');
      if (link) link.click();
      return;
    }
    var btn = e.target.closest && e.target.closest('#cart-root [data-act]');
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
      var soon = document.querySelector('main:not([aria-hidden]) .cart-soon');
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
