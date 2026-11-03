/* Rohan Kishibe, "But I refuse" (だが断る): a two-button call that teaches target leakage with a real
   result, 0.806 AUC before the fix against 0.7401 after it. The page's own chart sits right below, so this
   module draws none. Heaven's Door opens the résumé. */

const sfx = name => document.dispatchEvent(new CustomEvent('sfx', { detail: { name } }));

const OUT = {
  ship: `<p class="jj-lead">That 0.806 is inflated.</p>
<p>Target information leaks into the features, and the random split mixes future rows into training, so the model gets to see the answer. Fix the leak and split by time, training on the past and testing on the future, and the honest AUC is 0.7401.</p>
<button type="button" class="jj-other">Try the other answer</button>`,
  refuse: `<p class="jj-sfx" aria-hidden="true">だが断る</p>
<p class="jj-lead">But I refuse.</p>
<p>These are real numbers from Telenav. I caught the leak, rebuilt the validation with time-aware splits and reported 0.7401, and the audit surfaced $127K of campaign waste.</p>
<a class="jj-door" href="Ayaz_Khan_Resume.pdf"><span class="jj-book" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="jj-dl">Heaven's Door: <span class="jj-dv">read the </span>résumé (PDF)</span></a>`,
};

export async function mount(root, opts = {}) {
  const uid = 'jj' + Math.random().toString(36).slice(2, 8);
  const el = document.createElement('div');
  el.className = 'jj-rohan';
  el.innerHTML = `<p class="jj-q" id="${uid}">A model scores 0.806 AUC on a random split. Ship it?</p>
<div class="jj-pick" role="group" aria-labelledby="${uid}"><button type="button" aria-pressed="false" data-c="ship">Ship it</button><button type="button" aria-pressed="false" data-c="refuse">But I refuse</button></div>
<div class="jj-out"></div><p class="jj-vh" aria-live="polite"></p>`;
  root.append(el);
  const out = el.querySelector('.jj-out'), live = el.querySelector('[aria-live]'), picks = [...el.querySelectorAll('[data-c]')];
  let paused = false;

  function choose(c) {
    picks.forEach(b => b.setAttribute('aria-pressed', b.dataset.c === c));
    out.innerHTML = OUT[c];
    const ps = out.querySelectorAll('p:not([aria-hidden])');
    live.textContent = ps[0].textContent + ' ' + ps[1].textContent;
    if (c === 'refuse') {
      sfx('refuse');
      if (!paused) out.querySelector('.jj-sfx').classList.add('jj-slam');   // a stopped clock gets the still frame
    } else {
      out.querySelector('.jj-other').addEventListener('click', () => { choose('refuse'); picks[1].focus(); });
    }
  }
  picks.forEach(b => b.addEventListener('click', () => choose(b.dataset.c)));

  const pause = () => { paused = true; el.classList.add('jj-still'); };
  const resume = () => { paused = false; el.classList.remove('jj-still'); };
  document.addEventListener('timestop', pause);
  document.addEventListener('timeresume', resume);
  if (document.documentElement.classList.contains('time-stopped')) pause();

  return {
    pause, resume,
    destroy() {
      document.removeEventListener('timestop', pause);
      document.removeEventListener('timeresume', resume);
      el.remove();
    },
  };
}
