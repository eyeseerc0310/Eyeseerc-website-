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

    // Slow, gentle fade. Where the browser supports it, the whole page
    // dissolves from the old look to the new one as one picture. Photos on
    // screen are lifted out of that dissolve so they never lose contrast.
    if (document.startViewTransition) {
      var photos = Array.prototype.filter.call(
        document.querySelectorAll('.hero-photo img, .gallery-item img, .shop-photo img'),
        function (img) { var r = img.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight && r.width > 0; });
      photos.forEach(function (img, i) { img.style.viewTransitionName = 'photo-' + i; });
      var vt = document.startViewTransition(apply);
      var cleanUp = function () { photos.forEach(function (img) { img.style.viewTransitionName = ''; }); };
      vt.finished.then(cleanUp, cleanUp);
      return;
    }
    // Otherwise every colour eases to its new value together.
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
      '<figure class="lb-figure"><img alt=""><figcaption class="lightbox-caption"></figcaption></figure>' +
      '<button class="lb-next" aria-label="Next">&#8250;</button>' +
    '</div>';
  document.body.appendChild(box);

  var img = box.querySelector('img');
  var caption = box.querySelector('.lightbox-caption');
  var index = 0;

  function show(i) {
    index = (i + links.length) % links.length;
    img.src = links[index].href;
    img.alt = links[index].dataset.caption || '';
    caption.textContent = links[index].dataset.caption || '';
  }
  // Animate the big photo between its spot in the gallery and the centre
  // of the screen, so it looks like the clicked photo lifts up and grows.
  function thumbRect() {
    var t = links[index].querySelector('img');
    var r = t && t.getBoundingClientRect();
    var onScreen = r && r.bottom > 0 && r.top < window.innerHeight;
    return onScreen ? r : null;
  }
  function flip(from, reverse) {
    var to = img.getBoundingClientRect();
    if (!from || !to.width || !img.animate) return null;
    var scale = from.width / to.width;
    var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    var dy = (from.top + from.height / 2) - (to.top + to.height / 2);
    var start = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
    var frames = [{ transform: start }, { transform: 'none' }];
    return img.animate(reverse ? frames.reverse() : frames,
      { duration: 380, easing: 'cubic-bezier(.2, .7, .2, 1)' });
  }

  function open(i) {
    show(i);
    var from = thumbRect();
    box.classList.add('open');
    document.body.style.overflow = 'hidden';
    var go = function () {
      if (!flip(from) && img.animate) {
        img.animate([{ transform: 'scale(.9)' }, { transform: 'none' }],
          { duration: 300, easing: 'ease-out' });
      }
    };
    if (img.decode) img.decode().then(go, go); else go();
  }
  function close() {
    if (sliding) return;
    place(0); peekDir = 0; peek.classList.remove('show');
    caption.classList.remove('is-changing'); box.classList.remove('changing');
    var anim = flip(thumbRect(), true);
    box.classList.remove('open');
    document.body.style.overflow = '';
    if (!anim) {
      // nothing to shrink back into (tile is off-screen): close straight away
      box.classList.add('instant');
      setTimeout(function () { box.classList.remove('instant'); }, 50);
    }
  }

  // only browse the photos currently shown (e.g. just COLOR or just B&W)
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-lightbox]');
    if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    links = Array.prototype.filter.call(document.querySelectorAll('main:not([aria-hidden]) [data-lightbox]'),
      function (l) { return !l.closest('.is-filtered-out'); });
    open(Math.max(0, links.indexOf(link)));
  });
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function () { slide(-1); });
  box.querySelector('.lb-next').addEventListener('click', function () { slide(1); });
  var stage = box.querySelector('.lb-stage');
  box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) close(); });

  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
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
    if (sliding || e.touches.length !== 1 || e.target.closest('button')) return;
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
(function () {
  function apply(kind) {
    var bar = document.querySelector('main:not([aria-hidden]) .gallery-filter');
    if (!bar) return;
    var buttons = bar.querySelectorAll('button');
    if (!kind) kind = buttons[0].dataset.filter;
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute('aria-pressed', b.dataset.filter === kind ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('main:not([aria-hidden]) [data-kind]'), function (it) {
      it.classList.toggle('is-filtered-out', it.dataset.kind !== kind);
    });
    var hash = kind === buttons[0].dataset.filter ? '' : '#' + kind;
    try { history.replaceState(history.state, '', hash || location.pathname + location.search); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.gallery-filter button');
    if (b) apply(b.dataset.filter);
  });
  function fromAddress() {
    var bar = document.querySelector('main:not([aria-hidden]) .gallery-filter');
    if (!bar) return;
    var want = location.hash.slice(1);
    apply(want && bar.querySelector('button[data-filter="' + want + '"]') ? want : null);
  }
  window.addEventListener('hashchange', fromAddress);
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
