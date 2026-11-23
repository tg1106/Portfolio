/* GET /api/now-playing: what Tharun is listening to right now (or the last song), read from Last.fm.

   Spotify scrobbles every song to Last.fm; Last.fm's API is free and has no Premium requirement, so the walkman reads from there.
   The API key must not ship in the page, so the page calls this small serverless function (Vercel serves everything in /api).

   One-time setup:
     1. Make a free account at https://www.last.fm and connect Spotify: https://www.last.fm/settings/applications -> "Connect" under Spotify.
        Also in https://www.last.fm/settings/privacy, leave "Hide recent listening information" UNticked, or the API returns nothing.
     2. Get an API key: https://www.last.fm/api/account/create (name and description can be anything; leave the callback URL empty).
     3. Vercel project -> Settings -> Environment Variables:  LASTFM_USER (your Last.fm username)  and  LASTFM_API_KEY. Redeploy.
   Until that is done the walkman shows a sample track.

   Last.fm knows which song is "now playing" but not how far into it you are, so progress is estimated from the previous scrobble
   (progressMs is null when that cannot be worked out and the page counts up from when it first saw the song).

   Response: { isPlaying, title, artist, album, cover, durationMs, progressMs, url }  (or { isPlaying: false } when there is no history) */

const ROOT = 'https://ws.audioscrobbler.com/2.0/';
const NO_ART = '2a96cbd8b46e442fc41c2b86b821562f';   // the grey star Last.fm sends when a song has no cover
const durations = new Map();                           // 'artist|title' -> ms (0 = unknown); a song's length never changes

async function lastfm(params) {
  const { LASTFM_API_KEY: key } = process.env;
  const r = await fetch(ROOT + '?' + new URLSearchParams({ ...params, api_key: key, format: 'json' }), { headers: { 'User-Agent': 'portfolio-now-playing/1.0' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw Object.assign(new Error(j.message || 'lastfm'), { code: 'lastfm', lastfmError: j.error });
  return j;
}

async function duration(artist, title) {
  const k = artist + '|' + title;
  if (durations.has(k)) return durations.get(k);
  let ms = 0;
  try { ms = +(await lastfm({ method: 'track.getInfo', artist, track: title, autocorrect: 1 })).track.duration || 0; } catch (e) { /* no length: the page copes */ }
  durations.set(k, ms);
  return ms;
}

const artistOf = (t) => (t.artist && (t.artist.name || t.artist['#text'])) || '';
const coverOf = (t) => {
  const img = (t.image || []).find((i) => i.size === 'extralarge') || (t.image || []).slice(-1)[0];
  return img && img['#text'] && !img['#text'].includes(NO_ART) ? img['#text'] : null;
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
  try {
    const { LASTFM_USER: user, LASTFM_API_KEY: key } = process.env;
    if (!user || !key) throw Object.assign(new Error('not configured'), { code: 'not_configured' });
    const j = await lastfm({ method: 'user.getRecentTracks', user, limit: 2, extended: 1 });
    let tracks = (j.recenttracks && j.recenttracks.track) || [];
    if (!Array.isArray(tracks)) tracks = [tracks];
    const cur = tracks[0];
    if (!cur) return res.status(200).json({ isPlaying: false });
    const playing = !!(cur['@attr'] && cur['@attr'].nowplaying === 'true');
    const title = cur.name, artist = artistOf(cur);
    const durationMs = await duration(artist, title);
    let progressMs = playing ? null : 0;
    const prev = playing && tracks[1];
    if (prev && prev.date && durationMs) {            // this song started when the previous one ended
      const started = +prev.date.uts * 1000 + (await duration(artistOf(prev), prev.name));
      const p = Date.now() - started;
      if (p >= 0 && p <= durationMs) progressMs = p;
    }
    res.status(200).json({
      isPlaying: playing, title, artist, album: (cur.album && cur.album['#text']) || '', cover: coverOf(cur),
      durationMs: durationMs || null, progressMs, url: cur.url,
    });
  } catch (e) {
    // 503 = not set up yet (the page falls back to its sample track), 500 = Last.fm refused or failed
    res.status(e.code === 'not_configured' ? 503 : 500).json({ error: e.code || 'lastfm' });
  }
};
