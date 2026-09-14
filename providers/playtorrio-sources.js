/*
 * PlayTorrio Sources for Nuvio
 * Torrentio bridge
 */

function getStreams(tmdbId, mediaType, season, episode) {
  var type = mediaType === "tv" ? "series" : "movie";
  var rawId = String(tmdbId || "").trim();

  if (!rawId) {
    return Promise.resolve([]);
  }

  var streamId =
    rawId.indexOf("tt") === 0
      ? rawId
      : (rawId.indexOf("tmdb:") === 0
          ? rawId
          : "tmdb:" + rawId);

  if (type === "series") {
    if (season == null || episode == null) {
      return Promise.resolve([]);
    }

    streamId =
      streamId +
      ":" +
      String(season) +
      ":" +
      String(episode);
  }

  var url =
    "https://torrentio.strem.fun/stream/" +
    type +
    "/" +
    encodeURIComponent(streamId) +
    ".json";

  return fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      var streams =
        Array.isArray(data && data.streams)
          ? data.streams
          : [];

      return streams
        .filter(function (s) {
          return s && s.url;
        })
        .map(function (s) {
          var hints = s.behaviorHints || {};

          return {
            name: "PlayTorrio",
            title: s.title || s.name || "Torrent stream",
            url: s.url,
            quality: s.quality || "Auto",
            size:
              hints.videoSize != null
                ? String(hints.videoSize)
                : undefined,
            headers: s.headers || undefined
          };
        });
    })
    .catch(function (error) {
      console.log(
        "[PlayTorrio] " +
        String(error && error.message || error)
      );

      return [];
    });
}

module.exports = {
  getStreams: getStreams
};
