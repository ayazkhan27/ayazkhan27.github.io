/* Joseph Joestar, "Your next line is...": a recruiter FAQ that predicts the question with a word-level
   trigram (stupid backoff) mixed with question priors, then answers by TF-IDF cosine. No network, no storage. */

const MAIL = 'aak2259@columbia.edu';

// [prior weight, phrasings (canonical first), keyphrases used only for retrieval, answer]
const DATA = [
[12, 'Do you need visa sponsorship?|Will you need sponsorship now or in the future?|Are you authorized to work in the US?|Do you need an H-1B?|Are you a US citizen?',
 'visa, sponsor, sponsorship, h1b, citizenship, work authorization, green card, opt, visa status, immigration',
 "I'm a U.S. citizen, so I can work in the U.S. without sponsorship, now or later."],
[10, 'When can you start?|When are you available?|What is your start date?|When do you graduate?',
 'start, next week, asap, immediately, soon, availability, begin, join, graduation, finish, notice period',
 'I finish my M.A. in Statistics at Columbia in December 2026 and can start in January 2027.'],
[6, 'Are you willing to relocate?|Where are you based?|Would you move for this job?|Where do you live?',
 'relocation, move, moving, located, location, city, new york, nyc',
 "I'm in New York, and I'm willing to relocate."],
[3, 'Can you tell me about yourself?|Who are you?|What is your background?',
 'summary, introduce, bio',
 "A statistician and data scientist in New York, finishing a Columbia M.A. in Statistics in December 2026, and an NSF Graduate Research Fellow. I measure what a model can do before I believe what it reports."],
[3, 'Are you open to remote work?|Do you want a hybrid role?|Can you work in the office?',
 'remote, hybrid, days a week, onsite, on-site, in person, work from home',
 "I'm in New York and willing to relocate. For the on-site or remote setup of a specific role, email me at {mail}."],
[5, 'What degrees do you have?|Where did you go to school?|Do you have a master\'s degree?',
 'degree, education, school, university, college, masters, graduate degree, bachelor, phd, columbia, hunter, cuny, major, study',
 'An M.A. in Statistics from Columbia University, expected December 2026. Before that, a Special Honors B.A. in Statistics with a computer science minor from CUNY Hunter College, cum laude, December 2024.'],
[4, 'What programming languages do you use?|Do you know SAS?|Do you know SQL?|Do you code in Python or R?',
 'programming, programming language, python, r, java, c++, cpp, coding',
 'Python, R, SQL, SAS, Java and C++.'],
[3, 'Which machine learning libraries do you use?|Do you know PyTorch?|What modeling tools do you use?',
 'machine learning, ml, library, framework, torch, scikit-learn, sklearn, transformers, xgboost, lightgbm, lora, deep learning',
 'PyTorch, scikit-learn, transformers, XGBoost, LightGBM and LoRA.'],
[3, 'Do you have Snowflake experience?|Which cloud platforms do you use?|Do you know AWS or GCP?|Have you used Docker?',
 'cloud, google cloud, amazon, container, data warehouse',
 'Snowflake, Docker, GCP and AWS. At Telenav my FunctionGemma router reached 95.4% serving accuracy against live Snowflake.'],
[4, 'What did you do on insurance pricing?|Have you worked in insurance?|What was the accuracy ceiling?',
 'insurer, pricing, novo, calibrator, calibration, ceiling, bound, 56.69, actuarial',
 "On Novo Insurance's scoring stack at Telenav, I estimated the best accuracy any calibrator could reach: 56.69%, 95% CI [55.13, 58.08], on 4,338 true-ping rows. Production ran 9 points below it, and the finding cancelled a release that would have degraded pricing."],
[4, 'What was your most recent role?|Tell me about your internship.|Where have you worked?|What did you do at Telenav?',
 'recent role, job, intern, experience, work experience, santa clara, employer, company',
 "I was an Applied ML and Data Engineering Intern at Telenav in Santa Clara, June to August 2026, on Novo Insurance's scoring stack. Ask me about the accuracy ceiling, the leakage audit or the FunctionGemma router."],
[5, 'Do you have model validation experience?|Have you worked in model risk?|How do you validate a model?|What was the 0.806 AUC problem?',
 'validation, validate, model risk, audit, governance, backtest, leakage, leak, 0.806, auc, temporal split, 127k, sr 11-7',
 'The validation work I can show is from my Telenav internship. I caught target leakage and non-temporal splits behind an inflated 0.806 AUC; the honest figure was 0.7401, and the audit surfaced $127K of campaign waste. I also estimated the pricing accuracy ceiling that stopped a degrading release.'],
[2, 'Do you know survival analysis?|Have you built time-to-event models?|Can you do Cox regression?',
 'survival, time-to-event, hazard, cox, kaplan meier, churn, censoring',
 "Survival analysis is on my methods list, with causal inference, Bayesian networks and stochastic processes. There's no survival project written up on this page, so ask me about it at {mail}."],
[2, 'Have you done causal inference?|Do you know A/B testing?|Can you design experiments?',
 'causal, causality, a/b, ab test, experiment, experimental design, treatment effect, uplift',
 'Causal inference and A/B testing are both on my methods list. Neither is written up on this page, so ask me about them at {mail}.'],
[3, 'Have you worked with imbalanced data?|Tell me about the fraud project.|Do you use Bayesian methods?',
 'imbalanced, class imbalance, rare events, fraud, credit card, smote, oversampling, dashboard, monitoring, bayes, bayesian network',
 'In a credit card fraud project, fraud was 0.172% of the data. I rebalanced the training data with SMOTE-NC, modeled fraud with Bayesian networks and calibrated XGBoost, and built a Dash app to monitor the model.'],
[3, 'Do you have banking experience?|Have you worked in finance?|Have you worked with financial data?',
 'bank, financial, fed, federal reserve, credit risk, lending, loan',
 "The financial work I can show is insurance pricing at Telenav, on Novo Insurance's scoring stack, and a credit card fraud model where fraud was 0.172% of the data."],
[3, 'Have you worked with utility data?|Tell me about the Con Edison project.|Do you have energy industry experience?',
 'utility, energy, con ed, coned, nyserda, rate case, psc, testimony, electric',
 'As a Columbia Data Science Institute scholar on NYSERDA energy-insecurity research, I analyzed 317 Con Edison testimony PDFs from the New York PSC. Affordability testimony fell 3.8 points from 2022 to 2025, while rate design rose 4.9.'],
[3, 'Do you have NLP experience?|Have you done topic modeling?|Can you work with text data?',
 'nlp, natural language processing, text, text mining, topic, bertopic, legalbert, embeddings',
 'Yes. I split 317 Con Edison rate-case filings into 12,073 segments and modeled 16 docket themes with BERTopic, using LegalBERT embeddings, UMAP and HDBSCAN.'],
[3, 'Have you worked with LLMs?|Have you fine-tuned a language model?|Tell me about the FunctionGemma router.',
 'llm, large language model, fine-tune, finetune, fine tuning, function calling, genai, generative ai, ai, gpt',
 'At Telenav I built a 270M-parameter FunctionGemma router: 95.5% function accuracy and 86.4% exact match on 500 held-out prompts, and 95.4% serving accuracy against live Snowflake. LoRA is in my toolkit too.'],
[3, 'Have you worked with medical data?|Do you have healthcare experience?|Have you worked in genomics?',
 'medical, medicine, health, hospital, biomedical, biology, biotech, biostatistics, biostatistician',
 'The health work I can show is retrieval: SMA-1 beat the strongest RAG baseline by 0.34 on long-tail top-5 retrieval in medicine, and by 0.17 in genomics.'],
[3, 'Do you have clinical trial experience?|Have you worked in pharma?|Do you know CDISC or SDTM?',
 'clinical, trial, cro, pharmaceutical, adam, fda, regulatory, drug',
 "Clinical-trial work isn't on this page. Survival analysis and causal inference are on my methods list; email {mail} to talk through what your team needs."],
[3, 'Do you have any publications?|Have you published papers?|What research have you done?',
 'paper, publish, ieee, icngn, conference, first author, orcid',
 "I'm first author of an IEEE ICNGN 2024 paper from my NSF REU at Texas A&M University-Kingsville: an Intrusion Effort Index on aperiodic Spectre monotile tilings for wireless sensor network security. It gave a 15% efficiency improvement in 3D deployments."],
[3, 'Do you have a patent?|What is the patent about?',
 'provisional, uspto, columbia technology ventures, invention',
 'A provisional one: U.S. provisional patent application 64/029,090, filed through Columbia Technology Ventures. It comes from my work on Calx, a neuro-symbolic engine for cross-domain discovery.'],
[3, 'What is Calx?|What are you building?|Tell me about Calx.',
 'neuro-symbolic, structure mapping engine, sme, cross-domain, founder, kalman filter, dynamic program',
 'Calx is a neuro-symbolic engine for cross-domain discovery that I founded in 2025; it ports the Structure-Mapping Engine to find the same relational structure across fields. Its Certified Affine Corridor dynamic program cut operations by 31.55% on average, exact on 45 of 45 cases, and the work produced two new square-root Kalman filter variants.'],
[2, 'What is SMA-1?|Can I install SMA-1?',
 'sma, mcp, pypi, package, ontology, retrieval',
 'SMA-1 is structure-mapping retrieval over 594,000 concepts from 11 ontologies, shipped as an MCP server and as the PyPI package structuremappingmemory. The [project page](sma-1/) has the details.'],
[3, 'What is the NSF fellowship?|Are you an NSF fellow?|What awards have you won?',
 'grfp, fellowship, fellow, award, honor, scholarship, national science foundation',
 "I'm a National Science Foundation Graduate Research Fellow, one of 1,000 awardees from 17,000 applicants."],
[6, 'Can I see your résumé?|Do you have a CV?|Where is your resume?',
 'resume, pdf, download',
 'Here it is: [my résumé (PDF)](Ayaz_Khan_Resume.pdf).'],
[6, 'How can I contact you?|What is your email?|What is your phone number?|Can I see your code?|Are you on LinkedIn?',
 'mail, phone, call, number, reach, interview, github',
 "Email {mail} or call [+1 (917) 943-3853](tel:+19179433853). I'm on [LinkedIn](https://www.linkedin.com/in/ayazkhan27) and [GitHub](https://github.com/ayazkhan27) as ayazkhan27."],
[2, 'What are your salary expectations?|How much do you want to be paid?',
 'salary, pay, paid, money, rate, wage',
 "I'd rather talk about that once I know the role. Email me at {mail}."],
[3, 'What kind of role are you looking for?|What job do you want?',
 'role, looking, position, seeking, title, interest',
 "Statistics and data science roles in biostatistics, model risk or analytics, starting January 2027. Tell me what you're hiring for at {mail}."],
[3, 'What are you best at?|Why should we hire you?|What makes you different?',
 'strength, different, unique, stand out, strong, candidate',
 "I measure what a model can do before I believe what it reports. The examples I'd point to are the 56.69% accuracy ceiling that stopped a release and the leakage audit that took an AUC from 0.806 to an honest 0.7401."],
[1, "Is this a JoJo reference?|Is this from JoJo's Bizarre Adventure?",
 'jojo, joseph, joestar, reference, anime, manga, next line',
 "Yes. In JoJo's Bizarre Adventure, Joseph Joestar's trick is predicting an opponent's next line before they say it. This box tries it with a trigram model and keeps score."],
[1, 'How does this work?|Is this a chatbot?',
 'predict, prediction, trigram, bot, autocomplete, guess, this ai',
 'A trigram model of {n} phrasings of these {q} questions guesses how your line ends, weighted by how often I expect each question. TF-IDF cosine similarity picks the answer, and nothing you type leaves this page.'],
];

