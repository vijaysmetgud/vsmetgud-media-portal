/**
 * expense-voice.js  -  better "🎤 Speak" for expense.html
 * ---------------------------------------------------------------------------
 * Load it AFTER js/expense.js:
 *
 *     <script src="js/expense.js"></script>
 *     <script src="js/expense-voice.js"></script>
 *
 * It takes over the "🎤 Speak" button (the one that calls startVoice()) and
 * drives your existing form: it fills #item, #price and #date and presses your
 * existing "Add Expense" button, so all your saving / charts / totals stay as
 * they are.
 *
 * What it understands (English, Indian accent by default, en-IN):
 *   "I spent 250 rupees on lunch"            "coffee fifty rupees"
 *   "paid 1,200 for electricity bill yesterday"
 *   "two thousand three hundred and fifty for groceries"
 *   "rent 1.5 lakh"     "movie tickets 3k"     "Rs. 80 auto"
 *   "petrol 500 two days ago"     "lunch 250 on 5th September"
 *   "coffee 50 and tea 30"   "milk 60, bread 45 and eggs 80"   (several at once)
 *
 * If it heard only half ("lunch" or "250 rupees") it asks the missing part.
 * It never claims "added" unless the list or totals actually changed.
 * ---------------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  /* ========================================================================
   * 1. PARSING  (pure functions - no browser needed)
   * ====================================================================== */

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  const ONES = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19
  };
  const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const SCALES = {
    hundred: 100, thousand: 1000,
    lakh: 100000, lakhs: 100000, lac: 100000, lacs: 100000,
    crore: 10000000, crores: 10000000
  };
  const CURRENCY = new Set(['rupees', 'rupee', 'rs', 'inr', 'rupaye', 'bucks', 'buck']);

  const LEAD_FILLER = new Set([
    'add', 'added', 'adding', 'spent', 'spend', 'spending', 'paid', 'pay', 'paying', 'bought', 'buy',
    'buying', 'purchased', 'purchase', 'got', 'expense', 'expenses', 'new', 'an', 'a', 'the', 'my',
    'for', 'on', 'to', 'towards', 'of', 'in', 'at', 'i', "i've", 'ive', "i'd", 'have', 'had', 'was',
    'were', 'please', 'just', 'record', 'log', 'note', 'enter', 'put', 'it', 'as', 'that', 'is',
    'rupees', 'rupee', 'rs', 'inr', 'and', 'then', 'also', 'plus', 'cost', 'costs', 'costed', 'about'
  ]);
  const TRAIL_FILLER = new Set(['please', 'today', 'rupees', 'rupee', 'rs', 'for', 'on', 'and', 'only', 'at', 'the', 'a', 'to', 'in']);

  const MONTHS = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4,
    jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
  };
  const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
  const WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const SMALL_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };

  function normalise(raw) {
    let s = ' ' + String(raw || '').toLowerCase() + ' ';
    s = s.replace(/[\u2018\u2019]/g, "'");
    while (/(\d),(\d{3})/.test(s)) s = s.replace(/(\d),(\d{3})/g, '$1$2');            // 1,250 -> 1250
    s = s.replace(/(?:\u20B9|\brs\b\.?|\binr\b)\s*(\d+(?:\.\d+)?)/g, ' $1 rupees ');   // Rs. 250 / INR 250
    s = s.replace(/(\d+(?:\.\d+)?)\s*(?:\/-|\/=|\brs\b\.?|\binr\b|\brupees?\b|\brupaye\b)/g, ' $1 rupees ');
    s = s.replace(/(\d+(?:\.\d+)?)\s*k\b/g, (m, n) => ' ' + Math.round(parseFloat(n) * 1000) + ' '); // 3k
    s = s.replace(/[,;]/g, ' , ');
    s = s.replace(/[^a-z0-9.,'\s]/g, ' ');
    s = s.replace(/\.(?!\d)/g, ' ').replace(/(^|[^\d])\./g, '$1 ');
    return s.replace(/\s+/g, ' ').trim();
  }

  const cut = (s, m) => (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
  const addDays = (now, n) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);

  function extractDate(s, now) {
    let m;
    if ((m = /\bday before yesterday\b/.exec(s))) return { date: addDays(now, -2), text: cut(s, m) };
    if ((m = /\byesterday\b/.exec(s))) return { date: addDays(now, -1), text: cut(s, m) };
    if ((m = /\b(\d{1,2}|one|two|three|four|five|six|seven)\s+days?\s+ago\b/.exec(s))) {
      const n = has(SMALL_WORDS, m[1]) ? SMALL_WORDS[m[1]] : parseInt(m[1], 10);
      return { date: addDays(now, -n), text: cut(s, m) };
    }
    if ((m = /\btoday\b/.exec(s))) return { date: addDays(now, 0), text: cut(s, m) };

    const build = (day, monthIdx, year) => {
      let y = year ? parseInt(year, 10) : now.getFullYear();
      let d = new Date(y, monthIdx, day);
      if (!year && d > now) d = new Date(y - 1, monthIdx, day);   // "5th March" said in January = last year
      return d;
    };
    const dayMonth = new RegExp('\\b(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+(' + MONTH_RE + ')\\b(?:\\s+(\\d{4}))?');
    if ((m = dayMonth.exec(s))) return { date: build(parseInt(m[1], 10), MONTHS[m[2]], m[3]), text: cut(s, m) };
    const monthDay = new RegExp('\\b(' + MONTH_RE + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s+(\\d{4}))?');
    if ((m = monthDay.exec(s))) return { date: build(parseInt(m[2], 10), MONTHS[m[1]], m[3]), text: cut(s, m) };

    if ((m = /\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/.exec(s))) {   // "on the 25th"
      let d = new Date(now.getFullYear(), now.getMonth(), parseInt(m[1], 10));
      if (d > now) d = new Date(now.getFullYear(), now.getMonth() - 1, parseInt(m[1], 10));
      return { date: d, text: cut(s, m) };
    }
    if ((m = /\b(?:on\s+|last\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(s))) {
      const back = (now.getDay() - WEEKDAYS[m[1]] + 7) % 7;
      return { date: addDays(now, -back), text: cut(s, m) };
    }
    return { date: null, text: s };
  }

  function numKind(w) {
    if (w === undefined) return null;
    if (/^\d+(\.\d+)?$/.test(w)) return 'digit';
    if (has(ONES, w)) return 'ones';
    if (has(TENS, w)) return 'tens';
    if (has(SCALES, w)) return 'scale';
    return null;
  }

  /** Finds every number in a token list (digits or words) with its value and position. */
  function findNumbers(tokens) {
    const found = [];
    let i = 0;
    while (i < tokens.length) {
      if (!numKind(tokens[i])) { i++; continue; }
      let total = 0, cur = 0, j = i, prev = null;
      while (j < tokens.length) {
        const w = tokens[j];
        const kind = numKind(w);
        if (!kind) {
          // "two hundred AND fifty"
          if (w === 'and' && prev === 'scale' && numKind(tokens[j + 1]) && numKind(tokens[j + 1]) !== 'scale') { j++; continue; }
          break;
        }
        if (prev === 'digit' && kind !== 'scale') break;
        if (prev === 'ones' && kind !== 'scale') break;
        if (prev === 'tens' && !(kind === 'scale' || (kind === 'ones' && ONES[w] > 0 && ONES[w] < 10))) break;
        if (kind === 'digit') cur += parseFloat(w);
        else if (kind === 'ones') cur += ONES[w];
        else if (kind === 'tens') cur += TENS[w];
        else {
          const s = SCALES[w];
          if (s === 100) cur = (cur || 1) * 100;
          else { total += (cur || 1) * s; cur = 0; }
        }
        prev = kind;
        j++;
      }
      const value = total + cur;
      const nearCurrency = CURRENCY.has(tokens[i - 1]) || CURRENCY.has(tokens[j]);
      const lonelyOne = j - i === 1 && tokens[i] === 'one';        // "one" is usually just a word
      if (value > 0 && !(lonelyOne && !nearCurrency)) found.push({ value, start: i, end: j, nearCurrency });
      i = j;
    }
    return found;
  }

  function pickAmount(tokens) {
    const nums = findNumbers(tokens);
    if (!nums.length) return null;
    const withCur = nums.filter((n) => n.nearCurrency);
    const pool = withCur.length ? withCur : nums;
    return pool.reduce((best, n) => (n.value >= best.value ? n : best));
  }

  function itemFromTokens(tokens) {
    const t = tokens.filter((w) => w !== ',' && !CURRENCY.has(w));
    while (t.length && LEAD_FILLER.has(t[0])) t.shift();
    while (t.length && TRAIL_FILLER.has(t[t.length - 1])) t.pop();
    if (!t.length) return null;
    const s = t.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function parseSegment(tokens) {
    const amt = pickAmount(tokens);
    if (!amt) return { item: itemFromTokens(tokens), price: null };
    const from = amt.start - (CURRENCY.has(tokens[amt.start - 1]) ? 1 : 0);
    const to = amt.end + (CURRENCY.has(tokens[amt.end]) ? 1 : 0);
    const rest = tokens.filter((_, idx) => idx < from || idx >= to);
    return { item: itemFromTokens(rest), price: Math.round(amt.value * 100) / 100 };
  }

  function splitTokens(tokens) {
    const segs = [[]];
    tokens.forEach((t, i) => {
      let sep = t === ',' || t === 'then' || t === 'also' || t === 'plus';
      if (t === 'and') sep = !(has(SCALES, tokens[i - 1] || '') && numKind(tokens[i + 1]));
      if (sep) segs.push([]);
      else segs[segs.length - 1].push(t);
    });
    return segs.filter((s) => s.length);
  }

  /**
   * parseSpeech("coffee 50 and tea 30 yesterday") ->
   *   { raw, date: Date|null, entries: [{item, price}, ...], partial: {item, price}|null }
   * entries are complete expenses; partial is something that still misses the item or the price.
   */
  function parseSpeech(raw, now) {
    now = now || new Date();
    const dated = extractDate(normalise(raw), now);
    const tokens = dated.text.split(' ').filter(Boolean);
    const segs = splitTokens(tokens).map(parseSegment);
    const priced = segs.filter((s) => s.price != null);

    let entries = [];
    let partial = null;

    if (priced.length >= 2) {
      entries = segs.filter((s) => s.item && s.price != null);
      partial = segs.find((s) => !(s.item && s.price != null) && (s.item || s.price != null)) || null;
    } else {
      const whole = parseSegment(tokens.filter((t) => t !== ','));
      if (whole.item && whole.price != null) entries = [whole];
      else if (whole.item || whole.price != null) partial = whole;
    }
    return { raw: String(raw || '').trim(), date: dated.date, entries, partial };
  }

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());   // local date, not UTC
  const rupees = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

  const api = { normalise, parseSpeech, findNumbers, ymd };

  if (typeof document === 'undefined') {           // running under Node (tests)
    if (typeof module !== 'undefined') module.exports = api;
    return;
  }

  /* ========================================================================
   * 2. BROWSER PART  (microphone, speech, form filling)
   * ====================================================================== */

  const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  const LANG = 'en-IN';
  const $ = (id) => document.getElementById(id);

  let rec = null;          // active SpeechRecognition
  let busy = false;        // a voice session is in progress
  let cancelled = false;
  let speakBtn = null;
  let speakBtnLabel = '';
  let voice = null;
  const keepAlive = [];    // Chrome drops utterances that get garbage-collected

  function setStatus(text) {
    const el = $('voiceStatus');
    if (el) el.textContent = text;
  }

  function setListeningUI(on) {
    if (!speakBtn) return;
    speakBtn.classList.toggle('voiceListening', on);
    speakBtn.textContent = on ? '\u23F9 Stop' : speakBtnLabel;
  }

  /* ---------- speaking ---------- */

  function pickVoice() {
    if (!('speechSynthesis' in root)) return;
    const list = root.speechSynthesis.getVoices();
    if (!list.length) return;
    voice = list.find((v) => /^en[-_]IN/i.test(v.lang)) ||
            list.find((v) => /^en[-_]GB/i.test(v.lang)) ||
            list.find((v) => /^en/i.test(v.lang)) || null;
  }

  function stopSpeaking() {
    if ('speechSynthesis' in root) root.speechSynthesis.cancel();
  }

  function speak(text) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in root) || cancelled) return resolve();
      stopSpeaking();                               // never queue on top of an older sentence
      const u = new SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = LANG; }
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        const at = keepAlive.indexOf(u);
        if (at >= 0) keepAlive.splice(at, 1);
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      keepAlive.push(u);
      root.speechSynthesis.speak(u);
      setTimeout(done, 1500 + text.length * 110);   // safety net if the browser never fires onend
    });
  }

  /* ---------- listening ---------- */

  const ERRORS = {
    'not-allowed': 'Microphone is blocked. Click the lock icon in the address bar and allow the microphone, then try again.',
    'service-not-allowed': 'Microphone is blocked. Click the lock icon in the address bar and allow the microphone, then try again.',
    'no-speech': "I didn't hear anything. Tap \uD83C\uDFA4 and speak right after it starts listening.",
    'audio-capture': 'No microphone was found. Plug one in and try again.',
    'network': 'Speech recognition needs an internet connection (Chrome sends the audio to Google).',
    'unsupported': 'This browser has no speech recognition. Use Chrome or Edge.',
    'insecure': 'The microphone only works on https:// or localhost. Open the portal through https://vsmetgud.online.',
    'start-failed': 'Could not start the microphone. Wait a second and tap \uD83C\uDFA4 again.'
  };

  function listenOnce() {
    return new Promise((resolve) => {
      if (!SR) return resolve({ error: 'unsupported' });
      if (!root.isSecureContext) return resolve({ error: 'insecure' });

      const r = new SR();
      r.lang = LANG;
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 3;
      rec = r;

      let alts = null;
      let settled = false;
      let timer = null;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        rec = null;
        setListeningUI(false);
        resolve(value);
      };

      r.onstart = () => { setListeningUI(true); setStatus('\uD83C\uDF99\uFE0F Listening... speak now'); };
      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) alts = Array.from(res).map((a) => a.transcript.trim()).filter(Boolean);
          else interim += res[0].transcript;
        }
        if (!alts && interim) setStatus('\uD83C\uDF99\uFE0F ' + interim + '...');
      };
      r.onerror = (e) => finish({ error: e.error });
      r.onend = () => finish(alts && alts.length ? { alts } : { error: 'no-speech' });

      timer = setTimeout(() => { try { r.stop(); } catch (err) { /* ignore */ } }, 12000);
      try { r.start(); } catch (err) { finish({ error: 'start-failed' }); }
    });
  }

  /* ---------- form ---------- */

  function setVal(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const WATCH = ['expenseList', 'overallTotal', 'dailyTotal', 'monthlyTotal'];
  const snapshot = () => WATCH.map((id) => ($(id) ? $(id).innerHTML : '')).join('|');

  /** Fills the form, presses your existing Add Expense button, reports whether something changed. */
  async function fillAndAdd(item, price, date) {
    setVal('item', item);
    setVal('price', String(price));
    setVal('date', ymd(date || new Date()));

    const before = snapshot();
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /^addExpense\s*\(/.test((b.getAttribute('onclick') || '').trim()));
    if (btn) btn.click();
    else if (typeof root.addExpense === 'function') root.addExpense();
    await new Promise((r) => setTimeout(r, 350));
    return snapshot() !== before;
  }

  /* ---------- the conversation ---------- */

  function bestParse(alts) {
    const parsed = alts.map((a) => parseSpeech(a));
    return parsed.find((p) => p.entries.length) ||
           parsed.find((p) => p.partial && p.partial.price != null) ||
           parsed[0];
  }

  async function askFollowUp(partial) {
    if (partial.item && partial.price == null) {
      await speak('How much was ' + partial.item + '?');
      if (cancelled) return null;
      const reply = await listenOnce();
      if (reply.error) return { error: reply.error };
      for (const alt of reply.alts) {
        const p = parseSpeech(alt);
        const price = p.entries.length ? p.entries[0].price : (p.partial ? p.partial.price : null);
        if (price != null) return { entry: { item: partial.item, price } };
      }
      return { error: 'missing-amount' };
    }
    if (partial.price != null && !partial.item) {
      await speak('What was the ' + rupees(partial.price) + ' rupees for?');
      if (cancelled) return null;
      const reply = await listenOnce();
      if (reply.error) return { error: reply.error };
      for (const alt of reply.alts) {
        const p = parseSpeech(alt);
        const item = p.entries.length ? p.entries[0].item : (p.partial ? p.partial.item : null);
        if (item) return { entry: { item, price: partial.price } };
      }
      return { error: 'missing-item' };
    }
    return null;
  }

  function sayWhen(date) {
    if (!date) return '';
    const days = Math.round((new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) - date) / 86400000);
    if (days === 0) return '';
    if (days === 1) return ' for yesterday';
    return ' for ' + date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  }

  async function onSpeak() {
    if (busy) {                                   // second tap = stop
      cancelled = true;
      stopSpeaking();
      if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } }
      return;
    }
    busy = true;
    cancelled = false;
    try {
      stopSpeaking();                             // so the mic never hears the assistant
      const first = await listenOnce();
      if (cancelled) { setStatus('Cancelled.'); return; }
      if (first.error) { if (first.error !== 'aborted') setStatus('\u26A0 ' + (ERRORS[first.error] || 'Voice error: ' + first.error)); return; }

      const parsed = bestParse(first.alts);
      setStatus('Heard: \u201C' + parsed.raw + '\u201D');
      const entries = parsed.entries.slice();
      let leftover = parsed.partial;

      if (!entries.length && leftover) {
        const follow = await askFollowUp(leftover);
        if (cancelled || !follow) { if (!follow) setStatus('Cancelled.'); return; }
        if (follow.entry) { entries.push(follow.entry); leftover = null; }
        else {
          const msg = follow.error in ERRORS ? ERRORS[follow.error]
            : 'I still could not get the ' + (follow.error === 'missing-amount' ? 'amount' : 'item') + '. Try saying it in one go, like "lunch 250 rupees".';
          setStatus('\u26A0 ' + msg);
          await speak('Sorry, I could not get that. Try saying, lunch, 250 rupees.');
          return;
        }
      }

      if (!entries.length) {
        setStatus('\u26A0 I did not catch an amount. Try: \u201Clunch 250 rupees\u201D or \u201Ccoffee 50 and tea 30\u201D.');
        await speak('Sorry, I did not catch an amount. Try saying, lunch, 250 rupees.');
        return;
      }

      let saved = 0;
      for (const e of entries) {
        const ok = await fillAndAdd(e.item, e.price, parsed.date);
        if (ok) saved++;
      }

      const total = entries.reduce((s, e) => s + e.price, 0);
      let line;
      if (saved === entries.length) {
        line = entries.length === 1
          ? 'Added ' + entries[0].item + ', ' + rupees(entries[0].price) + ' rupees' + sayWhen(parsed.date)
          : 'Added ' + entries.length + ' expenses, total ' + rupees(total) + ' rupees' + sayWhen(parsed.date);
        setStatus('\u2705 ' + line.replace(/ rupees/g, '') + ' (\u20B9' + rupees(total) + ')');
        if (leftover) line += '. I skipped one item because I did not get its ' + (leftover.price == null ? 'amount' : 'name');
      } else {
        line = 'I filled in the form but could not confirm it was saved. Please check the list, or press Add Expense.';
        setStatus('\u26A0 ' + line);
      }
      await speak(line);
    } finally {
      busy = false;
      setListeningUI(false);
    }
  }

  /* ---------- wire up ---------- */

  function init() {
    const style = document.createElement('style');
    style.textContent = '.voiceListening{background:#dc2626 !important;color:#fff !important;animation:voicePulse 1s infinite}' +
                        '@keyframes voicePulse{50%{opacity:.65}}';
    document.head.appendChild(style);

    if ('speechSynthesis' in root) {
      pickVoice();
      if (root.speechSynthesis.addEventListener) root.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    }

    speakBtn = Array.from(document.querySelectorAll('button'))
      .find((b) => /^startVoice\s*\(\s*\)/.test((b.getAttribute('onclick') || '').trim())) || null;
    if (speakBtn) {
      speakBtnLabel = speakBtn.textContent.trim();
      speakBtn.removeAttribute('onclick');        // replace the old handler
      speakBtn.addEventListener('click', onSpeak);
    }
    root.startVoice = onSpeak;                    // in case something else calls startVoice()

    if (!SR) setStatus('\u26A0 ' + ERRORS.unsupported);
    else if (!root.isSecureContext) setStatus('\u26A0 ' + ERRORS.insecure);
  }

  root.ExpenseVoice = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(typeof window !== 'undefined' ? window : globalThis);