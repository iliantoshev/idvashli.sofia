// Всички интереси, подредени по категории. Ползват се от профила, админ панела и сървъра.
// Ключът (лявата част) се пази в профилите и сбирките, затова не го сменяй, след като е пуснат.
// Надписът (дясната част) може да се сменя спокойно.
// Старите ключове biznes, sport, nargile, koli, geiming са запазени, за да работят и старите профили.

export const INTEREST_GROUPS = [
  {
    id: 'sport', label: 'Спорт и движение', items: {
      sport: 'Спорт (всякакъв)',
      fitnes: 'Фитнес',
      krosfit: 'Кросфит',
      kalistenika: 'Калистеника',
      begane: 'Бягане',
      futbol: 'Футбол',
      basketbol: 'Баскетбол',
      voleibol: 'Волейбол',
      tenis: 'Тенис',
      padel: 'Падел',
      badminton: 'Бадминтон',
      tenis_masa: 'Тенис на маса',
      plavane: 'Плуване',
      koloezdene: 'Колоездене',
      roleri: 'Ролери и скейтборд',
      boks: 'Бокс и ММА',
      boini: 'Бойни изкуства',
      yoga: 'Йога и пилатес',
      katerene: 'Катерене и боулдъринг',
      ski: 'Ски и сноуборд',
      bilyard: 'Билярд',
      bouling: 'Боулинг',
      darts: 'Дартс',
    },
  },
  {
    id: 'priroda', label: 'Природа и пътуване', items: {
      planina: 'Планина и походи',
      hizhi: 'Хижи',
      kamping: 'Къмпинг',
      patuvane: 'Пътувания из България',
      chuzhbina: 'Пътувания в чужбина',
      ekskurzii: 'Екскурзии за уикенда',
      ribolov: 'Риболов',
    },
  },
  {
    id: 'igri', label: 'Игри', items: {
      geiming: 'Гейминг (всякакъв)',
      ps5: 'PS5 и конзоли',
      pc_igri: 'Игри на компютър',
      cs2: 'CS2',
      lol: 'League of Legends',
      valorant: 'Valorant',
      fifa: 'FIFA / EA FC',
      mmo: 'MMO игри',
      nastolni: 'Настолни игри',
      karti: 'Карти (белот, сантасе)',
      poker: 'Покер',
      dnd: 'D&D и ролеви игри',
      shah: 'Шах',
      escape: 'Ескейп стаи',
      kuiz: 'Куиз вечери',
    },
  },
  {
    id: 'pari', label: 'Пари и бизнес', items: {
      biznes: 'Бизнес и пари',
      treiding: 'Трейдинг',
      investicii: 'Инвестиции',
      kripto: 'Крипто',
      startapi: 'Предприемачество и стартъпи',
      freelance: 'Фрийланс и странични бизнеси',
      marketing: 'Маркетинг и социални мрежи',
      networking: 'Нетуъркинг',
    },
  },
  {
    id: 'tech', label: 'Технологии', items: {
      programirane: 'Програмиране',
      hakatoni: 'Хакатони',
      ai: 'AI и автоматизация',
      ux: 'Уеб дизайн и UX/UI',
      hardware: 'Сглобяване на компютри',
      kibersigurnost: 'Киберсигурност',
      printer3d: '3D принтиране',
      robotika: 'Роботика',
    },
  },
  {
    id: 'izkustvo', label: 'Изкуство и творчество', items: {
      risuvane: 'Рисуване',
      dizain: 'Графичен дизайн',
      tattoo: 'Татуировки',
      foto: 'Фотография',
      video: 'Видео и монтаж',
      muzika: 'Свирене на инструмент',
      dj: 'DJ и продуциране',
      karaoke: 'Пеене и караоке',
      pisane: 'Писане и поезия',
      teatar: 'Театър и импровизация',
      standup: 'Стендъп комедия',
      rachna: 'Ръчна изработка и керамика',
      tanci: 'Танци (салса, бачата, хип-хоп)',
      narodni: 'Народни танци',
    },
  },
  {
    id: 'kultura', label: 'Култура и забавление', items: {
      kino: 'Кино',
      seriali: 'Сериали',
      anime: 'Аниме и манга',
      komiksi: 'Комикси',
      koncerti: 'Концерти',
      festivali: 'Фестивали',
      klubove: 'Клубове и купони',
      knigi: 'Книги и книжни клубове',
      muzei: 'Музеи и изложби',
      podkasti: 'Подкасти',
    },
  },
  {
    id: 'hrana', label: 'Храна и излизане', items: {
      nargile: 'Наргиле и чил',
      kafe: 'Кафе и кафенета',
      restoranti: 'Нови ресторанти',
      gotvene: 'Готвене и печене',
      barbekyu: 'Барбекю',
      vino: 'Вино',
      bira: 'Крафт бира',
      kokteili: 'Коктейли',
    },
  },
  {
    id: 'uchene', label: 'Учене и развитие', items: {
      ezici: 'Чужди езици и езикови обмени',
      debati: 'Дебати и публично говорене',
      psihologia: 'Психология и саморазвитие',
      istoria: 'История',
      filosofia: 'Философия',
      izpiti: 'Учене заедно за изпити',
      organizacii: 'Студентски организации',
      erasmus: 'Еразъм',
    },
  },
  {
    id: 'kauzi', label: 'Каузи', items: {
      dobrovolchestvo: 'Доброволчество',
      zhivotni: 'Помощ за животни и приюти',
      ekologia: 'Екология и почистване',
      darenie: 'Дарителски кампании',
    },
  },
  {
    id: 'stil', label: 'Начин на живот', items: {
      koli: 'Коли',
      tuning: 'Тунинг',
      motori: 'Мотори',
      moda: 'Мода и стил',
      second_hand: 'Секънд хенд',
      zdravoslovno: 'Здравословно хранене',
      meditacia: 'Медитация',
      lyubimci: 'Домашни любимци',
    },
  },
];

// Всички интереси в един обект: { ключ: надпис }
export const NICHES = Object.fromEntries(INTEREST_GROUPS.flatMap((g) => Object.entries(g.items)));

export const isNiche = (key) => typeof key === 'string' && Object.hasOwn(NICHES, key);

// Колко интереса може да си избере човек най-много
export const MAX_INTERESTS = 30;
