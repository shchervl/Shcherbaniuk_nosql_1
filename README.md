# NoSQL — Завдання 1: аналітична платформа для музичного стрімінгу

Документо-орієнтована модель MongoDB на прикладі
[Spotify Tracks Dataset](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset) (~114 000 треків).

## Структура

```
.
├── .env                        # рядок підключення (не комітиться)
├── .gitignore
├── requirements.txt
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
2. Створити `.env` у корені проєкту (значення в лапках, бо URI містить `&`):
   ```
   MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/spotify?retryWrites=true&w=majority"
   ```
   Назва бази (`spotify`) задається в шляху URI — її використовують і Python-скрипт, і mongosh.
3. Завантажити `dataset.csv` з Kaggle у папку `data/` (вона в `.gitignore`).
4. Встановити залежності:
   ```bash
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   ```
5. Встановити [mongosh](https://www.mongodb.com/docs/mongodb-shell/install/): `brew install mongosh`.

## Запуск

```bash
set -a; source .env; set +a   # експортувати MONGODB_URI у shell

python scripts/01_load_data.py
mongosh "$MONGODB_URI" scripts/02_transform.js
mongosh "$MONGODB_URI" queries/part2_queries.js
mongosh "$MONGODB_URI" queries/part3_indexes.js
```

## Схема документа `tracks`

TODO

## Скріншоти

TODO

## Відповіді на питання

TODO
