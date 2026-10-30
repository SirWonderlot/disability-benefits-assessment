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
