// Инсталиране на сайта като приложение и известия
import { api, postJson } from './ui.js';

let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // показваме наш бутон вместо лентата на браузъра
  installEvent = e;
  document.dispatchEvent(new Event('pwa-change'));
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  document.dispatchEvent(new Event('pwa-change'));
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* няма достъп */ } },
};

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Известията са забранени. Можеш да ги разрешиш от настройките на браузъра.');
  const { publicKey } = await api('/api/push');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  await postJson('/api/push', { subscription: sub.toJSON() });
}

async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await postJson('/api/push', { endpoint: sub.endpoint }, 'DELETE');
  await sub.unsubscribe();
}

// Какво да покажем на това устройство
async function state() {
  const standalone = isStandalone();
  const ios = isIOS();
  if (ios && !standalone) return { step: 'ios-install' };
  if (!standalone && installEvent) return { step: 'install' };
  if (!pushSupported()) return { step: 'unsupported' };
  if (Notification.permission === 'denied') return { step: 'denied' };
  const sub = await currentSubscription();
  if (Notification.permission === 'granted' && sub) return { step: 'on' };
  return { step: 'push' };
}

const SHARE_ICON = '<svg class="share-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Слага картата "Не изпускай сбирките" в slot.
// dismissible: дали може да се скрие с "Не сега" (на страницата със сбирките).
export async function mountPwa(slot, { dismissible = false } = {}) {
  if (!slot) return;
  const draw = async () => {
    if (!slot.isConnected) return;
    const s = await state();
    if (dismissible) {
      if (s.step === 'on' || s.step === 'unsupported') { slot.innerHTML = ''; return; }
      const until = Number(store.get('idvashli-pwa-later') || 0);
      if (until > Date.now()) { slot.innerHTML = ''; return; }
    }
    let inner = '';
    if (s.step === 'install') {
      inner = `<p>Сложи „Идваш ли?“ на телефона си като приложение и включи известията. Така ще разбереш веднага, когато има компания за теб.</p>
        <div class="actions"><button class="btn" type="button" data-pwa="install">📲 Инсталирай</button>${dismissible ? '<button class="btn ghost small" type="button" data-pwa="later">Не сега</button>' : ''}</div>`;
    } else if (s.step === 'ios-install') {
      inner = `<p>Сложи „Идваш ли?“ на телефона си като приложение, за да получаваш известия:</p>
        <ol class="ios-steps">
          <li>Натисни ${SHARE_ICON} <strong>„Сподели“</strong> (Share). Ако не го виждаш, първо натисни <strong>„⋯“</strong></li>
          <li>Натисни <strong>„View More“</strong> (Виж още) със стрелката надолу</li>
          <li>Избери <strong>„Add to Home Screen“</strong> (Добави към началния екран)</li>
          <li>Остави <strong>„Open as Web App“</strong> включено и натисни <strong>„Add“</strong></li>
          <li>Отвори „Идваш ли?“ от новата иконка, влез и включи известията</li>
        </ol>
        ${dismissible ? '<div class="actions"><button class="btn ghost small" type="button" data-pwa="later">Не сега</button></div>' : ''}`;
    } else if (s.step === 'push') {
      inner = `<p>Включи известията, за да разбереш веднага, когато има компания за теб.</p>
        <div class="actions"><button class="btn" type="button" data-pwa="push">🔔 Включи известията</button>${dismissible ? '<button class="btn ghost small" type="button" data-pwa="later">Не сега</button>' : ''}</div>`;
    } else if (s.step === 'on') {
      inner = `<p>✅ Известията са включени на това устройство.</p>
        <div class="actions"><button class="btn ghost small" type="button" data-pwa="test">Прати ми пробно известие</button><button class="btn ghost small" type="button" data-pwa="off">Изключи</button></div>`;
    } else if (s.step === 'denied') {
      inner = '<p>Известията са забранени за този сайт. Можеш да ги разрешиш от настройките на браузъра (иконката с катинара до адреса).</p>';
    } else {
      inner = '<p class="muted">Този браузър не поддържа известия. Пробвай с Chrome или, на iPhone, със Safari.</p>';
    }
    slot.innerHTML = `<div class="card stack pwa-card"><h2>Не изпускай сбирките</h2>${inner}<p class="error small" data-pwa-error role="alert"></p></div>`;
  };

  slot.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pwa]');
    if (!b) return;
    const err = slot.querySelector('[data-pwa-error]');
    const what = b.dataset.pwa;
    if (what === 'later') {
      store.set('idvashli-pwa-later', String(Date.now() + 3 * 864e5));
      slot.innerHTML = '';
      return;
    }
    b.disabled = true;
    try {
      if (what === 'install' && installEvent) {
        installEvent.prompt();
        await installEvent.userChoice;
        installEvent = null;
      }
      if (what === 'push') await enablePush();
      if (what === 'off') await disablePush();
      if (what === 'test') {
        await postJson('/api/push', { action: 'test' });
        err.classList.remove('error');
        err.textContent = 'Изпратено. Трябва да дойде до няколко секунди.';
        b.disabled = false;
        return;
      }
      await draw();
    } catch (ex) {
      if (err) { err.classList.add('error'); err.textContent = ex.message; }
      b.disabled = false;
    }
  });
  const onChange = () => (slot.isConnected ? draw() : document.removeEventListener('pwa-change', onChange));
  document.addEventListener('pwa-change', onChange);
  await draw();
}
