/*
 * PlayTorrio Torrent Bridge for Nuvio
 * Uses the Stremio-compatible Torrentio endpoint.
 * This is intentionally a bridge: it does not embed PlayTorrio's Dart engine.
 */
function getStreams(tmdbId, mediaType, season, episode) {
  var type = mediaType === "tv" ? "series" : "movie";
  var id = String(tmdbId);

  if (type === "series") {
    if (season == null || episode == null) return Promise.resolve([]);
    id = id + ":" + String(season) + ":" + String(episode);
  }

  var url = "https://torrentio.strem.fun/stream/" + type + "/" +
            encodeURIComponent(id) + ".json";

  return fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error("Torrent endpoint HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      var streams = Array.isArray(data.streams) ? data.streams : [];
      return streams.map(function (s) {
        return {
          name: "PlayTorrio Torrent Bridge",
          title: s.title || s.name || "Torrent stream",
          url: s.url,
          quality: s.quality || "Auto",
          size: s.behaviorHints && s.behaviorHints.videoSize
            ? String(s.behaviorHints.videoSize)
            : undefined,
          headers: s.headers || undefined
        };
      }).filter(function (s) { return !!s.url; });
    })
    .catch(function (e) {
      console.log("[PlayTorrio Torrent Bridge] " + String(e));
      return [];
    });
}

module.exports = { getStreams };
