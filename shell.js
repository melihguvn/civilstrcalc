/* shell.js — inject navigation chrome when content pages are accessed directly
 * Runs only when window.top === window.self (direct URL, not inside the iframe shell).
 * Safe to add to every pages/*.html — has zero effect when loaded inside the iframe.
 */
(function () {
  'use strict';
  if (window.self !== window.top) return; // inside iframe → do nothing

  var P = window.location.pathname;
  function _ap() {
    if (/\/beam\.html/.test(P))     return 'beam';
    if (/\/slab\.html/.test(P))     return 'slab';
    if (/\/column\.html/.test(P))   return 'column';
    if (/\/rebar\.html/.test(P))    return 'rebar';
    if (/\/steel\.html/.test(P))    return 'steel';
    if (/\/concrete\.html/.test(P)) return 'concrete';
    if (/\/development-length\.html/.test(P)) return 'devlen';
    return '';
  }
  var ap = _ap();
  function a(p)  { return ap === p ? ' sh-active' : ''; }
  function g(ps) { return ps.indexOf(ap) >= 0 ? ' sh-open' : ''; }

  // ── CSS ─────────────────────────────────────────────────────────────────────
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    ':root{--sh-h:60px;--sh-w:220px}',
    '@media(max-width:768px){:root{--sh-h:52px}}',
    /* offset body so content isn't hidden behind fixed header/sidebar */
    'body{padding-top:var(--sh-h)!important;padding-left:var(--sh-w)!important;',
    '     overflow:auto!important;height:auto!important;min-height:100vh!important}',
    '@media(max-width:768px){body{padding-left:0!important}}',
    /* header */
    '.sh-hdr{position:fixed;top:0;left:0;right:0;height:var(--sh-h);background:#1a2332;',
    '  display:flex;align-items:center;z-index:1000;border-bottom:2px solid #2a3a52}',
    '.sh-logo{width:var(--sh-w);flex-shrink:0;height:100%;display:flex;align-items:center;',
    '  padding:0 16px;text-decoration:none;box-shadow:inset -1px 0 0 rgba(255,255,255,.12)}',
    '.sh-logo img{height:42px;width:auto;display:block}',
    '.sh-logo-txt{font-family:"IBM Plex Sans Condensed",sans-serif;font-weight:700;',
    '  font-size:.95rem;color:#fff;letter-spacing:.02em}',
    '.sh-hdr-tag{flex:1;padding:0 20px;font-family:"IBM Plex Sans Condensed",sans-serif;',
    '  font-weight:700;font-size:.88rem;color:rgba(255,255,255,.9);letter-spacing:.05em;text-transform:uppercase}',
    '@media(max-width:768px){.sh-logo{width:auto;padding-left:60px}.sh-hdr-tag{display:none}}',
    /* hamburger */
    '.sh-ham{display:none;position:fixed;top:8px;left:8px;z-index:1100;background:#1a2332;',
    '  border:1px solid rgba(255,255,255,.2);border-radius:7px;width:40px;height:40px;',
    '  cursor:pointer;align-items:center;justify-content:center;flex-direction:column;gap:5px;padding:0}',
    '.sh-ham span{display:block;width:18px;height:2px;background:rgba(255,255,255,.85);',
    '  border-radius:2px;transition:all .22s}',
    '.sh-ham.sh-open span:nth-child(1){transform:translateY(7px) rotate(45deg)}',
    '.sh-ham.sh-open span:nth-child(2){opacity:0}',
    '.sh-ham.sh-open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}',
    '@media(max-width:768px){.sh-ham{display:flex}}',
    /* overlay */
    '.sh-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1050}',
    '.sh-ov.sh-open{display:block}',
    /* sidebar */
    '.sh-side{position:fixed;top:var(--sh-h);left:0;bottom:0;width:var(--sh-w);',
    '  background:#1f2d40;overflow-y:auto;z-index:1001;border-right:1px solid rgba(255,255,255,.06);',
    '  display:flex;flex-direction:column}',
    '@media(max-width:768px){.sh-side{top:0;transform:translateX(calc(-1*var(--sh-w)));',
    '  transition:transform .25s ease}.sh-side.sh-open{transform:translateX(0)}}',
    /* sidebar elements */
    '.sh-sec{font-family:"IBM Plex Mono",monospace;font-size:.57rem;font-weight:500;',
    '  letter-spacing:.17em;text-transform:uppercase;color:rgba(255,255,255,.24);padding:12px 16px 4px}',
    '.sh-gh{display:flex;align-items:center;gap:9px;padding:8px 16px;cursor:pointer;',
    '  border-left:3px solid transparent;color:rgba(255,255,255,.56);font-size:.8rem;',
    '  user-select:none;transition:background .14s}',
    '.sh-gh:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.88)}',
    '.sh-grp.sh-open .sh-gh{color:rgba(255,255,255,.88);border-left-color:rgba(58,143,212,.5)}',
    '.sh-arr{margin-left:auto;font-size:10px;transition:transform .18s;display:inline-block}',
    '.sh-grp:not(.sh-open) .sh-arr{transform:rotate(-90deg)}',
    '.sh-gb{display:none}.sh-grp.sh-open .sh-gb{display:block}',
    '.sh-sub{display:flex;align-items:center;padding:6px 16px 6px 38px;color:rgba(255,255,255,.44);',
    '  font-size:.76rem;text-decoration:none;border-left:3px solid transparent;transition:background .14s}',
    '.sh-sub:hover{background:rgba(255,255,255,.04);color:rgba(255,255,255,.78)}',
    '.sh-sub.sh-active{background:rgba(58,143,212,.12);border-left-color:#3a8fd4;color:#fff;font-weight:500}',
    '.sh-item{display:flex;align-items:center;gap:9px;padding:8px 16px;color:rgba(255,255,255,.56);',
    '  font-size:.8rem;text-decoration:none;border-left:3px solid transparent;transition:background .14s}',
    '.sh-item:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.88)}',
    '.sh-item.sh-active{background:rgba(58,143,212,.14);border-left-color:#3a8fd4;color:#fff;font-weight:500}',
    '.sh-div{height:1px;background:rgba(255,255,255,.06);margin:5px 14px}',
    '.sh-foot{margin-top:auto;padding:12px 16px;font-size:.6rem;color:rgba(255,255,255,.18);',
    '  border-top:1px solid rgba(255,255,255,.06);line-height:1.75}',
    '.sh-foot a{color:rgba(255,255,255,.35);text-decoration:none;font-size:.57rem;',
    '  transition:color .13s;margin-right:6px}',
    '.sh-foot a:hover{color:rgba(255,255,255,.7)}'
  ].join('');
  document.head.appendChild(styleEl);

  // ── SVG icons ───────────────────────────────────────────────────────────────
  var ic = {
    beam: '<svg width="15" height="15" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12c12 6 12 6 24 0M4 20c12 6 12 6 24 0"/><path d="M4 12v8M28 12v8" opacity=".5"/></svg>',
    devlen: '<svg width="15" height="15" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="16" x2="29" y2="16"/><circle cx="3" cy="16" r="2.5" fill="currentColor" stroke="none"/><circle cx="29" cy="16" r="2.5" fill="currentColor" stroke="none"/><path d="M9 11v10M16 11v10M23 11v10" stroke-width="1.5" opacity=".5"/></svg>',
    slab: '<svg width="15" height="15" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="24" height="12" rx="1.5"/><path d="M4 16h24" opacity=".5"/></svg>',
    col:  '<svg width="15" height="15" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="20" height="20" rx="1.5"/><circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="22" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="10" cy="22" r="1.5" fill="currentColor" stroke="none"/><circle cx="22" cy="22" r="1.5" fill="currentColor" stroke="none"/></svg>',
    st:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M12 3v18"/></svg>',
    rb:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v18M17 3v18"/><path d="M7 6l10-2M7 11l10-2M7 16l10-2M7 21l10-2"/></svg>',
    cn:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>'
  };

  function grp(icon, label, pages, subs) {
    return '<div class="sh-grp' + g(pages) + '">' +
      '<div class="sh-gh" onclick="this.closest(\'.sh-grp\').classList.toggle(\'sh-open\')">' +
        '<span>' + icon + '</span>' + label + '<span class="sh-arr">▾</span>' +
      '</div>' +
      '<div class="sh-gb">' + subs + '</div>' +
    '</div>';
  }
  function sub(href, label, page) {
    return '<a class="sh-sub' + a(page) + '" href="' + href + '">' + label + '</a>';
  }
  function item(href, icon, label, page) {
    return '<a class="sh-item' + a(page) + '" href="' + href + '"><span>' + icon + '</span>' + label + '</a>';
  }

  // ── Sidebar HTML ─────────────────────────────────────────────────────────────
  var sideHTML =
    '<div class="sh-sec">Concrete Design</div>' +
    grp(ic.beam, 'Beam Design', ['beam'],
      sub('/pages/beam.html#flexdesign', 'Flexural Design', 'beam') +
      sub('/pages/beam.html#flexcap',    'Flexural Capacity', '') +
      sub('/pages/beam.html#shear',      'Shear Design', '') +
      sub('/pages/beam.html#torsion',    'Torsion Design', '')) +
    grp(ic.slab, 'Slab Design', ['slab'],
      sub('/pages/slab.html#flexdesign',  'Flexural Design', 'slab') +
      sub('/pages/slab.html#flexcap',     'Flexural Capacity', '') +
      sub('/pages/slab.html#punchshear',  'Punching Design', '')) +
    grp(ic.col, 'Column Design', ['column'],
      sub('/pages/column.html#pmm',      'PMM Design', 'column') +
      sub('/pages/column.html#colshear', 'Shear Design', '')) +
    grp(ic.devlen, 'Dev. & Splice Length', ['devlen'],
      sub('/pages/development-length.html#straight', 'Straight Bar', 'devlen') +
      sub('/pages/development-length.html#hook',     'Standard Hook', '') +
      sub('/pages/development-length.html#splice',   'Lap Splice', '')) +
    '<div class="sh-div"></div>' +
    '<div class="sh-sec">Reference Tables</div>' +
    item('/pages/steel.html',    ic.st, 'Steel Sections',   'steel') +
    item('/pages/rebar.html',    ic.rb, 'Rebar Properties', 'rebar') +
    item('/pages/concrete.html', ic.cn, 'Concrete Classes', 'concrete') +
    '<div class="sh-foot">ACI 318 · Eurocode 2 · IS 456<br>AISC · EN 10365 · IS 808' +
      '<div style="margin-top:8px">' +
        '<a href="/about.html">About</a>' +
        '<a href="/contact.html">Contact</a>' +
        '<a href="/privacy.html">Privacy</a>' +
        '<a href="/terms.html">Terms</a>' +
      '</div>' +
    '</div>';

  // ── Build DOM elements ───────────────────────────────────────────────────────
  var ham = document.createElement('button');
  ham.className = 'sh-ham';
  ham.setAttribute('aria-label', 'Toggle navigation');
  ham.innerHTML = '<span></span><span></span><span></span>';

  var ov = document.createElement('div');
  ov.className = 'sh-ov';

  var hdr = document.createElement('header');
  hdr.className = 'sh-hdr';
  hdr.innerHTML =
    '<a class="sh-logo" href="/">' +
      '<img src="/Images/Logos/Logo-Smaller.png" alt="CivilStrCalc"' +
        ' onerror="this.style.display=\'none\';' +
        'var s=document.createElement(\'span\');s.className=\'sh-logo-txt\';' +
        's.textContent=\'CivilStrCalc\';this.parentNode.appendChild(s)">' +
    '</a>' +
    '<div class="sh-hdr-tag">Structural Engineering Tools</div>';

  var side = document.createElement('aside');
  side.className = 'sh-side';
  side.setAttribute('aria-label', 'Main navigation');
  side.innerHTML = sideHTML;

  // ── Toggle handlers ──────────────────────────────────────────────────────────
  function open()  { side.classList.add('sh-open'); ov.classList.add('sh-open'); ham.classList.add('sh-open'); }
  function close() { side.classList.remove('sh-open'); ov.classList.remove('sh-open'); ham.classList.remove('sh-open'); }
  function toggle(){ side.classList.contains('sh-open') ? close() : open(); }

  ham.addEventListener('click', toggle);
  ov.addEventListener('click', close);
  side.querySelectorAll('a').forEach(function (el) {
    el.addEventListener('click', function () { if (window.innerWidth <= 768) close(); });
  });

  // ── Inject into body ─────────────────────────────────────────────────────────
  // prepend inserts all nodes before the first existing child, in given order
  document.body.prepend(ham, ov, hdr, side);
})();
