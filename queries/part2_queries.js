// Частина 2: запити до колекції tracks.
// Запуск: mongosh "$MONGO_URI" --file queries/part2_queries.js

db = db.getSiblingDB("spotify");

// --- Завдання 1. Треки для вечірки ---
const partyFilter = {
  "audio_features.danceability": { $gt: 0.7 },
  "audio_features.energy": { $gt: 0.7 },
  duration_ms: { $gte: 180000, $lte: 300000 }
};
print("Завдання 1. Треків для вечірки:", db.tracks.distinct("track_id", partyFilter).length);
printjson(
  db.tracks.aggregate([
    { $match: partyFilter },
    // один трек буває в кількох жанрах — об'єднуємо його записи за track_id
    { $group: {
        _id: "$track_id",
        track_name: { $first: "$track_name" },
        artists: { $first: "$artists" },
        popularity: { $max: "$popularity" },
        genres: { $addToSet: "$track_genre" }
    } },
    { $sort: { popularity: -1, _id: 1 } },
    { $limit: 10 }
  ]).toArray()
);

// --- Завдання 2. Виконавці, у яких усі треки популярні ---
print("Завдання 2. Топ-20 артистів, у яких усі треки популярні:");
printjson(
  db.tracks.aggregate([
    // спершу один запис на трек, щоб повтори в різних жанрах не рахувались як окремі треки
    { $group: { _id: "$track_id", artists: { $first: "$artists" }, popularity: { $max: "$popularity" } } },
    { $unwind: "$artists" },
    { $group: {
        _id: "$artists",
        track_count: { $sum: 1 },
        min_popularity: { $min: "$popularity" },
        avg_popularity: { $avg: "$popularity" }
    } },
    { $match: { track_count: { $gte: 3 }, min_popularity: { $gte: 60 } } },
    { $sort: { avg_popularity: -1, track_count: -1, _id: 1 } },
    { $limit: 20 },
    { $project: {
        _id: 0,
        artist: "$_id",
        track_count: 1,
        min_popularity: { $round: ["$min_popularity", 1] },
        avg_popularity: { $round: ["$avg_popularity", 1] }
    } }
  ]).toArray()
);

// --- Завдання 3. Нетипові треки ---
const outliers = db.tracks.aggregate([
  // один запис на трек у межах жанру — у датасеті є повністю продубльовані рядки
  { $group: {
      _id: { genre: "$track_genre", track_id: "$track_id" },
      track: { $first: {
          _id: "$_id",
          track_name: "$track_name",
          popularity: "$popularity",
          artists: "$artists",
          audio_features: { tempo: "$audio_features.tempo" }
      } }
  } },
  { $group: {
      _id: "$_id.genre",
      avg_tempo: { $avg: "$track.audio_features.tempo" },
      std_tempo: { $stdDevPop: "$track.audio_features.tempo" },
      tracks: { $push: "$track" }
  } },
  { $addFields: { outlier_threshold: { $add: ["$avg_tempo", { $multiply: [2, "$std_tempo"] }] } } },
  { $addFields: { outlier_tracks: { $sortArray: {
      input: { $filter: { input: "$tracks", cond: { $gt: ["$$this.audio_features.tempo", "$outlier_threshold"] } } },
      sortBy: { "audio_features.tempo": -1 }
  } } } },
  { $project: {
      _id: 0,
      avg_tempo: { $round: ["$avg_tempo", 1] },
      std_tempo: { $round: ["$std_tempo", 1] },
      genre: "$_id",
      outlier_threshold: { $round: ["$outlier_threshold", 1] },
      outlier_count: { $size: "$outlier_tracks" },
      outlier_tracks: "$outlier_tracks"
  } },
  { $sort: { genre: 1 } }
]).toArray();
print("Завдання 3. Жанрів:", outliers.length,
      "| нетипових треків:", outliers.reduce((n, g) => n + g.outlier_count, 0));
const outliersFile = "queries/part2_task3_outliers.json";
require("fs").writeFileSync(outliersFile, EJSON.stringify(outliers, null, 2));
print("Повний результат збережено в", outliersFile);


// --- Завдання 4. Треки для фонової роботи ---
const workFilter = {
  "audio_features.loudness": { $lt: -10 },
  "audio_features.speechiness": { $lt: 0.1 },
  "audio_features.instrumentalness": { $gt: 0.5 },
  explicit: false
};

print("Завдання 4. Треків для фонової роботи:", db.tracks.distinct("track_id", workFilter).length);
printjson(
  db.tracks.aggregate([
    { $match: workFilter },
    // один трек буває в кількох жанрах — об'єднуємо його записи за track_id
    { $group: {
        _id: "$track_id",
        track_name: { $first: "$track_name" },
        artists: { $first: "$artists" },
        popularity: { $max: "$popularity" },
        genres: { $addToSet: "$track_genre" }
    } },
    { $sort: { popularity: -1, _id: 1 } },
    { $limit: 10 }
  ]).toArray()
);
