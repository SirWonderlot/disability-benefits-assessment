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
