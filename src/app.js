// Страницата на потребителя: вход, профил, проверка със селфи, сбирки
import {
  getUser, login, signup, logout, handleAuthCallback, requestPasswordRecovery, updateUser,
} from '@netlify/identity';
import { esc, api, postJson, formatWhen, authMessage, $, $$ } from './ui.js';

const NICHES = {
  biznes: 'Бизнес и пари',
  sport: 'Спорт',
  nargile: 'Наргиле и чил',
  koli: 'Коли',
  geiming: 'Гейминг',
};

const root = $('#app');
const topActions = $('#top-actions');
let me = null; // { email, isAdmin, profile }

const render = (html) => {
  root.innerHTML = html;
  root.querySelector('h1, h2')?.setAttribute('tabindex', '-1');
};

function setTopActions(loggedIn) {
  topActions.innerHTML = loggedIn
    ? `${me?.isAdmin ? '<a class="btn ghost small" href="/admin.html">Организатор</a>' : ''}
       <button class="btn ghost small" type="button" id="logout">Изход</button>`
    : '';
  $('#logout')?.addEventListener('click', async () => {
    await logout().catch(() => {});
    location.href = '/app.html';
  });
}

/* ---------- Вход и регистрация ---------- */

function renderAuth(mode = location.hash === '#signup' ? 'signup' : 'login', notice = '') {
  setTopActions(false);
  const isSignup = mode === 'signup';
  render(`
    <h1>${isSignup ? 'Регистрация' : 'Вход'}</h1>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" aria-selected="${!isSignup}" data-mode="login">Вход</button>
      <button type="button" role="tab" aria-selected="${isSignup}" data-mode="signup">Регистрация</button>
    </div>
    ${notice ? `<p class="success">${esc(notice)}</p>` : ''}
    <form id="auth-form" novalidate>
      <div class="field">
        <label for="email">Имейл</label>
        <input type="email" id="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="password">Парола ${isSignup ? '<span class="hint">(поне 8 символа)</span>' : ''}</label>
        <input type="password" id="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" minlength="8" required>
      </div>
      ${isSignup ? `<div class="field">
        <label for="password2">Повтори паролата</label>
        <input type="password" id="password2" autocomplete="new-password" minlength="8" required>
      </div>` : ''}
      <p class="error" id="auth-error" role="alert"></p>
      <div class="actions">
        <button class="btn" type="submit">${isSignup ? 'Създай профил' : 'Влез'}</button>
        ${isSignup ? '' : '<button class="link-btn" type="button" id="forgot">Забравена парола</button>'}
      </div>
      ${isSignup ? '<p class="muted small">След регистрацията ще получиш имейл за потвърждение. Писмото идва от Netlify, на английски. Ако не го виждаш, провери папка Спам.</p>' : ''}
    </form>
  `);

  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => renderAuth(b.dataset.mode)));

  $('#forgot')?.addEventListener('click', async () => {
    const email = $('#email').value.trim();
    const err = $('#auth-error');
    if (!email) { err.textContent = 'Напиши имейла си и натисни пак.'; return; }
    try {
      await requestPasswordRecovery(email);
      renderAuth('login', 'Ако има профил с този имейл, изпратихме ти линк за нова парола.');
    } catch (e) {
      err.textContent = authMessage(e);
    }
  });

  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    const err = $('#auth-error');
    err.textContent = '';
    if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Напиши валиден имейл.'; return; }
    if (password.length < 8) { err.textContent = 'Паролата трябва да е поне 8 символа.'; return; }
    if (isSignup && password !== $('#password2').value) {
      err.textContent = 'Двете пароли не съвпадат. Напиши ги отново.';
      $('#password2').value = '';
      $('#password2').focus();
      return;
    }
    const btn = e.submitter;
    btn.disabled = true;
    try {
      if (isSignup) {
        const problem = await emailProblem(email);
        if (problem) {
          err.innerHTML = problem;
          $('#use-suggestion')?.addEventListener('click', (ev) => {
            $('#email').value = ev.currentTarget.dataset.email;
            err.textContent = '';
          });
          btn.disabled = false;
          $('#email').focus();
          return;
        }
        await signup(email, password);
        // Ако в Netlify е включено автоматично потвърждение, човекът вече е влязъл
        if (await getUser().catch(() => null)) return start();
        renderAuth('login', 'Изпратихме ти имейл. Отвори линка в него, за да потвърдиш профила, и после влез тук.');
      } else {
        await login(email, password);
        start();
      }
    } catch (ex) {
      err.textContent = authMessage(ex);
      btn.disabled = false;
    }
  });
}

