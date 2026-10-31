# NoSQL — Завдання 1: аналітична платформа для музичного стрімінгу

Документо-орієнтована модель MongoDB на прикладі
[Spotify Tracks Dataset](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset) (~114 000 треків).

## Структура

```
.
├── .env                        # рядок підключення (не комітиться)
├── .gitignore
├── .python-version             # версія Python для uv
├── pyproject.toml              # залежності проєкту
├── uv.lock                     # зафіксовані версії залежностей
├── requirements.txt            # залежності для pip
├── scripts/
│   ├── 01_load_data.py         # завантаження CSV → tracks_raw
│   └── 02_transform.js         # агрегація tracks_raw → tracks (MQL)
├── queries/
│   ├── part2_queries.js        # запити частини 2
│   └── part3_indexes.js        # індекси частини 3
└── README.md
```

## Налаштування

1. Створити кластер MongoDB Atlas, користувача БД і додати свою IP-адресу в Network Access.
2. Створити `.env` у корені проєкту з рядком підключення з Atlas (Connect → Drivers):
   ```
   MONGO_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/"
   ```
   Лапки потрібні, якщо в URI є `&` (наприклад, `?retryWrites=true&w=majority`).
   Базу `spotify` скрипти обирають самі.
3. Встановити [uv](https://docs.astral.sh/uv/) (`brew install uv`) і залежності:
   ```bash
   uv sync
   ```
   Без uv: `pip install -r requirements.txt`.
4. Завантажити датасет у корінь проєкту (`dataset.csv` у `.gitignore`).
   Потрібен API-токен Kaggle, збережений у `~/.kaggle/access_token`:
   ```bash
   uv run kaggle datasets download maharshipandya/-spotify-tracks-dataset --unzip
   ```
   Або завантажити архів вручну зі сторінки датасету і розпакувати `dataset.csv` у корінь.
5. Встановити [mongosh](https://www.mongodb.com/docs/mongodb-shell/install/): `brew install mongosh`.

## Запуск

```bash
set -a; source .env; set +a   # експортувати MONGO_URI у shell

uv run python scripts/01_load_data.py
mongosh "$MONGO_URI" --file scripts/02_transform.js
mongosh "$MONGO_URI" --file queries/part2_queries.js
mongosh "$MONGO_URI" --file queries/part3_indexes.js
```

## Схема документа `tracks`

`tracks_raw` — 113 999 документів: з CSV відкинуто 1 рядок без виконавця та назви треку.
`tracks` — ті самі 113 999 документів після `02_transform.js`. Приклад документа:

```js
{
  _id: ObjectId('6ae5abac01931f5371e9ee93'),
  track_id: '5SuOikwiRyPMVoIQDJUgSV',
  album_name: 'Comedy',
  track_name: 'Comedy',
  popularity: 73,
  duration_ms: 230666,
  explicit: false,
  track_genre: 'acoustic',
  artists: [
    'Gen Hoshino'
  ],
  audio_features: {
    danceability: 0.676,
    energy: 0.461,
    loudness: -6.746,
    speechiness: 0.143,
    acousticness: 0.0322,
    instrumentalness: 0.00000101,
    liveness: 0.358,
    valence: 0.715,
    tempo: 87.917,
    key: 1,
    mode: 0,
    time_signature: 4
  },
  duration_sec: 230.7,
  popularity_tier: 'high'
}
```

| Поле | Тип | Опис |
|---|---|---|
| `track_id`, `track_name`, `album_name`, `track_genre` | string | з CSV без змін |
| `popularity` | int | популярність 0–100 |
| `duration_ms` | int | тривалість у мілісекундах |
| `explicit` | bool | наявність explicit-контенту |
| `artists` | array of string | рядок виконавців, розбитий за `;` (кількох виконавців мають 30 075 треків) |
| `audio_features` | object | 12 аудіохарактеристик: `danceability`, `energy`, `loudness`, `speechiness`, `acousticness`, `instrumentalness`, `liveness`, `valence`, `tempo`, `key`, `mode`, `time_signature` |
| `duration_sec` | double | `duration_ms / 1000`, округлено до 1 знака |
| `popularity_tier` | string | `high` (≥ 70) — 5 472, `medium` (40–69) — 43 115, `low` (< 40) — 65 412 |

Особливість даних: унікальних `track_id` 89 740, бо один трек може належати кільком жанрам
(16 299 таких треків). Це треба враховувати в запитах, що рахують треки (завдання 2 частини 2).

## Вивід із термінала

Аналіз індексів (частина 3) — `mongosh "$MONGO_URI" --file queries/part3_indexes.js`.
Повні `explain("executionStats")` кожного запиту — у [`queries/part3_explain.json`](queries/part3_explain.json).

```
Завдання 1 — до індексу: SORT → COLLSCAN | indexName: — | nReturned: 354 | totalKeysExamined: 0 | totalDocsExamined: 113999 | executionTimeMillis: 77
Завдання 1 — після індексу: FETCH → IXSCAN | indexName: track_genre_1_popularity_-1_audio_features.danceability_1 | nReturned: 354 | totalKeysExamined: 412 | totalDocsExamined: 354 | executionTimeMillis: 3
Завдання 2 — до індексу: COLLSCAN | indexName: — | nReturned: 16141 | totalKeysExamined: 0 | totalDocsExamined: 113999 | executionTimeMillis: 131
Завдання 2 — після індексу: FETCH → IXSCAN | indexName: explicit_1_audio_features.instrumentalness_1_audio_features.speechiness_1 | nReturned: 16141 | totalKeysExamined: 16602 | totalDocsExamined: 16141 | executionTimeMillis: 37
Завдання 3 — без проєкції: FETCH → IXSCAN | indexName: track_genre_1_popularity_-1_audio_features.danceability_1 | nReturned: 317 | totalKeysExamined: 317 | totalDocsExamined: 317 | executionTimeMillis: 0
Завдання 3 — з проєкцією лише полів індексу: PROJECTION_COVERED → IXSCAN | indexName: track_genre_1_popularity_-1_audio_features.danceability_1 | nReturned: 317 | totalKeysExamined: 317 | totalDocsExamined: 0 | executionTimeMillis: 0
Повні explain() збережено в queries/part3_explain.json
```

## Відповіді на питання

### Частина 1

**Чому аудіохарактеристики винесені в `audio_features`, а не зберігаються плоско? Коли вкладення вигідне, а коли створює проблеми?**

12 полів (`danceability`, `energy`, `tempo`, `key` тощо) описують звучання треку, а не його метадані
(`track_name`, `artists`, `popularity`, `track_genre`), тому вони згруповані в один блок.
Вкладення вигідне, коли зв'язок 1:1, як тут: це 12 чисел, і окремо від треку вони не існують.

Крім того, такий блок зручніший в організації даних:
- документ читається простіше: метадані окремо, аудіо окремо;
- блок обробляється як одне поле: `{ audio_features: 1 }` у проєкції замість переліку 12 полів;
- окрема характеристика доступна через dot notation: `{ "audio_features.energy": { $gt: 0.7 } }`,
  а індекс на `audio_features.danceability` працює так само, як на плоскому полі.

**Чому виконавці зберігаються як масив, а не як рядок? Які запити стають простішими?**

У сирих даних виконавці записані одним рядком через `;` (`"Drake;Future"`), кількох виконавців мають
30 075 із 113 999 треків. Для бази рядок — одне неподільне значення: треки артиста можна знайти лише regex-ом,
який без якоря не використовує індекс ефективно і ловить підрядки (`/Drake/` знайде й «Drake Bell»).

У масиві кожен виконавець — окреме значення, отже можна зручніше організувати пошук/фільтрацію, 
та покращити продуктивність для запитів де використовуються артисти:

- треки артиста — проста рівність: `{ artists: "Drake" }` (MongoDB перевіряє кожен елемент масиву);
- спільні треки: `{ artists: { $all: ["Drake", "Future"] } }`, будь-хто зі списку: `{ artists: { $in: [...] } }`;
- колаборації: `{ "artists.1": { $exists: true } }`;
- індекс на `artists` стає multikey і індексує кожного виконавця окремо;
- статистика по артистах: `$unwind: "$artists"` → `$group` за іменем (завдання 2 частини 2).

### Частина 2

**Завдання 1.** Фільтр за вкладеними полями через dot notation (`"audio_features.danceability"` і
`"audio_features.energy"` з `$gt: 0.7`) та діапазон `duration_ms` з `$gte: 180000` / `$lte: 300000`.
Під фільтр підпадає 7 311 документів, але лише 5 328 унікальних треків, тому після `$match` записи групуються
за `track_id` (жанри — у масив `genres`, популярність — `$max`) і сортуються за популярністю; виводиться топ-10.
Результат: 5 328 треків, перший — «Calm Down (with Selena Gomez)» (92).

**Завдання 2.** Спершу `$group` за `track_id` лишає один запис на трек, інакше трек із кількох жанрів
рахується кілька разів (334 артисти замість 170). Далі `$unwind` за виконавцями, `$group` по артисту
з `$sum` / `$min` / `$avg`, `$match` (≥ 3 треки, мінімальна популярність ≥ 60), сортування за середньою
популярністю і `$limit: 20`. Результат: 170 артистів, перший — Harry Styles (92.0).

**Завдання 3.** Спершу `$group` за парою «жанр + `track_id`» лишає один запис на трек у жанрі (у датасеті є
повністю продубльовані рядки). Далі `$group` за жанром рахує `$avg` і `$stdDevPop` темпу та збирає треки в масив
через `$push`, `$addFields` обчислює поріг `avg + 2 * std`, а `$filter` лишає треки з темпом вище порогу
(`$sortArray` — за спаданням темпу). Середнє й поріг округлені до одного знака, але фільтр порівнює з точним
порогом. Результат: 114 жанрів, 3 493 нетипові треки; для `acoustic` — `avg_tempo: 119`,
`outlier_threshold: 178.5`, як у прикладі завдання.

**Завдання 4.** Фільтр за вкладеними полями (`loudness` < −10, `speechiness` < 0.1, `instrumentalness` > 0.5)
та `explicit: false`. 9 324 документи — це 8 311 унікальних треків, тому, як і в завданні 1, записи групуються
за `track_id`; виводиться топ-10 за популярністю. Перший — «everything i wanted» (Billie Eilish, 86).

### Частина 3

Значення нижче — з `explain("executionStats")` у `queries/part3_indexes.js` (повний вивід — у
`queries/part3_explain.json`); `executionTimeMillis` взято
з одного запуску на M0 і змінюється від запуску до запуску.

**Завдання 1.** Індекс `{ track_genre: 1, popularity: -1, "audio_features.danceability": 1 }` побудовано
за правилом ESR: поле точного збігу → поле сортування → діапазон.

| | До індексу | Після |
|---|---|---|
| план (`winningPlan`) | `SORT → COLLSCAN` | `FETCH → IXSCAN` |
| `indexName` | — | `track_genre_1_popularity_-1_audio_features.danceability_1` |
| `nReturned` | 354 | 354 |
| `totalKeysExamined` | 0 | 412 |
| `totalDocsExamined` | 113 999 | 354 |
| `executionTimeMillis` | 77 | 3 |

*Що змінилося в плані виконання?* Замість повного перебору колекції (`COLLSCAN`) і сортування в пам'яті (`SORT`)
MongoDB читає лише ключі індексу для `pop`, і вони вже впорядковані за `popularity`, тому стадія `SORT` зникла.
Варіант `{ track_genre, danceability, popularity }` переглядає менше ключів (354), але потребує `SORT` у пам'яті.

*Як зрозуміти, що індекс використовується?* У `winningPlan` є стадія `IXSCAN` з `indexName` створеного індексу,
`totalKeysExamined` > 0, а `totalDocsExamined` дорівнює `nReturned` (354 замість 113 999).

**Завдання 2.** Індекс `{ explicit: 1, "audio_features.instrumentalness": 1, "audio_features.speechiness": 1 }`:
рівність (`explicit`) першою, далі більш вибірковий діапазон (`instrumentalness > 0.5` лишає 18 850 документів,
`speechiness < 0.1` — 90 814).

| | До індексу | Після |
|---|---|---|
| план (`winningPlan`) | `COLLSCAN` | `FETCH → IXSCAN` |
| `indexName` | — | `explicit_1_audio_features.instrumentalness_1_audio_features.speechiness_1` |
| `nReturned` | 16 141 | 16 141 |
| `totalKeysExamined` | 0 | 16 602 |
| `totalDocsExamined` | 113 999 | 16 141 |
| `executionTimeMillis` | 131 | 37 |

Індекс використовується: `IXSCAN` з цим `indexName`, і документів читається рівно стільки, скільки повертається.

**Завдання 3. Чи є запит `find({ track_genre: "pop", popularity: { $gte: 70 } })` покривним?**

Ні. Запит покривний (covered), коли і поля фільтра, і всі поля, що повертаються, є в індексі — тоді MongoDB
відповідає з самого індексу, не читаючи документів.

Індекс із завдання 1 — `{ track_genre: 1, popularity: -1, "audio_features.danceability": 1 }`. Фільтр
використовує його префікс (`track_genre` + `popularity`), тому індекс працює: `IXSCAN` з межами
`track_genre: ["pop", "pop"]`, `popularity: [inf, 70]`. Але без проєкції запит повертає документи цілком,
а `_id`, `track_name`, `artists` та інших полів в індексі немає. Тому після `IXSCAN` іде стадія `FETCH`:
`nReturned: 317`, `totalDocsExamined: 317`.

Покривним запит стає з проєкцією лише полів індексу і без `_id`:

```js
db.tracks.find(
  { track_genre: "pop", popularity: { $gte: 70 } },
  { _id: 0, track_genre: 1, popularity: 1 }
);
```

План: `PROJECTION_COVERED → IXSCAN`, `totalDocsExamined: 0`. `_id` треба виключати явно, бо він повертається
за замовчуванням, а в цьому індексі його немає. Ще одна умова — індекс не multikey: покрити запит по полю-масиву
(наприклад, `artists`) індекс не може; тут `isMultiKey: false`.

