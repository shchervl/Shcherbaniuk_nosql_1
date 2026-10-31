// Трансформація tracks_raw → tracks через Aggregation Pipeline.
// Запуск: mongosh "$MONGODB_URI" scripts/02_transform.js

db.tracks_raw.aggregate([
  // TODO: стадії трансформації в документо-орієнтовану схему
  { $out: "tracks" },
]);
