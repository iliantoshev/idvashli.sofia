// Страницата за заведението, която се отваря от QR кода
import { esc, api, formatWhen, $ } from './ui.js';

const root = $('#venue');
const token = new URLSearchParams(location.search).get('t') || '';

async function load() {
  try {
    const { venue, meetups } = await api(`/api/venue?t=${encodeURIComponent(token)}`);
    root.innerHTML = `
      <h1>${esc(venue.name)}</h1>
      ${venue.address ? `<p class="muted">${esc(venue.address)}</p>` : ''}
      <p>Предстоящи сбирки на „Идваш ли?“ при вас и колко души са се записали.</p>
      <div class="list">
        ${meetups.length ? meetups.map((m) => `
          <article class="card meetup">
            <div class="meetup-when">${esc(formatWhen(m.startsAt, true))}</div>
            <div class="meetup-row"><span class="tag amber">${esc(m.niche)}</span><span class="tag">${esc(m.audienceLabel)}</span></div>
            <div style="font-size:22px">Идват: <span class="count">${m.going} ${m.going === 1 ? 'човек' : 'души'}</span> <span class="muted small">от ${m.capacity} места</span></div>
          </article>`).join('') : '<div class="card"><p>Няма предстоящи сбирки.</p></div>'}
      </div>
      <p class="muted small" style="margin-top:24px">Обновява се автоматично всяка минута. Последно: ${esc(formatWhen(new Date().toISOString()))}</p>`;
  } catch (ex) {
    root.innerHTML = `<h1>Страницата не е намерена</h1><p class="muted">${esc(ex.message)}</p>`;
  }
}

load();
setInterval(load, 60000);
