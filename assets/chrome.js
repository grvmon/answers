/* Header scroll state + mobile drawer, copied from acrenkey.com (grvmon/a-K website.min.js) */
const headerNav = document.getElementById('header-nav');

window.addEventListener('scroll', function () {
    if (headerNav) {
        if (window.scrollY > 30) {
            headerNav.classList.add('scrolled');
        } else {
            headerNav.classList.remove('scrolled');
        }
    }
}, { passive: true });

function ensureHeaderCtaBadges() {
    var navCtas = document.querySelectorAll('.header-nav .nav-cta-btn, .header-nav .primary-cta-btn, .header-nav .mobile-drawer-cta');
    navCtas.forEach(function (btn) {
        if (!btn.querySelector('.cta-arrow-badge')) {
            var badge = document.createElement('span');
            badge.className = 'cta-arrow-badge';
            badge.setAttribute('aria-hidden', 'true');
            badge.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4.5" y1="11.5" x2="11.5" y2="4.5"></line><polyline points="6.5 4.5 11.5 4.5 11.5 9.5"></polyline></svg>';
            btn.appendChild(badge);
        }
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureHeaderCtaBadges);
} else {
    ensureHeaderCtaBadges();
}
const mobileBtn = document.getElementById('mobile-toggle-btn');
const mobileDrawer = document.getElementById('mobile-drawer');
const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
const mobileDrawerClose = document.getElementById('mobile-drawer-close');
function openMobileDrawer() {
if (mobileDrawer) mobileDrawer.classList.add('is-active');
if (mobileNavOverlay) mobileNavOverlay.classList.add('is-active');
if (mobileBtn) {
mobileBtn.classList.add('is-active');
mobileBtn.setAttribute('aria-expanded', 'true');
}
document.body.classList.add('drawer-open');
}
function closeMobileDrawer() {
if (mobileDrawer) mobileDrawer.classList.remove('is-active');
if (mobileNavOverlay) mobileNavOverlay.classList.remove('is-active');
if (mobileBtn) {
mobileBtn.classList.remove('is-active');
mobileBtn.setAttribute('aria-expanded', 'false');
}
document.body.classList.remove('drawer-open');
}
if (mobileBtn) {
mobileBtn.addEventListener('click', function (e) {
e.stopPropagation();
if (mobileDrawer && mobileDrawer.classList.contains('is-active')) {
closeMobileDrawer();
} else {
openMobileDrawer();
}
});
}
if (mobileDrawerClose) {
mobileDrawerClose.addEventListener('click', function () {
closeMobileDrawer();
});
}
if (mobileNavOverlay) {
mobileNavOverlay.addEventListener('click', function () {
closeMobileDrawer();
});
}
document.addEventListener('keydown', function (e) {
if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('is-active')) {
closeMobileDrawer();
}
});
if (mobileDrawer) {
const drawerLinks = mobileDrawer.querySelectorAll('a');
drawerLinks.forEach(function (link) {
link.addEventListener('click', function () {
closeMobileDrawer();
});
});
}

/* Share buttons copy link handler */
document.addEventListener('DOMContentLoaded', function() {
  var copyButtons = document.querySelectorAll('[data-copy-link]');
  copyButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var done = function () {
        var original = button.getAttribute('title') || 'Copy article link';
        button.setAttribute('title', 'Link copied');
        button.style.color = '#804526';
        window.setTimeout(function () {
          button.setAttribute('title', original);
          button.style.color = '';
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(done).catch(function () {});
      }
    });
  });
});