// Проверява имейла на сървъра. Връща HTML със съобщение или празно, ако е наред.
async function emailProblem(email) {
  let r;
  try {
    r = await api(`/api/check-email?e=${encodeURIComponent(email)}`);
  } catch {
    return ''; // ако проверката не работи, не спираме регистрацията
  }
  if (r.ok) return '';
  if (r.reason === 'typo') {
    return `Несъществуващ имейл. Имаше ли предвид <button type="button" class="link-btn" id="use-suggestion" data-email="${esc(r.suggestion)}">${esc(r.suggestion)}</button>?`;
  }
  if (r.reason === 'disposable') return 'Временни имейли не се приемат. Използвай истинския си имейл.';
  return 'Несъществуващ имейл. Провери дали е написан правилно.';
}

/* ---------- Профил ---------- */

// Ако човекът е попълнил анкетата на този телефон, попълваме пола и интересите от нея
function surveyPrefill() {
  try {
    const saved = JSON.parse(localStorage.getItem('idvashli-prefill') || 'null');
    return saved && typeof saved === 'object' ? { gender: saved.gender, interests: saved.interests || [] } : {};
  } catch {
    return {};
  }
}

function renderProfileForm(profile = {}, isEdit = false) {
  setTopActions(true);
  const year = new Date().getFullYear();
  const chosen = new Set(profile.interests || []);
  render(`
    <h1>${isEdit ? 'Редактирай профила' : 'Твоят профил'}</h1>
    <p class="muted">Тези данни вижда само организаторът. Другите участници не виждат профила ти. На сбирката се запознавате на живо.</p>
    ${isEdit && profile.status === 'verified' ? '<p class="muted small">Ако смениш име, пол или година на раждане, ще трябва да минеш проверката отново.</p>' : ''}
    <form id="profile-form" novalidate>
      <div class="field">
        <label for="name">Име и фамилия</label>
        <input type="text" id="name" autocomplete="name" value="${esc(profile.name)}" placeholder="напр. Иван Петров" required>
      </div>
      <fieldset>
        <legend>Пол <span class="hint">(сбирките могат да са само за мъже или само за жени)</span></legend>
        <div class="choices">
          <label class="choice"><input type="radio" name="gender" value="m" ${profile.gender === 'm' ? 'checked' : ''}><span>Мъж</span></label>
          <label class="choice"><input type="radio" name="gender" value="f" ${profile.gender === 'f' ? 'checked' : ''}><span>Жена</span></label>
        </div>
      </fieldset>
      <div class="field">
        <label for="birthYear">Година на раждане</label>
        <input type="number" id="birthYear" inputmode="numeric" min="1940" max="${year - 18}" value="${esc(profile.birthYear)}" placeholder="напр. 2006" required>
      </div>
      <div class="field">
        <label for="phone">Телефон <span class="hint">(за да ти се обадим за сбирката)</span></label>
        <input type="tel" id="phone" autocomplete="tel" inputmode="tel" value="${esc(profile.phone)}" placeholder="напр. 0888 123 456" required>
      </div>
      <div class="field">
        <label for="instagram">Instagram <span class="hint">(по желание)</span></label>
        <input type="text" id="instagram" autocapitalize="off" value="${esc(profile.instagram)}" placeholder="напр. ivan.petrov">
      </div>
      <fieldset>
        <legend>Какво те интересува? <span class="hint">(избери едно или повече)</span></legend>
        <div class="choices">
          ${Object.entries(NICHES).map(([k, label]) => `<label class="choice"><input type="checkbox" name="interests" value="${k}" ${chosen.has(k) ? 'checked' : ''}><span>${label}</span></label>`).join('')}
        </div>
      </fieldset>
      <div class="field">
        <label for="area">Квартал или общежитие</label>
        <input type="text" id="area" value="${esc(profile.area)}" placeholder="напр. Студентски град">
      </div>
      <label class="check"><input type="checkbox" id="adult" ${profile.name ? 'checked' : ''}><span>Навършил съм 18 години.</span></label>
      <label class="check"><input type="checkbox" id="privacy" ${profile.name ? 'checked' : ''}><span>Прочетох <a href="/privacy.html" target="_blank">правилата за поверителност</a> и съм съгласен да ми пишете или звъните за сбирки.</span></label>
      <p class="error" id="profile-error" role="alert"></p>
      <div class="actions">
        <button class="btn" type="submit">${isEdit ? 'Запази' : 'Продължи'}</button>
        ${isEdit ? '<button class="btn ghost" type="button" id="cancel">Отказ</button>' : ''}
      </div>
    </form>
  `);

  $('#cancel')?.addEventListener('click', () => route());
  $('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#profile-error');
    err.textContent = '';
    const payload = {
      name: $('#name').value,
      gender: $('input[name="gender"]:checked')?.value,
      birthYear: Number($('#birthYear').value),
      phone: $('#phone').value,
      instagram: $('#instagram').value,
      area: $('#area').value,
      interests: $$('input[name="interests"]:checked').map((i) => i.value),
      adult: $('#adult').checked,
      privacy: $('#privacy').checked,
    };
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const res = await postJson('/api/me', payload, 'PUT');
      me.profile = res.profile;
      route();
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
    }
  });
}

