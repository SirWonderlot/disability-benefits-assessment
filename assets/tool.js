// Step counter ("Step 3 of 6"): count only the steps shown, since GAP and DTC
// are hidden for some people.
(function () {
  var steps = [].slice.call(document.querySelectorAll('.progress-step')).filter(function (s) {
    return s.style.display !== 'none';
  });
  steps.forEach(function (s, i) {
    if (!s.classList.contains('active')) return;
    var t = s.querySelector('.step-tracker');
    if (t) t.textContent = (i + 1) + ' of ' + steps.length;
  });
})();

// Ask age (18 to 64), residency and SIN once. The first page that asks keeps the
// question; later pages reuse the answer and hide their copy of it.
(function () {
  var MAP = {
    'cdb.html':   { age: 'age1864', resident: 'resident', sin: 'sin' },
    'cdcp.html':  { resident: 'resident' },
    'cpp-d.html': { age: 'age1864' },
    'rdsp.html':  { resident: 'resident', sin: 'sin' }
  };
  var page = location.pathname.split('/').pop() || 'index.html';
  var map = MAP[page];
  if (!map) return;
  var KEY = 'dbpAssessment';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(sk, v) {
    var all = load(); all.shared = all.shared || {};
    all.shared[sk] = { v: v, page: page };
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* storage unavailable */ }
  }
  // A DTC holder must already have a SIN (it is needed to apply for the DTC), so never ask them.
  var all0 = load();
  if (all0.profile && all0.profile.dtc === 'yes' && !(all0.shared && all0.shared.sin)) {
    all0.shared = all0.shared || {};
    all0.shared.sin = { v: 'yes', page: 'assessment.html' };
    try { localStorage.setItem(KEY, JSON.stringify(all0)); } catch (e) { /* storage unavailable */ }
  }
  var shared = load().shared || {};
  var skip = document.querySelector('.skip-btn');
  var skipDisplay = skip ? skip.style.display : '';
  document.querySelectorAll('.quiz-box .quiz-q[data-key]').forEach(function (q) {
    var sk = map[q.getAttribute('data-key')];
    if (!sk) return;
    var s = shared[sk];
    if (s && s.page !== page) {
      var btn = q.querySelector('.quiz-opt[data-value="' + s.v + '"]');
      if (btn) { btn.click(); q.style.display = 'none'; }
    } else {
      q.querySelectorAll('.quiz-opt').forEach(function (b) {
        b.addEventListener('click', function () { save(sk, b.getAttribute('data-value')); });
      });
    }
  });
  // Pre-filled answers should not hide "Skip this program".
  if (skip) skip.style.display = skipDisplay;
})();

// Anonymous progress for the assessments spreadsheet (a Google Sheet, through Apps Script):
// one row per visitor, by a random id kept with their answers, updated as they go: the pages
// visited, how far they got, and each program's result. No names, contact details or IP
// addresses are sent (see the privacy policy, section 2).
(function () {
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbxH3n2vdZZSmQOs3C-3mXQLoKuF_kkkICzhRvuZIcPRfQV6njWp_zmIDU2u0BMM57empQ/exec';
  var KEY = 'dbpAssessment';
  var ORDER = ['assessment.html', 'cdb.html', 'cdcp.html', 'cpp-d.html', 'gap.html', 'rdsp.html', 'next-steps.html'];
  var LABEL = { 'assessment.html': 'Start', 'cdb.html': 'CDB', 'cdcp.html': 'CDCP', 'cpp-d.html': 'CPP-D', 'gap.html': 'GAP', 'rdsp.html': 'RDSP', 'next-steps.html': 'Next steps' };
  var page = location.pathname.split('/').pop() || 'index.html';
  if (!LABEL[page]) return;
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return null; } }

  var all = load();
  if (!all) return;                                  // storage unavailable: nothing to follow
  var t = all.tracking || {};
  if (!/^[a-z0-9]{8,16}$/.test(t.id || '')) t.id = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 12);
  t.pages = t.pages || [];
  if (t.pages.indexOf(page) === -1) t.pages.push(page);
  all.tracking = t;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { return; }

  // A program's result: Eligible / Not eligible once answered, Skipped if the page was
  // opened but not answered, blank if never opened. GAP is offered only in B.C. and Ontario.
  function result(d, id, file) {
    var r = d[id];
    if (r && r.completed) return r.qualifies ? 'Eligible' : 'Not eligible';
    if (id === 'gap' && d.profile && d.profile.province && ['BC', 'ON'].indexOf(d.profile.province) === -1) return 'Not offered';
    return t.pages.indexOf(file) !== -1 ? 'Skipped' : '';
  }
  var last = '';
  function send() {
    var d = load() || {};
    var p = d.profile || {};
    var visited = ORDER.filter(function (f) { return t.pages.indexOf(f) !== -1; });
    var body = JSON.stringify({
      id: t.id,
      furthest: LABEL[visited[visited.length - 1]] || 'Start',
      pages: visited.map(function (f) { return LABEL[f]; }).join(', '),
      province: p.province || '', citizen: p.citizen || '', dtc: p.dtc || '',
      cdb: result(d, 'cdb', 'cdb.html'), cdcp: result(d, 'cdcp', 'cdcp.html'), cppd: result(d, 'cpp-d', 'cpp-d.html'),
      gap: result(d, 'gap', 'gap.html'), rdsp: result(d, 'rdsp', 'rdsp.html'),
      nextSteps: t.pages.indexOf('next-steps.html') !== -1
    });
    if (body === last) return;                       // nothing new since the last update
    last = body;
    try { fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: body }); } catch (e) { /* offline */ }
  }
  // On arriving (after the page's own scripts have read the answers), and again when they
  // leave or switch away, so answers given on this page are included.
  setTimeout(send, 1500);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(); });
  window.addEventListener('pagehide', send);
})();
