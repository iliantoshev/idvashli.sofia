// Страницата на организатора: проверки, сбирки, заведения с QR кодове
import { getUser } from '@netlify/identity';
import QRCode from 'qrcode';
import { esc, api, postJson, formatWhen, $, $$ } from './ui.js';
import { SURVEY } from '../lib/survey.mjs';
import { INTEREST_GROUPS } from '../lib/interests.mjs';

const AUDIENCES = { all: 'Смесена група', m: 'Само мъже', f: 'Само жени' };
const REASONS = { face: 'Лицето не се вижда', gesture: 'Грешен жест', mismatch: 'Не съвпада с профила' };

const root = $('#admin');
let tab = 'pending';

async function shell() {
  root.innerHTML = `
    <h1>Организатор</h1>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" data-tab="pending" aria-selected="${tab === 'pending'}">Проверки</button>
      <button type="button" role="tab" data-tab="meetups" aria-selected="${tab === 'meetups'}">Сбирки</button>
      <button type="button" role="tab" data-tab="venues" aria-selected="${tab === 'venues'}">Заведения</button>
      <button type="button" role="tab" data-tab="survey" aria-selected="${tab === 'survey'}">Анкета</button>
    </div>
    <p class="error" id="admin-error" role="alert"></p>
    <div id="panel"><p class="muted">Зареждаме…</p></div>`;
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; shell(); }));
  const panel = $('#panel');
  try {
    if (tab === 'pending') await pending(panel);
    if (tab === 'meetups') await meetups(panel);
    if (tab === 'venues') await venues(panel);
    if (tab === 'survey') await survey(panel);
  } catch (ex) {
    $('#admin-error').textContent = ex.message;
  }
}

/* ---------- Проверки ---------- */

async function pending(panel) {
  const { pending } = await api('/api/admin?view=pending');
  if (!pending.length) {
    panel.innerHTML = '<div class="card"><p>Няма профили за проверка.</p></div>';
    return;
  }
  panel.innerHTML = `<div class="list">${pending.map((p) => `
    <article class="card grid-2">
      <div class="compare">
        <figure>
          <img src="/api/admin?selfie=${encodeURIComponent(p.id)}" alt="Селфи на ${esc(p.name)}" class="preview" loading="lazy">
          <figcaption class="muted small">Селфи с жест</figcaption>
        </figure>
        <figure>
          ${p.photo ? `<img src="/api/photo?u=${encodeURIComponent(p.id)}&v=${encodeURIComponent(p.photo)}" alt="Профилна снимка на ${esc(p.name)}" class="preview" loading="lazy">` : '<div class="preview empty">Няма снимка</div>'}
          <figcaption class="muted small">Профилна снимка</figcaption>
        </figure>
      </div>
      <div class="stack">
        <div>
          <h3>${esc(p.name)}</h3>
          <p class="muted">${p.gender === 'm' ? 'Мъж' : 'Жена'}, ${esc(p.age)} г.</p>
          <p>Поискан жест: <strong>${esc(p.gesture || '—')}</strong></p>
          <p class="muted small">Изпратено: ${p.submittedAt ? esc(formatWhen(p.submittedAt)) : '—'}</p>
        </div>
        <p class="small">Провери: вижда ли се ясно лицето, правилен ли е жестът, същият човек ли е на профилната снимка, отговаря ли на пола и възрастта.</p>
        <div class="actions">
          <button class="btn small" type="button" data-approve="${esc(p.id)}">Одобри</button>
        </div>
        <div class="actions">
          ${Object.entries(REASONS).map(([k, l]) => `<button class="btn ghost small" type="button" data-reject="${esc(p.id)}" data-reason="${k}">Откажи: ${l}</button>`).join('')}
        </div>
      </div>
    </article>`).join('')}</div>`;

  $$('[data-approve]').forEach((b) => b.addEventListener('click', () => decide({ action: 'approve', userId: b.dataset.approve }, b)));
  $$('[data-reject]').forEach((b) => b.addEventListener('click', () => decide({ action: 'reject', userId: b.dataset.reject, reason: b.dataset.reason }, b)));
}

async function decide(payload, btn) {
  btn.disabled = true;
  try {
    await postJson('/api/admin', payload);
    shell();
  } catch (ex) {
    $('#admin-error').textContent = ex.message;
    btn.disabled = false;
  }
}

/* ---------- Сбирки ---------- */