/* ---------- Проверка със селфи ---------- */

// Смалява снимката до 1024 px и я прави JPEG, за да е лека
function toJpeg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Снимката не може да се обработи.'))), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Снимката не може да се отвори. Опитай с друга.'));
    img.src = URL.createObjectURL(file);
  });
}

async function renderVerify() {
  setTopActions(true);
  const v = await api('/api/verify');
  render(`
    <h1>Проверка на профила</h1>
    ${v.rejectReason ? `<p class="error">Предишната снимка не мина: ${esc(v.rejectReason)} Опитай пак с новия жест.</p>` : ''}
    <p>Така всеки на сбирката знае, че другите са тези, за които се представят. Направи селфи, на което ясно се вижда лицето ти и правиш този жест:</p>
    <div class="gesture">Твоят жест<strong>${esc(v.gesture)}</strong></div>
    <form id="verify-form" class="stack" novalidate>
      <div class="field">
        <input type="file" id="selfie" class="visually-hidden" accept="image/*" capture="user">
        <label for="selfie" class="btn selfie-btn" id="selfie-label"><svg class="cam" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Направи селфи</span></label>
        <span class="muted small" id="selfie-hint">Натисни бутона, за да се отвори камерата.</span>
      </div>
      <img id="preview" class="preview" alt="Преглед на селфито" hidden>
      <p class="muted small">Снимката я вижда само организаторът и се изтрива веднага след проверката. Не пазим снимки и не използваме лицево разпознаване.</p>
      <p class="error" id="verify-error" role="alert"></p>
      <div class="actions">
        <button class="btn" type="submit" id="send-selfie" hidden>Изпрати за проверка</button>
        <button class="btn ghost" type="button" id="edit">Редактирай профила</button>
      </div>
    </form>
  `);

  let blob = null;
  $('#edit').addEventListener('click', () => renderProfileForm(me.profile, true));
  $('#selfie').addEventListener('change', async (e) => {
    const err = $('#verify-error');
    err.textContent = '';
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      blob = await toJpeg(file);
      const pv = $('#preview');
      pv.src = URL.createObjectURL(blob);
      pv.hidden = false;
      // След снимката основният бутон става "Изпрати", а камерата минава на втори план
      $('#selfie-label').classList.add('ghost');
      $('#selfie-label span').textContent = 'Направи ново селфи';
      $('#selfie-hint').textContent = 'Виж дали лицето и жестът се виждат ясно и изпрати.';
      $('#send-selfie').hidden = false;
    } catch (ex) {
      err.textContent = ex.message;
    }
  });
  $('#verify-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#verify-error');
    if (!blob) { err.textContent = 'Първо направи или избери селфи.'; return; }
    const btn = e.submitter;
    btn.disabled = true;
    btn.textContent = 'Изпращаме…';
    try {
      await api('/api/verify', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
      me.profile.status = 'pending';
      route();
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
      btn.textContent = 'Изпрати за проверка';
    }
  });
}

function renderPending() {
  setTopActions(true);
  render(`
    <h1>Проверяваме профила ти</h1>
    <p><span class="status wait">Чака проверка</span></p>
    <p>Организаторът ще прегледа селфито ти, обикновено до 24 часа. След това ще можеш да се записваш за сбирки.</p>
    <div class="actions"><button class="btn ghost" type="button" id="refresh">Провери пак</button></div>
  `);
  $('#refresh').addEventListener('click', () => start());
}

/* ---------- Сбирки ---------- */

