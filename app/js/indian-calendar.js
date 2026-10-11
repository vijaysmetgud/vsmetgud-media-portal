/* =========================================================
   INDIAN CALENDAR  (toggle button + month view + reminders)
   - Gregorian month grid with Indian holidays / festivals
   - Indian National Calendar (Saka) date for every day
   - Date reminders (stored in this browser, fire while the portal is open)
   To add more festival dates, append rows to FESTIVALS below:
   ['YYYY-MM-DD', 'Name', 'festival' | 'national' | 'observance', approx?]
   ========================================================= */
(function () {
    'use strict';

    var LS_OPEN = 'indianCalendarOpen';
    var LS_REMINDERS = 'indianCalendarReminders';

    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var SAKA_MONTHS = ['Chaitra', 'Vaisakha', 'Jyaistha', 'Asadha', 'Sravana', 'Bhadra',
        'Asvina', 'Kartika', 'Agrahayana', 'Pausa', 'Magha', 'Phalguna'];

    /* ---------- Holidays that repeat on the same date every year ---------- */
    var FIXED = [
        ['01-01', "New Year's Day", 'observance'],
        ['01-12', 'National Youth Day', 'observance'],
        ['01-26', 'Republic Day', 'national'],
        ['01-30', "Martyrs' Day", 'observance'],
        ['04-14', 'Ambedkar Jayanti', 'festival'],
        ['05-01', 'Labour Day', 'observance'],
        ['08-15', 'Independence Day', 'national'],
        ['09-05', "Teachers' Day", 'observance'],
        ['10-02', 'Gandhi Jayanti', 'national'],
        ['10-31', 'National Unity Day', 'observance'],
        ['11-14', "Children's Day", 'observance'],
        ['12-25', 'Christmas', 'festival']
    ];

    /* ---------- Moving festivals (lunar / moon-sighting dates) - 2026 ---------- */
    /* approx = true: depends on moon sighting or varies by a day / state */
    var FESTIVALS = [
        ['2026-01-14', 'Makar Sankranti / Pongal', 'festival'],
        ['2026-01-23', 'Vasant Panchami', 'festival'],
        ['2026-02-15', 'Maha Shivaratri', 'festival'],
        ['2026-03-03', 'Holika Dahan', 'festival'],
        ['2026-03-04', 'Holi', 'festival', true],
        ['2026-03-19', 'Ugadi / Gudi Padwa', 'festival'],
        ['2026-03-21', 'Eid-ul-Fitr', 'festival', true],
        ['2026-03-26', 'Ram Navami', 'festival'],
        ['2026-03-31', 'Mahavir Jayanti', 'festival'],
        ['2026-04-03', 'Good Friday', 'festival'],
        ['2026-05-01', 'Buddha Purnima', 'festival'],
        ['2026-05-27', 'Eid-ul-Adha (Bakrid)', 'festival', true],
        ['2026-06-26', 'Muharram', 'festival', true],
        ['2026-08-25', 'Milad-un-Nabi', 'festival', true],
        ['2026-08-26', 'Onam (Thiruvonam)', 'festival'],
        ['2026-08-28', 'Raksha Bandhan', 'festival'],
        ['2026-09-04', 'Janmashtami', 'festival'],
        ['2026-09-14', 'Ganesh Chaturthi', 'festival'],
        ['2026-10-11', 'Navratri begins', 'festival'],
        ['2026-10-19', 'Maha Ashtami', 'festival'],
        ['2026-10-20', 'Dussehra (Vijaya Dashami)', 'festival'],
        ['2026-10-29', 'Karwa Chauth', 'festival'],
        ['2026-11-06', 'Dhanteras', 'festival'],
        ['2026-11-07', 'Choti Diwali', 'festival'],
        ['2026-11-08', 'Diwali (Lakshmi Puja)', 'festival'],
        ['2026-11-09', 'Govardhan Puja', 'festival'],
        ['2026-11-11', 'Bhai Dooj', 'festival'],
        ['2026-11-24', 'Guru Nanak Jayanti', 'festival']
    ];

    /* ---------- helpers ---------- */
    function pad(n) { return String(n).padStart(2, '0'); }
    function key(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }   // m = 0..11
    function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function todayKey() {
        var n = new Date();
        return key(n.getFullYear(), n.getMonth(), n.getDate());
    }

    var holidayMap = {};
    function addHoliday(k, name, type, approx) {
        (holidayMap[k] = holidayMap[k] || []).push({ name: name, type: type, approx: !!approx });
    }
    FESTIVALS.forEach(function (f) { addHoliday(f[0], f[1], f[2], f[3]); });

    function holidaysOn(y, m, d) {
        var list = (holidayMap[key(y, m, d)] || []).slice();
        var md = pad(m + 1) + '-' + pad(d);
        FIXED.forEach(function (f) { if (f[0] === md) list.push({ name: f[1], type: f[2], approx: false }); });
        return list;
    }

    /* Indian National Calendar (Saka): Chaitra 1 = 22 March (21 March in a leap year) */
    function saka(y, m, d) {
        var date = Date.UTC(y, m, d);
        var sy = y;
        var start = Date.UTC(sy, 2, isLeap(sy) ? 21 : 22);
        if (date < start) { sy = y - 1; start = Date.UTC(sy, 2, isLeap(sy) ? 21 : 22); }
        var off = Math.round((date - start) / 86400000);
        var lens = [isLeap(sy) ? 31 : 30, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];
        var i = 0;
        while (i < 11 && off >= lens[i]) { off -= lens[i]; i++; }
        return { year: sy - 78, month: SAKA_MONTHS[i], day: off + 1 };
    }
    function sakaText(y, m, d) {
        var s = saka(y, m, d);
        return s.day + ' ' + s.month + ' ' + s.year + ' Saka';
    }

    /* ---------- reminders ---------- */
    function loadReminders() {
        try { return JSON.parse(localStorage.getItem(LS_REMINDERS) || '[]'); } catch (e) { return []; }
    }
    function saveReminders(list) {
        try { localStorage.setItem(LS_REMINDERS, JSON.stringify(list)); } catch (e) { /* storage full / blocked */ }
    }
    function remindersOn(y, m, d) {
        var k = key(y, m, d);
        var md = pad(m + 1) + '-' + pad(d);
        return loadReminders().filter(function (r) {
            return r.date === k || (r.yearly && r.date.slice(5) === md);
        });
    }

    function toast(text) {
        var t = document.createElement('div');
        t.className = 'cal-toast';
        t.innerHTML = '<strong>📅 Reminder</strong><span>' + esc(text) + '</span><button type="button" aria-label="Dismiss">✕</button>';
        t.querySelector('button').onclick = function () { t.remove(); };
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.remove(); }, 60000);
    }

    function fire(r, label) {
        var text = label + r.text;
        toast(text);
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Indian Calendar Reminder', { body: text });
            }
        } catch (e) { /* ignore */ }
        if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
    }

    function checkReminders() {
        var now = new Date();
        var list = loadReminders();
        var changed = false;
        list.forEach(function (r) {
            var p = r.date.split('-').map(Number);
            var t = (r.time || '09:00').split(':').map(Number);
            var year = r.yearly ? now.getFullYear() : p[0];
            var base = new Date(year, p[1] - 1, p[2], t[0], t[1]);
            var slots = [{ when: base, label: '' }];
            if (r.dayBefore) {
                var b = new Date(base);
                b.setDate(b.getDate() - 1);
                slots.push({ when: b, label: 'Tomorrow: ' });
            }
            slots.forEach(function (s) {
                var id = s.when.getTime();
                r.fired = r.fired || [];
                if (now >= s.when && now - s.when < 6 * 3600000 && r.fired.indexOf(id) === -1) {
                    fire(r, s.label);
                    r.fired = r.fired.concat(id).slice(-10);
                    changed = true;
                }
            });
        });
        if (changed) saveReminders(list);
    }

    /* ---------- UI ---------- */
    var panel, btn;
    var now0 = new Date();
    var view = { y: now0.getFullYear(), m: now0.getMonth() };
    var selected = todayKey();

    function upcoming(count) {
        var out = [];
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        for (var i = 0; i < 400 && out.length < count; i++) {
            var hs = holidaysOn(d.getFullYear(), d.getMonth(), d.getDate());
            hs.forEach(function (h) {
                if (out.length < count) out.push({ date: new Date(d), h: h });
            });
            d.setDate(d.getDate() + 1);
        }
        return out;
    }

    function fmtShort(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }

    function render() {
        var y = view.y, m = view.m;
        var first = new Date(y, m, 1).getDay();
        var total = new Date(y, m + 1, 0).getDate();
        var tk = todayKey();
        var html = '';

        html += '<div class="cal-head">' +
            '<div class="cal-nav">' +
            '<button type="button" data-act="prev" aria-label="Previous month">‹</button>' +
            '<button type="button" data-act="today">Today</button>' +
            '<button type="button" data-act="next" aria-label="Next month">›</button>' +
            '</div>' +
            '<div class="cal-title"><h3>' + MONTHS[m] + ' ' + y + '</h3>' +
            '<small>' + esc(sakaText(y, m, 1)) + ' (1st)</small></div>' +
            '</div>';

        html += '<div class="cal-body"><div class="cal-main"><div class="cal-grid">';
        DAYS.forEach(function (n, i) {
            html += '<div class="cal-dow' + (i === 0 ? ' sun' : '') + '">' + n + '</div>';
        });
        for (var i = 0; i < first; i++) html += '<div class="cal-cell empty"></div>';
        for (var d = 1; d <= total; d++) {
            var k = key(y, m, d);
            var hs = holidaysOn(y, m, d);
            var rs = remindersOn(y, m, d);
            var dow = new Date(y, m, d).getDay();
            var cls = 'cal-cell';
            if (dow === 0) cls += ' sun';
            if (k === tk) cls += ' today';
            if (k === selected) cls += ' selected';
            if (hs.length) cls += hs.some(function (h) { return h.type === 'national'; }) ? ' national' : ' holiday';
            var s = saka(y, m, d);
            html += '<button type="button" class="' + cls + '" data-date="' + k + '">' +
                '<span class="cal-num">' + d + '</span>' +
                '<span class="cal-saka">' + s.day + '</span>' +
                (hs.length ? '<span class="cal-hname">' + esc(hs[0].name) + (hs.length > 1 ? ' +' + (hs.length - 1) : '') + '</span>' : '') +
                (rs.length ? '<span class="cal-rdot" title="Reminder">●</span>' : '') +
                '</button>';
        }
        html += '</div>';

        // holidays this month
        var monthHs = [];
        for (var dd = 1; dd <= total; dd++) {
            holidaysOn(y, m, dd).forEach(function (h) { monthHs.push({ d: dd, h: h }); });
        }
        html += '<div class="cal-month-list"><h4>Holidays &amp; festivals in ' + MONTHS[m] + '</h4>';
        if (monthHs.length) {
            html += '<ul>' + monthHs.map(function (x) {
                return '<li><b>' + x.d + ' ' + MONTHS[m].slice(0, 3) + '</b> ' + esc(x.h.name) +
                    (x.h.approx ? ' <em>(date may vary)</em>' : '') + '</li>';
            }).join('') + '</ul>';
        } else {
            html += '<p class="cal-muted">No holiday data for this month' +
                (y !== 2026 ? ' (festival dates are loaded for 2026; national days repeat every year)' : '') + '.</p>';
        }
        html += '</div></div>';

        // side panel: selected day
        var sp = selected.split('-').map(Number);
        var sd = new Date(sp[0], sp[1] - 1, sp[2]);
        var sh = holidaysOn(sp[0], sp[1] - 1, sp[2]);
        var sr = remindersOn(sp[0], sp[1] - 1, sp[2]);
        html += '<aside class="cal-side"><h4>' + DAYS[sd.getDay()] + ', ' + sd.getDate() + ' ' + MONTHS[sd.getMonth()] + ' ' + sd.getFullYear() + '</h4>' +
            '<p class="cal-saka-full">' + esc(sakaText(sp[0], sp[1] - 1, sp[2])) + '</p>';
        if (sh.length) {
            html += '<ul class="cal-hlist">' + sh.map(function (h) {
                return '<li class="' + h.type + '">' + esc(h.name) + (h.approx ? ' <em>(may vary)</em>' : '') + '</li>';
            }).join('') + '</ul>';
        }
        html += '<h5>Reminders</h5>';
        if (sr.length) {
            html += '<ul class="cal-rlist">' + sr.map(function (r) {
                return '<li><span>' + esc(r.time) + ' – ' + esc(r.text) +
                    (r.yearly ? ' <em>(every year)</em>' : '') + '</span>' +
                    '<button type="button" data-del="' + r.id + '" aria-label="Delete reminder">🗑</button></li>';
            }).join('') + '</ul>';
        } else {
            html += '<p class="cal-muted">No reminders for this date.</p>';
        }
        html += '<form class="cal-form" autocomplete="off">' +
            '<input type="text" name="text" maxlength="120" placeholder="Reminder text" value="' + esc(sh.length ? sh[0].name : '') + '" required>' +
            '<input type="time" name="time" value="09:00" required>' +
            '<label><input type="checkbox" name="yearly"> Repeat every year</label>' +
            '<label><input type="checkbox" name="dayBefore"> Also remind 1 day before</label>' +
            '<button type="submit">+ Add Reminder</button></form>';

        var up = upcoming(5);
        html += '<h5>Coming up</h5><ul class="cal-up">' + up.map(function (u) {
            return '<li><b>' + fmtShort(u.date) + '</b> ' + esc(u.h.name) + '</li>';
        }).join('') + '</ul>';
        html += '<p class="cal-note">Reminders are saved in this browser and alert while the portal is open. ' +
            'Moon-dependent dates (Eid, Muharram, Holi) can differ by a day or by state.</p></aside></div>';

        panel.innerHTML = html;
    }

    function setOpen(open) {
        panel.hidden = !open;
        btn.classList.toggle('cal-on', open);
        btn.setAttribute('aria-pressed', open ? 'true' : 'false');
        try { localStorage.setItem(LS_OPEN, open ? '1' : '0'); } catch (e) { /* ignore */ }
        if (open) render();
    }

    function onPanelClick(e) {
        var t = e.target.closest('button');
        if (!t) return;
        var act = t.getAttribute('data-act');
        if (act === 'prev') { view.m--; if (view.m < 0) { view.m = 11; view.y--; } render(); }
        else if (act === 'next') { view.m++; if (view.m > 11) { view.m = 0; view.y++; } render(); }
        else if (act === 'today') {
            var n = new Date();
            view = { y: n.getFullYear(), m: n.getMonth() };
            selected = todayKey();
            render();
        } else if (t.getAttribute('data-date')) {
            selected = t.getAttribute('data-date');
            render();
        } else if (t.getAttribute('data-del')) {
            var id = t.getAttribute('data-del');
            saveReminders(loadReminders().filter(function (r) { return r.id !== id; }));
            render();
        }
    }

    function onPanelSubmit(e) {
        if (!e.target.classList.contains('cal-form')) return;
        e.preventDefault();
        var f = e.target;
        var text = f.elements.text.value.trim();
        if (!text) return;
        var list = loadReminders();
        list.push({
            id: 'r' + Date.now() + Math.floor(Math.random() * 1000),
            date: selected,
            time: f.elements.time.value || '09:00',
            text: text,
            yearly: f.elements.yearly.checked,
            dayBefore: f.elements.dayBefore.checked,
            fired: []
        });
        saveReminders(list);
        if ('Notification' in window && Notification.permission === 'default') {
            try { Notification.requestPermission(); } catch (err) { /* ignore */ }
        }
        render();
    }

    function init() {
        panel = document.getElementById('indianCalendarPanel');
        btn = document.getElementById('indianCalendarBtn');
        if (!panel || !btn) return;
        btn.addEventListener('click', function () { setOpen(panel.hidden); });
        panel.addEventListener('click', onPanelClick);
        panel.addEventListener('submit', onPanelSubmit);
        var open = false;
        try { open = localStorage.getItem(LS_OPEN) === '1'; } catch (e) { /* ignore */ }
        setOpen(open);
        checkReminders();
        setInterval(checkReminders, 20000);
        // keep "today" correct if the tab stays open past midnight
        setInterval(function () { if (!panel.hidden) render(); }, 15 * 60 * 1000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
