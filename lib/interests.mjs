// Интересите, които предлагаме. Малко и широки, за да се събират достатъчно хора на сбирка.
// Подбрани по проучване на младите в България (15-29 г., Министерство на младежта и спорта, 2023)
// и по петте първоначални ниши на проекта.
// Ключът (лявата част) се пази в профилите и сбирките, затова не го сменяй, след като е пуснат.
// Надписът (дясната част) може да се сменя спокойно.
// Старите ключове biznes, sport, nargile, koli, geiming са запазени.
// Разширеният списък с 280 интереса е в историята на git (commit dc383ad), ако потрябва пак.

export const INTEREST_GROUPS = [
  {
    id: 'izlizane', label: 'Излизане', items: {
      nargile: 'Наргиле и чил',
      bar: 'Бар и излизане с приятели',
      kafe: 'Кафе и разходка',
    },
  },
  {
    id: 'aktivno', label: 'Активно', items: {
      sport: 'Спорт и футбол',
      fitness: 'Фитнес',
      priroda: 'Природа и планина',
      tantsi: 'Танци',
    },
  },
  {
    id: 'zabava', label: 'Забавление', items: {
      geiming: 'Гейминг',
      muzika: 'Музика и концерти',
      filmi: 'Филми и сериали',
      kultura: 'Култура: театър и изложби',
    },
  },
  {
    id: 'umeniya', label: 'Умения и хобита', items: {
      biznes: 'Бизнес и пари',
      koli: 'Коли',
      hobi: 'Творчество и хобита',
    },
  },
];

// Всички интереси в един обект: { ключ: надпис }
export const NICHES = Object.fromEntries(INTEREST_GROUPS.flatMap((g) => Object.entries(g.items)));

export const isNiche = (key) => typeof key === 'string' && Object.hasOwn(NICHES, key);

// Колко интереса може да си избере човек най-много
export const MAX_INTERESTS = 6;