async function renderMeetups(message = '') {
  setTopActions(true);
  const p = me.profile;
  const { meetups } = await api('/api/meetups');
  const cards = meetups.map((m) => {
    const full = m.going >= m.capacity && !m.mine;
    const wrongGroup = m.audience !== 'all' && m.audience !== p.gender;
    let action;
    if (m.mine) action = `<button class="btn ghost small" data-rsvp="${esc(m.id)}" data-going="false">Няма да дойда</button>`;
    else if (wrongGroup) action = `<span class="muted small">${esc(m.audienceLabel)}</span>`;
    else if (full) action = '<span class="muted small">Няма свободни места</span>';
    else action = `<button class="btn small" data-rsvp="${esc(m.id)}" data-going="true">Идвам</button>`;
    return `
      <article class="card meetup">
        <div class="meetup-when">${esc(formatWhen(m.startsAt, true))}</div>
        <div class="meetup-row">
          <span class="tag amber">${esc(m.niche)}</span>
          <span class="tag">${esc(m.audienceLabel)}</span>
          ${m.mine ? '<span class="tag">Записан си</span>' : ''}
        </div>
        ${m.venue ? `<div><strong>${esc(m.venue.name)}</strong>${m.venue.address ? `<br><span class="muted">${esc(m.venue.address)}</span>` : ''}</div>` : ''}
        <div class="actions"><span>Идват: <span class="count">${m.going} от ${m.capacity}</span></span>${action}</div>
      </article>`;
  }).join('');

  render(`
    <h1>Сбирки</h1>
    <p><span class="status ok">Проверен профил</span> · ${esc(p.name)}</p>
    ${message ? `<p class="success">${esc(message)}</p>` : ''}
    <p class="error" id="rsvp-error" role="alert"></p>
    <div class="list">${cards || '<div class="card"><p>Още няма обявени сбирки. Ще ти се обадим, щом има по твоя интерес.</p></div>'}</div>
    <h2 style="margin-top:48px">Профил</h2>
    <div class="card stack">
      <p class="muted small">Интереси: ${esc((p.interests || []).map((k) => NICHES[k]).join(', '))}</p>
      <div class="actions">
        <button class="btn ghost small" type="button" id="edit">Редактирай профила</button>
        <button class="btn danger small" type="button" id="delete">Изтрий профила</button>
      </div>
      <p class="error" id="delete-msg" role="alert"></p>
    </div>
  `);

  $$('[data-rsvp]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      const going = b.dataset.going === 'true';
      await postJson('/api/meetups', { meetupId: b.dataset.rsvp, going });
      await renderMeetups(going ? 'Записан си. Ще ти се обадим ден преди сбирката.' : 'Отписан си от сбирката.');
    } catch (ex) {
      $('#rsvp-error').textContent = ex.message;
      b.disabled = false;
    }
  }));
  $('#edit').addEventListener('click', () => renderProfileForm(me.profile, true));
  setupDelete();
}

// Изтриване в две стъпки, без изскачащи прозорци
function setupDelete() {
  const btn = $('#delete');
  if (!btn) return;
  let armed = false;
  btn.addEventListener('click', async () => {
    if (!armed) {
      armed = true;
      btn.textContent = 'Натисни пак, за да изтриеш всичко';
      return;
    }
    btn.disabled = true;
    try {
      await api('/api/me', { method: 'DELETE' });
      await logout().catch(() => {});
      renderAuth('login', 'Профилът и всички твои данни са изтрити.');
    } catch (ex) {
      $('#delete-msg').textContent = ex.message;
    }
  });
}

/* ---------- Нова парола (от линка в имейла) ---------- */

function renderNewPassword() {
  setTopActions(true);
  render(`
    <h1>Нова парола</h1>
    <form id="pw-form" novalidate>
      <div class="field">
        <label for="newpw">Нова парола <span class="hint">(поне 8 символа)</span></label>
        <input type="password" id="newpw" autocomplete="new-password" minlength="8" required>
      </div>
      <div class="field">
        <label for="newpw2">Повтори новата парола</label>
        <input type="password" id="newpw2" autocomplete="new-password" minlength="8" required>
      </div>
      <p class="error" id="pw-error" role="alert"></p>
      <div><button class="btn" type="submit">Запази паролата</button></div>
    </form>
  `);
  $('#pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('#newpw').value;
    if (pw.length < 8) { $('#pw-error').textContent = 'Паролата трябва да е поне 8 символа.'; return; }
    if (pw !== $('#newpw2').value) { $('#pw-error').textContent = 'Двете пароли не съвпадат. Напиши ги отново.'; return; }
    try {
      await updateUser({ password: pw });
      start();
    } catch (ex) {
      $('#pw-error').textContent = authMessage(ex);
    }
  });
}

/* ---------- Кое да покажем ---------- */

async function route() {
  try {
    const p = me.profile;
    if (!p) return renderProfileForm(surveyPrefill());
    if (p.status === 'verified') return await renderMeetups();
    if (p.status === 'pending') return renderPending();
    return await renderVerify();
  } catch (ex) {
    if (ex.status === 401) return renderAuth();
    showError(ex);
  }
}

function showError(ex) {
  render(`<h1>Нещо се обърка</h1><p class="error">${esc(ex.message)}</p><button class="btn" type="button" id="retry">Опитай пак</button>`);
  $('#retry').addEventListener('click', () => location.reload());
}

async function start() {
  try {
    const user = await getUser();
    if (!user) return renderAuth();
    me = await api('/api/me');
    await route();
  } catch (ex) {
    if (ex.status === 401) return renderAuth();
    showError(ex);
  }
}

(async () => {
  try {
    const result = await handleAuthCallback();
    if (result?.type === 'recovery') return renderNewPassword();
  } catch (ex) {
    renderAuth('login');
    $('#auth-error').textContent = 'Линкът от имейла е невалиден или изтекъл. Влез или поискай нов.';
    return;
  }
  start();
})();
