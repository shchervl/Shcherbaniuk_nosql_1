// Частина 3: індекси та оптимізація.
// Запуск: mongosh "$MONGO_URI" --file queries/part3_indexes.js

db = db.getSiblingDB("spotify");

// у консоль — ключові поля explain(), повні explain() — у файл
const explainFile = "queries/part3_explain.json";
const explains = {};
const explainQuery = (label, cursor) => {
  const e = cursor.explain("executionStats");
  const stages = [];
  let indexName = "—";
  for (let p = e.queryPlanner.winningPlan; p; p = p.inputStage) {
    stages.push(p.stage);
    if (p.indexName) indexName = p.indexName;
  }
  const s = e.executionStats;
  print(`${label}: ${stages.join(" → ")} | indexName: ${indexName} | nReturned: ${s.nReturned}` +
        ` | totalKeysExamined: ${s.totalKeysExamined} | totalDocsExamined: ${s.totalDocsExamined}` +
        ` | executionTimeMillis: ${s.executionTimeMillis}`);
  delete e.serverInfo; // адреса кластера не потрібна в публічному репозиторії
  explains[label] = e;
};

// прибираємо індекси з попередніх запусків, щоб explain «до» виконувався без індексів
db.tracks.dropIndexes();

// --- Завдання 1. Аналіз запиту та індексація ---
const popFilter = { track_genre: "pop", "audio_features.danceability": { $gte: 0.7 } };
explainQuery("Завдання 1 — до індексу", db.tracks.find(popFilter).sort({ popularity: -1 }));

// ESR: рівність (track_genre) → сортування (popularity) → діапазон (danceability)
db.tracks.createIndex({ track_genre: 1, popularity: -1, "audio_features.danceability": 1 });
explainQuery("Завдання 1 — після індексу", db.tracks.find(popFilter).sort({ popularity: -1 }));

// --- Завдання 2. Індекс для інших полів ---
const workFilter = {
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 },
  explicit: false
};
explainQuery("Завдання 2 — до індексу", db.tracks.find(workFilter));

// рівність (explicit) першою, далі більш вибірковий діапазон (instrumentalness), потім speechiness
db.tracks.createIndex({ explicit: 1, "audio_features.instrumentalness": 1, "audio_features.speechiness": 1 });
explainQuery("Завдання 2 — після індексу", db.tracks.find(workFilter));

// --- Завдання 3. Покривний запит ---
const coveredFilter = { track_genre: "pop", popularity: { $gte: 70 } };
explainQuery("Завдання 3 — без проєкції", db.tracks.find(coveredFilter));
explainQuery("Завдання 3 — з проєкцією лише полів індексу",
             db.tracks.find(coveredFilter, { _id: 0, track_genre: 1, popularity: 1 }));

require("fs").writeFileSync(explainFile, EJSON.stringify(explains, null, 2));
print("Повні explain() збережено в", explainFile);