async function meetups(panel) {
  const [{ meetups }, { venues }] = await Promise.all([api('/api/admin?view=meetups'), api('/api/admin?view=venues')]);
  const opts = (obj) => Object.entries(obj).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');

  panel.innerHTML = `
    <div class="grid-2" style="align-items:start">
      <form class="card" id="meetup-form" novalidate>
        <h2>Нова сбирка</h2>
        ${venues.length ? '' : '<p class="error">Първо добави заведение от раздел „Заведения“.</p>'}
        <div class="field"><label for="m-venue">Заведение</label>
          <select id="m-venue">${venues.map((v) => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="m-niche">Ниша</label><select id="m-niche">${INTEREST_GROUPS.map((g) => `<optgroup label="${g.label}">${opts(g.items)}</optgroup>`).join('')}</select></div>
        <div class="field"><label for="m-when">Дата и час</label><input type="datetime-local" id="m-when"></div>
        <div class="field"><label for="m-cap">Места</label><input type="number" id="m-cap" min="2" max="50" value="6"></div>
        <div class="field"><label for="m-aud">За кого</label><select id="m-aud">${opts(AUDIENCES)}</select></div>
        <p class="error" id="m-error" role="alert"></p>
        <div><button class="btn" type="submit" ${venues.length ? '' : 'disabled'}>Създай сбирката</button></div>
      </form>
      <div class="list">
        ${meetups.length ? meetups.map((m) => `
          <article class="card meetup">
            <div class="meetup-when">${esc(formatWhen(m.startsAt, true))}</div>
            <div class="meetup-row"><span class="tag amber">${esc(m.nicheLabel)}</span><span class="tag">${esc(m.audienceLabel)}</span><span>${esc(m.venueName)}</span></div>
            <div>Идват: <span class="count">${m.people.length} от ${m.capacity}</span></div>
            ${m.people.length ? `<ul class="small admin-people">${m.people.map((p) => `<li class="admin-person"><span class="avatar sm">${p.photo ? `<img src="/api/photo?u=${encodeURIComponent(p.id)}&v=${encodeURIComponent(p.photo)}" alt="" loading="lazy">` : ''}</span><span>${esc(p.name)} · <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>${p.instagram ? ` · @${esc(p.instagram)}` : ''}</span></li>`).join('')}</ul>` : ''}
            <div class="actions"><button class="btn danger small" type="button" data-del="${esc(m.id)}">Изтрий сбирката</button></div>
          </article>`).join('') : '<div class="card"><p>Няма предстоящи сбирки.</p></div>'}
      </div>
    </div>`;

  $('#meetup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const when = $('#m-when').value;
    if (!when) { $('#m-error').textContent = 'Избери дата и час.'; return; }
    try {
      await postJson('/api/admin', {
        action: 'createMeetup',
        venueId: $('#m-venue').value,
        niche: $('#m-niche').value,
        audience: $('#m-aud').value,
        capacity: Number($('#m-cap').value),
        startsAt: new Date(when).toISOString(), // часът от браузъра ти (София) се пази като UTC
      });
      shell();
    } catch (ex) {
      $('#m-error').textContent = ex.message;
    }
  });

  $$('[data-del]').forEach((b) => {
    let armed = false;
    b.addEventListener('click', async () => {
      if (!armed) { armed = true; b.textContent = 'Натисни пак за изтриване'; return; }
      b.disabled = true;
      await postJson('/api/admin', { action: 'deleteMeetup', meetupId: b.dataset.del }).catch((ex) => { $('#admin-error').textContent = ex.message; });
      shell();
    });
  });
}

/* ---------- Заведения ---------- */

async function venues(panel) {
  const { venues } = await api('/api/admin?view=venues');
  const link = (v) => `${location.origin}/venue.html?t=${v.token}`;

  panel.innerHTML = `
    <div class="grid-2" style="align-items:start">
      <form class="card" id="venue-form" novalidate>
        <h2>Ново заведение</h2>
        <div class="field"><label for="v-name">Име</label><input type="text" id="v-name" placeholder="напр. Наргиле бар Х"></div>
        <div class="field"><label for="v-addr">Адрес</label><input type="text" id="v-addr" placeholder="напр. Студентски град, бл. 8"></div>
        <p class="error" id="v-error" role="alert"></p>
        <div><button class="btn" type="submit">Добави</button></div>
        <p class="muted small">Всяко заведение получава QR код. Като го сканират, виждат колко души идват по дати, без имена и телефони.</p>
      </form>
      <div class="list">
        ${venues.length ? venues.map((v) => `
          <article class="card grid-2" style="align-items:center">
            <div>
              <h3>${esc(v.name)}</h3>
              ${v.address ? `<p class="muted">${esc(v.address)}</p>` : ''}
              <p class="small"><a href="${esc(link(v))}" target="_blank" rel="noopener">Отвори страницата на заведението</a></p>
            </div>
            <div>
              <img data-qr="${esc(link(v))}" alt="QR код за ${esc(v.name)}" width="180" height="180" style="background:#fff;border-radius:12px;padding:8px">
              <a class="small" data-dl="${esc(v.id)}" download="qr-${esc(v.name)}.png">Свали QR кода</a>
            </div>
          </article>`).join('') : '<div class="card"><p>Още няма заведения.</p></div>'}
      </div>
    </div>`;

  for (const img of $$('[data-qr]')) {
    const url = await QRCode.toDataURL(img.dataset.qr, { width: 600, margin: 2, color: { dark: '#121826', light: '#ffffff' } });
    img.src = url;
    img.nextElementSibling.href = url;
  }

  $('#venue-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await postJson('/api/admin', { action: 'createVenue', name: $('#v-name').value, address: $('#v-addr').value });
      shell();
    } catch (ex) {
      $('#v-error').textContent = ex.message;
    }
  });
}

