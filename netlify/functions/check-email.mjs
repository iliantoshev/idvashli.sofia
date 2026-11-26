// /api/check-email?e=<имейл>: проверява дали имейлът изглежда истински, преди регистрация.
// - домейнът трябва да приема поща (има MX запис)
// - временни имейли за еднократна употреба не се приемат
// - честите грешки в домейна получават предложение ("abv.gb" -> "abv.bg")
// Дали конкретната кутия съществува, се доказва чак с имейла за потвърждение.
import { promises as dns } from 'node:dns';
import { json } from '../../lib/shared.mjs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TYPOS = {
  'abv.gb': 'abv.bg', 'abv.b': 'abv.bg', 'abv.bf': 'abv.bg', 'abv.com': 'abv.bg', 'avb.bg': 'abv.bg', 'abb.bg': 'abv.bg',
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.bg': 'gmail.com', 'gnail.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.co': 'outlook.com',
  'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com',
  'mail.b': 'mail.bg', 'dir.b': 'dir.bg',
};

const DISPOSABLE = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
  'temp-mail.org', 'tempmail.com', 'tempmail.net', 'yopmail.com', 'trashmail.com', 'getnada.com',
  'dispostable.com', 'maildrop.cc', 'throwawaymail.com', 'fakeinbox.com', 'mohmal.com',
  'emailondeck.com', 'mintemail.com', 'tempinbox.com', 'discard.email', 'spamgourmet.com',
  'mailnesia.com', 'tempr.email', 'burnermail.io', 'moakt.com', 'emailfake.com', 'temp-mail.io',
]);

async function acceptsMail(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    // "Null MX" (точка или празно) означава, че домейнът изрично не приема поща
    return mx.some((r) => r.exchange && r.exchange !== '.');
  } catch (err) {
    if (['ENOTFOUND', 'ENODATA', 'ENONAME', 'NXDOMAIN'].includes(err.code)) return false;
    return true; // при проблем с нашата проверка не блокираме човека
  }
}

export default async (req) => {
  const email = String(new URL(req.url).searchParams.get('e') || '').trim().toLowerCase();
  if (!EMAIL.test(email)) return json({ ok: false, reason: 'format' });

  const [local, domain] = [email.slice(0, email.lastIndexOf('@')), email.slice(email.lastIndexOf('@') + 1)];
  if (TYPOS[domain]) return json({ ok: false, reason: 'typo', suggestion: `${local}@${TYPOS[domain]}` });
  if (DISPOSABLE.has(domain)) return json({ ok: false, reason: 'disposable' });
  if (!(await acceptsMail(domain))) return json({ ok: false, reason: 'nomail' });
  return json({ ok: true });
};

export const config = { path: '/api/check-email' };
