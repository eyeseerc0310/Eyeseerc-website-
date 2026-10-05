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
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  if (!links.length) return;

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
  var allLinks = links.slice();
  allLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      links = allLinks.filter(function (l) { return !l.closest('.is-filtered-out'); });
      open(Math.max(0, links.indexOf(link)));
    });
  });
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lb-next').addEventListener('click', function () { show(index + 1); });
  var stage = box.querySelector('.lb-stage');
  box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) close(); });

  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  var startX = null;
  box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();

// COLOR / B&W buttons on the Photography page. The page shows one kind at a
// time: colour by default, black & white when B&W is tapped.
(function () {
  var bar = document.querySelector('.gallery-filter');
  if (!bar) return;
  var buttons = Array.prototype.slice.call(bar.querySelectorAll('button'));
  var items = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
  function apply(kind) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.filter === kind ? 'true' : 'false'); });
    items.forEach(function (it) { it.classList.toggle('is-filtered-out', it.dataset.kind !== kind); });
    try { history.replaceState(null, '', kind === 'bw' ? '#bw' : location.pathname + location.search); } catch (e) {}
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () { apply(b.dataset.filter); });
  });
  function fromAddress() { apply(location.hash === '#bw' ? 'bw' : 'color'); }
  window.addEventListener('hashchange', fromAddress);
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


// Moving between pages: fade the page out, then go. The next page fades
// itself in (see style.css). New tabs, other sites, email links and the
// photo viewer are left alone.
(function () {
  var root = document.documentElement;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    root.classList.add('page-leaving');
    setTimeout(function () { location.href = url.href; }, 300);
  });
  // coming back with the browser's back button shows the page again
  window.addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('page-leaving'); });
})();
