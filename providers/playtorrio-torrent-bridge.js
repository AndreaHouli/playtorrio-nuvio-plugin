/*
 * PlayTorrio Torrent Bridge for Nuvio
 */

function getStreams(tmdbId, mediaType, season, episode) {
  var type = mediaType === "tv" ? "series" : "movie";
  var id = String(tmdbId || "").trim();

  if (!id) {
    return Promise.resolve([]);
  }

  // Nuvio normally provides a numeric TMDB ID.
  // Torrentio accepts the Stremio tmdb: prefix.
  if (id.indexOf("tt") !== 0 && id.indexOf("tmdb:") !== 0) {
    id = "tmdb:" + id;
  }

  // Series format: tmdb:ID:season:episode
  if (type === "series") {
    if (season == null || episode == null) {
      return Promise.resolve([]);
    }

    id = id + ":" + String(season) + ":" + String(episode);
  }

  var url =
    "https://torrentio.strem.fun/stream/" +
    type +
    "/" +
    encodeURIComponent(id) +
    ".json";

  console.log("[PlayTorrio Bridge] Request: " + url);

  return fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return response.json();
    })
    .then(function(data) {
      var streams =
        data && Array.isArray(data.streams)
          ? data.streams
          : [];

      return streams
        .filter(function(stream) {
          return stream && stream.url;
        })
        .map(function(stream) {
          var hints = stream.behaviorHints || {};

          return {
            name: "PlayTorrio / Torrentio",
            title: stream.title || stream.name || "Torrent stream",
            url: stream.url,
            quality: stream.quality || "Auto",
            size:
              hints.videoSize != null
                ? String(hints.videoSize)
                : undefined,
            headers: stream.headers || undefined
          };
        });
    })
    .catch(function(error) {
      console.log(
        "[PlayTorrio Bridge] Error: " +
        String(error && error.message || error)
      );

      return [];
    });
}

module.exports = {
  getStreams: getStreams
};