/* ---------- Анкета ---------- */

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

function rows(q, list) {
  const total = list.length;
  return q.options.map((label, i) => {
    const n = list.filter((r) => [].concat(r.answers[q.id]).includes(i)).length;
    return `
      <div class="result-row">
        <span>${esc(label)}</span>
        <span class="result-num">${n} (${pct(n, total)}%)</span>
        <div class="bar"><span style="width:${pct(n, total)}%"></span></div>
      </div>`;
  }).join('');
}

function csv(responses) {
  // Текст, който започва с = + - @, Excel може да го изпълни като формула. Слагаме ' отпред.
  const cell = (v) => {
    const text = /^[=+\-@\t\r]/.test(String(v)) ? `'${v}` : String(v);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const head = [...SURVEY.map((q) => q.text), 'Откъде', 'Кога'];
  const lines = responses.map((r) => [
    ...SURVEY.map((q) => [].concat(r.answers[q.id]).map((i) => q.options[i]).join('; ')),
    r.src || '', r.at,
  ]);
  return '﻿' + [head, ...lines].map((l) => l.map(cell).join(',')).join('\r\n');
}

async function survey(panel) {
  const { responses } = await api('/api/admin?view=survey');
  const total = responses.length;
  if (!total) {
    panel.innerHTML = `<div class="card"><p>Още няма попълнени анкети.</p>
      <p class="small">Линк за споделяне: <a href="/anketa" target="_blank" rel="noopener">${esc(location.origin)}/anketa</a></p></div>`;
    return;
  }

  const often = responses.filter((r) => r.answers.q2 >= 2).length;
  const women = responses.filter((r) => r.answers.q9 === 1);
  const men = responses.filter((r) => r.answers.q9 === 0);
  const bySource = Object.entries(responses.reduce((acc, r) => {
    const key = r.src || 'без източник';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const url = URL.createObjectURL(new Blob([csv(responses)], { type: 'text/csv;charset=utf-8' }));

  panel.innerHTML = `
    <div class="card stack">
      <div>
        <h2>${total} ${total === 1 ? 'попълнена анкета' : 'попълнени анкети'}</h2>
        <p>Искало им се е да излязат и не са намерили с кого 3 или повече пъти миналия месец: <strong>${often} (${pct(often, total)}%)</strong></p>
        <p class="muted small">Линк за споделяне: <a href="/anketa" target="_blank" rel="noopener">${esc(location.origin)}/anketa</a></p>
      </div>
      <div>
        <h3>От кой линк</h3>
        ${bySource.map(([name, n]) => `
          <div class="result-row">
            <span>${esc(name)}</span>
            <span class="result-num">${n} (${pct(n, total)}%)</span>
            <div class="bar"><span style="width:${pct(n, total)}%"></span></div>
          </div>`).join('')}
      </div>
      <div><a class="btn ghost small" href="${url}" download="anketa-idvashli.csv">Свали всички отговори (CSV)</a></div>
    </div>
    <div class="list" style="margin-top:14px">
      ${SURVEY.map((q, n) => `
        <article class="card">
          <h3>${n + 1}. ${esc(q.text)}</h3>
          ${q.type === 'many' ? '<p class="muted small">Може няколко отговора, затова процентите не се събират до 100%.</p>' : ''}
          ${rows(q, responses)}
          ${q.id === 'q6' && (women.length || men.length) ? `
            <h3 style="margin-top:24px">Само жените (${women.length})</h3>${rows(q, women)}
            <h3 style="margin-top:24px">Само мъжете (${men.length})</h3>${rows(q, men)}` : ''}
        </article>`).join('')}
    </div>
    <div class="card" style="margin-top:14px">
      <h2>Отделни анкети</h2>
      <p class="muted small">Изтрий тестовите и тези, които не трябва да се броят (например от близки, които знаят проекта).</p>
      <ul class="surveys">
        ${responses.map((r) => `<li><span>${esc(formatWhen(r.at))} · ${esc(r.src || 'без източник')}</span><button class="btn ghost small" type="button" data-sdel="${esc(r.id)}">Изтрий</button></li>`).join('')}
      </ul>
    </div>`;

  $$('[data-sdel]').forEach((b) => {
    let armed = false;
    b.addEventListener('click', async () => {
      if (!armed) { armed = true; b.textContent = 'Натисни пак'; return; }
      b.disabled = true;
      await postJson('/api/admin', { action: 'deleteSurvey', id: b.dataset.sdel }).catch((ex) => { $('#admin-error').textContent = ex.message; });
      shell();
    });
  });
}

/* ---------- Достъп ---------- */

(async () => {
  const user = await getUser().catch(() => null);
  if (!user) {
    root.innerHTML = '<h1>Организатор</h1><p>Влез в профила си, за да продължиш.</p><a class="btn" href="/app.html">Вход</a>';
    return;
  }
  if (!user.roles?.includes('admin')) {
    root.innerHTML = '<h1>Нямаш достъп</h1><p>Тази страница е само за организатора.</p>';
    return;
  }
  shell();
})();
