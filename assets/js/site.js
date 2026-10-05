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

  // On computers, open when the mouse moves over the menu icon and close
  // shortly after it leaves both the icon and the menu.
  if (window.matchMedia('(hover: hover)').matches) {
    var closeTimer;
    [toggle, nav].forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        clearTimeout(closeTimer);
        if (!nav.classList.contains('open')) hoverOpenedAt = Date.now();
        setOpen(true);
      });
      el.addEventListener('mouseleave', function () {
        closeTimer = setTimeout(function () { setOpen(false); }, 250);
      });
    });
  }
})();

// Full-screen photo viewer (click a photo to open; arrows / swipe to browse)
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  if (!links.length) return;

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML =
    '<button class="lb-close" aria-label="Close">&times;</button>' +
    '<button class="lb-prev" aria-label="Previous">&#8249;</button>' +
    '<img alt="">' +
    '<div class="lightbox-caption"></div>' +
    '<button class="lb-next" aria-label="Next">&#8250;</button>';
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
  function open(i) { show(i); box.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function close() { box.classList.remove('open'); document.body.style.overflow = ''; }

  links.forEach(function (link, i) {
    link.addEventListener('click', function (e) { e.preventDefault(); open(i); });
  });
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function () { show(index - 1); });
  box.querySelector('.lb-next').addEventListener('click', function () { show(index + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });

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
