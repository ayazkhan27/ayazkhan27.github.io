/* Kishibe Rohan, "But I refuse" (だが断る): a two-button call that teaches target leakage with a real
   result, 0.806 AUC on a random split against 0.7401 on a time-aware one. Heaven's Door opens the résumé. */

const sfx = name => document.dispatchEvent(new CustomEvent('sfx', { detail: { name } }));

// AUC on one axis from 0.70 to 0.82: hollow dot for the leaky random split, solid for the split by time
const x = v => +(16 + (v - 0.7) / 0.12 * 288).toFixed(1);
const CHART = `<figure><svg class="jj-chart" viewBox="0 0 320 112" role="img" aria-label="AUC on one axis: 0.806 on the random split, 0.7401 on the split by time.">
<text x="${x(0.7401)}" y="14" text-anchor="middle">split by time</text><text x="${x(0.806)}" y="14" text-anchor="middle">random split</text>
<text class="v" x="${x(0.7401)}" y="34" text-anchor="middle">0.7401</text><text class="v" x="${x(0.806)}" y="34" text-anchor="middle">0.806</text>
<path class="ar" d="M${x(0.806) - 11} 54H${x(0.7401) + 12}m7-5l-7 5 7 5"/>
<circle class="o" cx="${x(0.806)}" cy="54" r="7"/><circle class="f" cx="${x(0.7401)}" cy="54" r="7"/>
<path class="ax" d="M16 80H304M16 80v5M136 80v5M256 80v5"/>
<text x="16" y="104">0.70</text><text x="136" y="104" text-anchor="middle">0.75</text><text x="256" y="104" text-anchor="middle">0.80</text>
</svg><figcaption>The same model scored two ways. AUC, higher is better.</figcaption></figure>`;

const OUT = {
  ship: `<p class="jj-lead">That 0.806 is inflated.</p>
<p>One feature leaks the target, and the random split mixes future rows into training, so the model gets to see the answer. Split by time instead, training on the past and testing on the future, and the honest AUC is 0.7401.</p>
${CHART}<button type="button" class="jj-other">Try the other answer</button>`,
  refuse: `<p class="jj-sfx" aria-hidden="true">だが断る</p>
<p class="jj-lead">But I refuse.</p>
<p>These are real numbers from Telenav. I caught the leak, rebuilt the validation with time-aware splits and reported 0.7401, and the audit surfaced $127K of campaign waste.</p>
${CHART}<a class="jj-door" href="Ayaz_Khan_Resume.pdf"><span class="jj-book" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span>Read me like a book (résumé, PDF)</span></a>`,
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
