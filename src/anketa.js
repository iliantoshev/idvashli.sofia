// Анкетата: по един въпрос на екран, накрая препраща към регистрацията
import { SURVEY } from '../lib/survey.mjs';
import { esc, postJson, $, $$ } from './ui.js';

const root = $('#survey');
const answers = {};
const src = new URLSearchParams(location.search).get('src') || '';
const SIGNUP = '/app.html#signup';
let step = 0;

// Отговорите от въпрос 5 и 9 отиват като начални стойности в профила
const NICHE_OF_Q5 = ['nargile', 'geiming', 'sport', 'koli', 'biznes'];
const GENDER_OF_Q9 = ['m', 'f'];

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* без памет в браузъра също работи */ } },
};

function intro() {
  root.innerHTML = `
    <h1>Как излизаш в Студентски град?</h1>
    <p>9 въпроса, около 2 минути.</p>
    <p class="muted">Анкетата е анонимна: не питаме за име, имейл или телефон. Правим сбирки по интереси за студенти в София и искаме да ги направим според вашите отговори.</p>
    <div><button class="btn" type="button" id="start">Започни</button></div>`;
  $('#start').addEventListener('click', () => { step = 0; question(); });
}

function question() {
  const q = SURVEY[step];
  const many = q.type === 'many';
  const current = answers[q.id];
  const isOn = (i) => (many ? (current || []).includes(i) : current === i);

  root.innerHTML = `
    <p class="muted small" id="q-count">Въпрос ${step + 1} от ${SURVEY.length}</p>
    <div class="progress" aria-hidden="true"><span style="width:${(step / SURVEY.length) * 100}%"></span></div>
    <form id="q-form" class="stack" novalidate>
      <fieldset>
        <legend><h2>${esc(q.text)}</h2>${q.hint ? `<span class="hint">${esc(q.hint)}</span>` : ''}</legend>
        <div class="opts">
          ${q.options.map((label, i) => `
            <label class="opt${isOn(i) ? ' on' : ''}">
              <input type="${many ? 'checkbox' : 'radio'}" name="${q.id}" value="${i}" ${isOn(i) ? 'checked' : ''}>
              <span class="mark ${many ? 'box' : ''}" aria-hidden="true"></span>
              <span>${esc(label)}</span>
            </label>`).join('')}
        </div>
      </fieldset>
      <input type="text" name="website" class="visually-hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="error" id="q-error" role="alert"></p>
      <div class="actions">
        ${step > 0 ? '<button class="btn ghost" type="button" id="back">Назад</button>' : ''}
        ${many || step === SURVEY.length - 1 || current !== undefined
          ? `<button class="btn" type="submit" id="next">${step === SURVEY.length - 1 ? 'Изпрати' : 'Напред'}</button>`
          : ''}
      </div>
    </form>`;

  const inputs = $$(`input[name="${q.id}"]`);
  const sync = () => inputs.forEach((i) => i.closest('.opt').classList.toggle('on', i.checked));

  inputs.forEach((input) => input.addEventListener('change', () => {
    const i = Number(input.value);
    if (many) {
      // "Нищо не би ме спряло" маха другите отговори и обратно
      if (q.exclusive !== undefined && input.checked) {
        inputs.forEach((o) => {
          if (o !== input && (i === q.exclusive || Number(o.value) === q.exclusive)) o.checked = false;
        });
      }
      answers[q.id] = inputs.filter((o) => o.checked).map((o) => Number(o.value));
      sync();
      return;
    }
    answers[q.id] = i;
    sync();
    // При един отговор минаваме сами към следващия въпрос (без последния, там има бутон "Изпрати")
    if (step < SURVEY.length - 1) setTimeout(() => { step += 1; question(); }, 220);
  }));

  $('#back')?.addEventListener('click', () => { step -= 1; question(); });

  $('#q-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = answers[q.id];
    if (value === undefined || (many && !value.length)) {
      $('#q-error').textContent = many ? 'Избери поне един отговор.' : 'Избери отговор.';
      return;
    }
    if (step < SURVEY.length - 1) { step += 1; question(); return; }
    await send($('#next'), e.target.website.value);
  });
}

async function send(btn, website) {
  btn.disabled = true;
  btn.textContent = 'Изпращаме…';
  try {
    await postJson('/api/survey', { answers, src, website });
  } catch (ex) {
    $('#q-error').textContent = ex.message;
    btn.disabled = false;
    btn.textContent = 'Изпрати';
    return;
  }
  store.set('idvashli-survey-done', '1');
  store.set('idvashli-prefill', JSON.stringify({
    gender: GENDER_OF_Q9[answers.q9],
    interests: (answers.q5 || []).map((i) => NICHE_OF_Q5[i]).filter(Boolean),
  }));
  thanks(true);
}

function thanks(justSent) {
  root.innerHTML = `
    <h1>${justSent ? 'Благодарим!' : 'Вече попълни анкетата'}</h1>
    <p>Първите сбирки са в Студентски град: наргиле, PS5, спорт, коли, бизнес и пари. Малки групи, само с проверени хора.</p>
    <p>Направи си профил и ще те поканим, когато има сбирка по твоя интерес.</p>
    ${justSent ? '<p class="muted small" id="countdown">Отиваме към регистрацията след <span>5</span> секунди…</p>' : ''}
    <div class="actions">
      <a class="btn" href="${SIGNUP}">Към регистрацията</a>
      ${justSent ? '<button class="btn ghost" type="button" id="stay">Не сега</button>' : ''}
      <button class="btn ghost" type="button" id="share" ${justSent ? 'hidden' : ''}>Сподели анкетата</button>
    </div>
    <p class="success" id="share-ok" role="status"></p>`;

  if (justSent) {
    let left = 5;
    const timer = setInterval(() => {
      left -= 1;
      const n = $('#countdown span');
      if (n) n.textContent = String(left);
      if (left <= 0) { clearInterval(timer); location.href = SIGNUP; }
    }, 1000);
    $('#stay').addEventListener('click', () => {
      clearInterval(timer);
      $('#countdown').remove();
      $('#stay').remove();
      $('#share').hidden = false;
    });
  }

  $('#share').addEventListener('click', async () => {
    const url = `${location.origin}/anketa`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Анкета от 2 минути', text: 'Как излизаш в Студентски град?', url });
      } else {
        await navigator.clipboard.writeText(url);
        $('#share-ok').textContent = 'Линкът е копиран.';
      }
    } catch { /* човекът е затворил прозореца за споделяне */ }
  });
}

if (store.get('idvashli-survey-done')) thanks(false);
else intro();