const FALLBACK = "That one isn't in my notes. Ask me directly at {mail}.";
const A = 0.4;          // stupid-backoff penalty per order dropped (Brants et al. 2007)
const L = 0.2;          // weight of the trigram against the question priors
const MIN_SIM = 0.55;   // below this cosine, say so instead of guessing
const STOP = new Set(('a an the do does did done you your i me my is are am was were be been to of in on at for with without from by as and or ' +
  'but any some have has had can could would will should may it its that about tell we our us there here so if then too very just also still ' +
  'really please able know use used using get got ever more much many into than don doesn didn isn aren').split(' '));

const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const words = s => norm(s).match(/[a-z0-9]+(?:['./-][a-z0-9]+)*/g) || [];
const key = s => words(s).join(' ');
const stem = w => w.length > 3 ? w.replace(/ies$/, 'y').replace(/(ing|ed|es|e|s)$/, '') : w;
const terms = s => words(s).map(w => w.replace(/'.*$/, '')).filter(w => !STOP.has(w)).map(stem);
const cap = s => s && s[0].toUpperCase() + s.slice(1);

// the same question in the same content words (case, punctuation and filler words aside)
export const sameLine = (a, b) => terms(a).join(' ') === terms(b).join(' ');

export function brain() {
  const Q = DATA.map(([w, p, k, a]) => ({ w, p: p.split('|'), k, a }));
  const nP = Q.reduce((n, q) => n + q.p.length, 0);
  for (const q of Q) q.a = q.a.replace('{n}', nP).replace('{q}', Q.length);

  // trigram counts weighted by question priors (canonical phrasing double); first words marked ^
  const t3 = new Map(), t2 = new Map(), t1 = new Map(), surface = new Map(), PH = [];
  let N = 0;
  const bump = (m, k, w, c) => { const e = m.get(k) || m.set(k, new Map([['', 0]])).get(k); e.set(w, (e.get(w) || 0) + c); e.set('', e.get('') + c); };
  for (const q of Q) q.p.forEach((p, i) => {
    const raw = p.match(/[\p{L}\p{N}]+(?:['./-][\p{L}\p{N}]+)*/gu), t = raw.map(norm);
    const f = { q, t, k: t.join(' '), end: p.endsWith('?') ? '?' : '.', w: q.w * (i ? 1 : 2) / (q.p.length + 1) };
    PH.push(f);
    raw.forEach((r, j) => { if (j || /[A-Z].*[A-Z]/.test(r)) surface.has(t[j]) || surface.set(t[j], r); });
    const s = ['<s>', '<s>', '^' + t[0], ...t.slice(1), f.end];
    for (let j = 2; j < s.length; j++) {
      bump(t3, s[j - 2] + ' ' + s[j - 1], s[j], f.w); bump(t2, s[j - 1], s[j], f.w);
      t1.set(s[j], (t1.get(s[j]) || 0) + f.w); N += f.w;
    }
  });
  const vocab = [...t1.keys()].filter(w => w !== '?' && w !== '.');
  const bare = w => w.replace(/^\^/, ''), show = w => surface.get(bare(w)) || bare(w);
  function score(u, v, w) {
    const e3 = t3.get(u + ' ' + v), e2 = t2.get(v);
    if (e3 && e3.has(w)) return e3.get(w) / e3.get('');
    if (e2 && e2.has(w)) return A * e2.get(w) / e2.get('');
    return A * A * (t1.get(w) || 0) / N;
  }
  const nexts = (u, v) => new Set([...(t3.get(u + ' ' + v) || []), ...(t2.get(v) || [])].map(e => e[0]).filter(Boolean));

  // beam search for ways to finish the line
  function beam(toks, part) {
    const ctx = ['<s>', '<s>', ...toks.map((w, i) => i || !t2.has('^' + w) ? w : '^' + w)], done = [];
    let open = [{ w: [], s: 0 }];
    for (let step = 0; step < 14 && open.length; step++) {
      const next = [];
      for (const h of open) {
        const all = ctx.concat(h.w), u = all[all.length - 2], v = all[all.length - 1];
        let cands = nexts(u, v);
        if (!step && part) {
          cands = toks.length ? [] : vocab.filter(w => w.startsWith('^' + part));
          if (!cands.length) cands = vocab.filter(w => w.startsWith(part));
        }
        for (const w of cands) {
          const s = h.s + Math.log(score(u, v, w));
          if (w === '?' || w === '.') done.push({ w: h.w, end: w, s }); else next.push({ w: h.w.concat(w), s });
        }
      }
      open = next.sort((a, b) => b.s - a.s).slice(0, 12);
    }
    return done;
  }

  // P(line | typed) = L * trigram + (1 - L) * question priors over phrasings that start the same way
  function lines(text) {
    const toks = words(text), part = /[a-z0-9]$/.test(norm(text)) ? toks.pop() : '';
    const rawPart = text.slice(text.length - part.length), closed = /[?.!]\s*$/.test(text);
    const ghostOf = (ws, end) => {
      if (!ws.length) return closed ? '' : end;
      const g = ws.map(show);
      if (part) g[0] = g[0].startsWith(rawPart) ? g[0].slice(rawPart.length) : bare(ws[0]).slice(part.length);
      return (part || /\s$/.test(text) ? '' : ' ') + g.join(' ') + end;
    };
    const out = new Map(), put = (g, p, q) => {
      const k = key(text + g), e = out.get(k) || { g, p: 0 };
      e.p += p; e.q = e.q || q; out.set(k, e);
    };
    const tri = beam(toks, part), Z = tri.reduce((z, h) => z + Math.exp(h.s), 0);
    for (const h of tri) put(ghostOf(h.w, h.end), L * Math.exp(h.s) / Z);
    const kt = key(text), memo = PH.filter(f => f.k === kt || f.k.startsWith(part ? kt : kt + ' '));
    const W = memo.reduce((s, f) => s + f.w, 0);
    for (const f of memo) put(ghostOf(f.t.slice(toks.length), f.end), (1 - L) * f.w / W, f.q);
    return [...out.values()].sort((a, b) => b.p - a.p);
  }

  // TF-IDF: every phrasing and keyphrase is a document
  const docs = Q.flatMap(q => [...q.p, ...q.k.split(', ')].map(s => ({ q, t: terms(s) })));
  const df = new Map();
  for (const d of docs) for (const w of new Set(d.t)) df.set(w, (df.get(w) || 0) + 1);
  const vec = t => {
    const m = new Map();
    for (const w of t) m.set(w, (m.get(w) || 0) + Math.log(1 + docs.length / (df.get(w) || 1)));
    const len = Math.hypot(...m.values()) || 1;
    for (const [w, x] of m) m.set(w, x / len);
    return m;
  };
  for (const d of docs) d.v = vec(d.t);
  function rank(text) {
    const v = vec(terms(text)), best = new Map();
    for (const d of docs) {
      let s = 0;
      for (const [w, x] of v) s += x * (d.v.get(w) || 0);
      if (s > (best.get(d.q) || 0)) best.set(d.q, s);
    }
    return [...best].map(([q, s]) => ({ q, s })).sort((a, b) => b.s - a.s);
  }
  const match = text => { const r = rank(text)[0]; return r && r.s >= MIN_SIM ? r : null; };

  // one line to call out, its ghost completion and three chips
  function predict(text, asked = new Set()) {
    const byPrior = Q.filter(q => !asked.has(q)).sort((a, b) => b.w - a.w);
    if (!words(text).length) return { line: byPrior[0].p[0], ghost: '', chips: byPrior.slice(0, 3).map(q => ({ line: q.p[0], q })) };
    const c = lines(text), full = g => (text + g).replace(/\s+/g, ' ').trim();
    // the likeliest question, then its likeliest line
    const groups = new Map();
    let total = 0, n = 0;
    for (const e of c) {           // ponytail: TF-IDF lookups capped at 12 trigram-only lines
      const q = e.q || (n++ < 12 && (match(full(e.g)) || {}).q);
      if (!q) continue;
      const gr = groups.get(q) || groups.set(q, { q, m: 0, best: e, memo: null }).get(q);
      gr.m += e.p; total += e.p;
      if (e.q && !gr.memo) gr.memo = e;
    }
    const top = [...groups.values()].sort((a, b) => b.m - a.m), chips = [], seen = new Set();
    const take = (q, line) => { if (chips.length < 3 && !seen.has(q) && seen.add(q)) chips.push({ line, q }); };
    // chips: known phrasings only
    for (const g of top) if (g.m >= 0.05 * total) take(g.q, g.memo ? full(g.memo.g) : g.q.p[0]);
    for (const r of rank(text)) if (r.s >= MIN_SIM) take(r.q, r.q.p[0]);
    for (const q of byPrior) take(q, q.p[0]);
    const lead = top.length ? top[0].best : c[0];
    return { line: lead ? full(lead.g) : (match(text) || {}).q?.p[0] || null, ghost: lead ? lead.g : '', chips };
  }
  return { Q, nP, predict, match };
}

const html = s => s.replace(/&/g, '&amp;').replace(/\{mail\}/g, `[${MAIL}](mailto:${MAIL})`).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
const sfx = name => document.dispatchEvent(new CustomEvent('sfx', { detail: { name } }));

export async function mount(root, opts = {}) {
  const B = brain(), uid = 'jj' + Math.random().toString(36).slice(2, 8);
  const el = document.createElement('div');
  el.className = 'jj-joseph';
  el.innerHTML = `<p class="jj-say"><span class="jj-lead">Your next line is:</span> <span class="jj-line"></span></p>
<form class="jj-form"><label class="jj-own" for="${uid}">Or ask your own</label>
<div class="jj-field"><div class="jj-ghost" aria-hidden="true"><span></span><b></b></div><input class="jj-in" id="${uid}" type="text" autocomplete="off" spellcheck="false" enterkeyhint="send" placeholder="Type a question" aria-describedby="${uid}n"></div>
<button class="jj-ask" type="submit">Ask</button></form>
<div class="jj-chips" role="group" aria-label="Likely questions">${'<button type="button" class="jj-chip"></button>'.repeat(3)}</div>
<div class="jj-a" aria-live="polite" aria-atomic="true"></div>
<p class="jj-note" id="${uid}n">A trigram model trained on ${B.nP} phrasings of ${B.Q.length} questions I expect to be asked. It learns nothing about you and sends nothing anywhere. It counts a hit when the question it showed before you were halfway through is the one you asked.</p>`;
  root.append(el);
  const $ = s => el.querySelector(s);
  const say = $('.jj-say'), lineEl = $('.jj-line'), input = $('.jj-in'), ghost = $('.jj-ghost'), out = $('.jj-a');
  const chipEls = [...el.querySelectorAll('.jj-chip')];

  // per-visit memory only: questions asked and the score
  const asked = new Set();
  let cur, hist = [], took = false, tries = 0, hits = 0, paused = false, timer = 0;

  function render(p) {
    lineEl.textContent = p.line ? `“${cap(p.line)}”` : "something I haven't heard before.";
    lineEl.classList.toggle('jj-none', !p.line);
    chipEls.forEach((b, i) => { b.textContent = p.chips[i] ? cap(p.chips[i].line) : ''; });
  }
  function sync() { ghost.scrollLeft = input.scrollLeft; }
  function update() {
    const v = input.value;
    if (!v) took = false;
    cur = B.predict(v, asked);
    ghost.firstChild.textContent = v;
    ghost.lastChild.textContent = cur.ghost;
    render(cur);
    sync();
    hist.push({ n: key(v).length, line: cur.line });
  }
  function fresh() { hist = []; input.value = ''; update(); }

  function answer(text, verdict, q) {
    const m = q ? { q } : B.match(text);
    if (m) asked.add(m.q);
    out.textContent = '';
    const add = (cls, txt, tag = 'p') => { const n = document.createElement(tag); n.className = cls; n.textContent = txt; out.append(n); return n; };
    if (verdict && verdict.hit) { add('jj-bang', '！？', 'span').setAttribute('aria-hidden', 'true'); sfx('nextline'); }
    add('jj-aq', `“${cap(text.trim())}”`);
    add('jj-at', '').innerHTML = html(m ? m.q.a : FALLBACK);
    const tally = `Next line called: ${hits} of ${tries}.`;
    if (verdict) add('jj-score', (verdict.hit ? 'Called it. ' : '') + tally);
    else if (took) add('jj-score', "You took my suggestion, so this one isn't scored." + (tries ? ' ' + tally : ''));
    else if (tries) add('jj-score', tally);
    if (verdict && !verdict.hit && verdict.had) add('jj-had', `I had “${cap(verdict.had)}”`);
  }

  function ask(c) {                       // a chip, or Enter on an empty box
    if (!c) return;
    clearTimeout(timer);
    input.value = ''; took = false;
    lineEl.textContent = `“${cap(c.line)}”`; lineEl.classList.remove('jj-none');
    say.classList.remove('jj-flash'); void say.offsetWidth; say.classList.toggle('jj-flash', !paused);
    timer = setTimeout(() => { say.classList.remove('jj-flash'); answer(c.line, null, c.q); fresh(); }, paused ? 0 : 650);
  }

  function onSubmit(e) {
    e.preventDefault(); clearTimeout(timer);
    const v = input.value;
    if (!words(v).length) return ask(cur.chips[0]);
    let verdict = null;
    if (!took) {                          // score against the guess on screen before the halfway point
      const half = hist.filter(h => h.n <= key(v).length / 2).pop();
      // a hit is the same question, read the way the answer is chosen; identical wording only when neither line matches one
      const mh = half && half.line && B.match(half.line), mv = B.match(v);
      const hit = !!(half && half.line && (mh && mv ? mh.q === mv.q : sameLine(half.line, v)));
      tries++; hits += hit;
      verdict = { hit, had: half && half.line };
    }
    answer(v, verdict);
    fresh();
  }
  function onKey(e) {                     // right arrow or End at the end of the box takes the grey completion
    if ((e.key === 'ArrowRight' || e.key === 'End') && cur.ghost && input.selectionStart === input.value.length) {
      e.preventDefault(); input.value += cur.ghost; took = true; update();
    }
  }

  $('.jj-form').addEventListener('submit', onSubmit);
  input.addEventListener('input', update);
  input.addEventListener('keydown', onKey);
  ['keyup', 'click', 'select', 'focus'].forEach(t => input.addEventListener(t, sync));
  chipEls.forEach((b, i) => b.addEventListener('click', () => ask(cur.chips[i])));

  const pause = () => { paused = true; el.classList.add('jj-still'); };
  const resume = () => { paused = false; el.classList.remove('jj-still'); };
  document.addEventListener('timestop', pause);
  document.addEventListener('timeresume', resume);
  if (document.documentElement.classList.contains('time-stopped')) pause();
  fresh();

  return {
    pause, resume,
    destroy() {
      clearTimeout(timer);
      document.removeEventListener('timestop', pause);
      document.removeEventListener('timeresume', resume);
      el.remove();
    },
  };
}
