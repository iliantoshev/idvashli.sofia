// Интересите, които предлагаме: 35, избрани по това какво реално правят младите в квартала,
// а не по научни проучвания. Широки са, за да се събират достатъчно хора на сбирка.
// Ключът (лявата част) се пази в профилите и сбирките, затова не го сменяй, след като е пуснат.
// Надписът (дясната част) може да се сменя спокойно.
// Старите ключове biznes, sport, nargile, koli, geiming са запазени.
// Разширеният списък с 280 интереса е в историята на git (commit dc383ad), ако потрябва пак.

export const INTEREST_GROUPS = [
  {
    id: 'izlizane', label: 'Излизане', items: {
      nargile: 'Наргиле и чил',
      bar: 'Бар и бира',
      klub: 'Клуб и купон',
      kafe: 'Кафе',
      karaoke: 'Караоке',
      bilyard: 'Билярд и боулинг',
      skara: 'Скара и барбекю',
    },
  },
  {
    id: 'sport', label: 'Спорт', items: {
      sport: 'Футбол',
      fitness: 'Фитнес',
      basketbol: 'Баскетбол',
      tenis: 'Тенис и падел',
      boks: 'Бокс и ММА',
      begane: 'Бягане и колело',
      planina: 'Планина и преходи',
      ski: 'Ски и сноуборд',
    },
  },
  {
    id: 'igri', label: 'Игри', items: {
      geiming: 'Гейминг и PlayStation',
      fifa: 'FIFA и турнири',
      nastolni: 'Настолни игри',
      poker: 'Покер и карти',
      machove: 'Гледане на мачове',
    },
  },
  {
    id: 'muzika', label: 'Музика и забавление', items: {
      muzika: 'Музика и концерти',
      hiphop: 'Рап и хип-хоп',
      chalga: 'Чалга и поп-фолк',
      standup: 'Стендъп и комедия',
      tantsi: 'Танци',
    },
  },
  {
    id: 'koli', label: 'Коли', items: {
      koli: 'Коли',
      motori: 'Мотори',
      tuning: 'Тунинг и дрифт',
    },
  },
  {
    id: 'pari', label: 'Пари и умения', items: {
      biznes: 'Бизнес и пари',
      krypto: 'Крипто и трейдинг',
      it: 'Програмиране и IT',
    },
  },
  {
    id: 'jivot', label: 'Живот', items: {
      patuvane: 'Пътувания',
      hrana: 'Добра храна',
      moda: 'Мода и маратонки',
      hobi: 'Творчество и хобита',
    },
  },
];

// Всички интереси в един обект: { ключ: надпис }
export const NICHES = Object.fromEntries(INTEREST_GROUPS.flatMap((g) => Object.entries(g.items)));

export const isNiche = (key) => typeof key === 'string' && Object.hasOwn(NICHES, key);

// Колко интереса може да си избере човек най-много
export const MAX_INTERESTS = 8;
