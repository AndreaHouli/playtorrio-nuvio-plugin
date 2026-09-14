/*
 * PlayTorrio True Sources for Nuvio
 *
 * Goal:
 *   - Use the same torrent source family used by PlayTorrioV3 where it
 *     can be reached from a browser-compatible Nuvio provider.
 *   - Knaben is queried directly through its documented JSON API.
 *   - Torrentio is used as a Stremio-compatible fallback.
 *
 * Nuvio signature:
 *   getStreams(tmdbId, mediaType, season, episode)
 *
 * Important:
 *   Nuvio supplies a TMDB id, while Knaben needs a title query.
 *   We therefore try Cinemeta-compatible metadata lookup first.
 *   If that lookup is unavailable, the Torrentio fallback is still tried
 *   using tmdb:<id>.
 */

var CINEMETA = "https://v3-cinemeta.strem.io/meta";
var KNABEN = "https://api.knaben.org/v1";
var TORRENTIO = "https://torrentio.strem.fun/stream";

function safeString(value) {
  return value == null ? "" : String(value).trim();
}

function mediaKind(mediaType) {
  return mediaType === "tv" || mediaType === "series"
    ? "series"
    : "movie";
}

function makeStream(name, title, url, quality, size, headers) {
  var result = {
    name: name,
    title: title || "Torrent stream",
    url: url,
    quality: quality || "Auto"
  };

  if (size != null) result.size = String(size);
  if (headers) result.headers = headers;

  return result;
}

function metadataLookup(type, tmdbId) {
  var id = "tmdb:" + safeString(tmdbId);

  return fetch(
    CINEMETA + "/" + type + "/" + encodeURIComponent(id) + ".json"
  )
    .then(function (response) {
      if (!response.ok) throw new Error("Cinemeta HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      return data && data.meta ? data.meta : null;
    })
    .catch(function () {
      return null;
    });
}

function knabenSearch(query, type) {
  var categories = type === "series"
    ? [2000000]
    : [3000000];

  var body = {
    search_type: "100%",
    search_field: "title",
    query: query,
    order_by: "seeders",
    order_direction: "desc",
    categories: categories,
    from: 0,
    size: 50,
    hide_unsafe: true,
    hide_xxx: true
  };

  return fetch(KNABEN, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Knaben HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      return Array.isArray(data && data.hits) ? data.hits : [];
    });
}

function normalizeKnaben(hits, type, season, episode) {
  var wantedEpisode = type === "series" &&
    season != null && episode != null
      ? "s" + String(season).padStart(2, "0") +
        "e" + String(episode).padStart(2, "0")
      : null;

  return hits
    .filter(function (hit) {
      return hit && (hit.magnetUrl || hit.link) && hit.title;
    })
    .filter(function (hit) {
      if (!wantedEpisode) return true;
      var t = String(hit.title).toLowerCase();
      return t.indexOf(wantedEpisode) >= 0 ||
             t.indexOf("s" + String(season) + "e" + String(episode)) >= 0;
    })
    .slice(0, 30)
    .map(function (hit) {
      var seeders = hit.seeders != null ? String(hit.seeders) : "?";
      var peers = hit.peers != null ? String(hit.peers) : "?";
      var size = hit.bytes != null ? String(hit.bytes) : undefined;

      return makeStream(
        "PlayTorrio / Knaben",
        String(hit.title) +
          "\nSeeders: " + seeders +
          "  Peers: " + peers,
        hit.magnetUrl || hit.link,
        "Auto",
        size
      );
    });
}

function torrentioLookup(type, tmdbId, season, episode) {
  var id = "tmdb:" + safeString(tmdbId);

  if (type === "series") {
    if (season == null || episode == null) return Promise.resolve([]);
    id += ":" + String(season) + ":" + String(episode);
  }

  var url =
    TORRENTIO + "/" +
    type + "/" +
    encodeURIComponent(id) +
    ".json";

  return fetch(url)
    .then(function (response) {
      if (!response.ok) throw new Error("Torrentio HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var streams = Array.isArray(data && data.streams)
        ? data.streams
        : [];

      return streams
        .filter(function (s) { return s && s.url; })
        .map(function (s) {
          var hints = s.behaviorHints || {};
          return makeStream(
            "PlayTorrio / Torrentio",
            s.title || s.name || "Torrent stream",
            s.url,
            s.quality || "Auto",
            hints.videoSize,
            s.headers
          );
        });
    })
    .catch(function (error) {
      console.log("[PlayTorrio Sources] Torrentio: " +
        String(error && error.message || error));
      return [];
    });
}

function uniqueStreams(streams) {
  var seen = {};
  var result = [];

  streams.forEach(function (s) {
    if (!s || !s.url) return;
    if (seen[s.url]) return;
    seen[s.url] = true;
    result.push(s);
  });

  return result;
}

function getStreams(tmdbId, mediaType, season, episode) {
  var type = mediaKind(mediaType);
  var id = safeString(tmdbId);

  if (!id) return Promise.resolve([]);

  /*
   * Parallel metadata lookup and Torrentio fallback.
   * If metadata gives us a title, Knaben is searched with that title.
   */
  return Promise.all([
    metadataLookup(type, id),
    torrentioLookup(type, id, season, episode)
  ])
    .then(function (results) {
      var meta = results[0];
      var torrentioStreams = results[1] || [];

      var title = meta && meta.name
        ? safeString(meta.name)
        : "";

      if (!title) {
        return torrentioStreams;
      }

      var query = title;

      if (meta && meta.year) {
        query += " " + String(meta.year);
      }

      if (type === "series" && season != null && episode != null) {
        query += " S" + String(season).padStart(2, "0") +
          "E" + String(episode).padStart(2, "0");
      }

      return knabenSearch(query, type)
        .then(function (hits) {
          var knabenStreams =
            normalizeKnaben(hits, type, season, episode);

          return uniqueStreams(knabenStreams.concat(torrentioStreams));
        })
        .catch(function (error) {
          console.log("[PlayTorrio Sources] Knaben: " +
            String(error && error.message || error));
          return torrentioStreams;
        });
    })
    .catch(function (error) {
      console.log("[PlayTorrio Sources] Final: " +
        String(error && error.message || error));
      return torrentioLookup(type, id, season, episode);
    });
}

module.exports = { getStreams };
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
