/* GET /api/now-playing: what is playing on Tharun's Spotify right now (or the last track played).

   Spotify only hands out "currently playing" data through an authenticated API, and the secrets must never ship in the
   page, so the walkman on the site calls this small serverless function instead (Vercel picks up the /api folder).

   One-time setup:
     1. Create an app at https://developer.spotify.com/dashboard and add a redirect URI such as http://127.0.0.1:3000/callback
     2. Authorise it once with the scopes  user-read-currently-playing user-read-recently-played  and keep the refresh token
     3. In the Vercel project settings add these environment variables:
          SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
   Until that is done the walkman shows a sample track. */

const API = 'https://api.spotify.com/v1';

async function accessToken() {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  });
  if (!r.ok) throw new Error('token');
  return (await r.json()).access_token;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
  try {
    const auth = { headers: { Authorization: 'Bearer ' + (await accessToken()) } };
    let item = null, playing = false, progress = 0;
    const now = await fetch(`${API}/me/player/currently-playing?additional_types=track`, auth);
    if (now.status === 200) {
      const j = await now.json();
      if (j.item && j.item.type === 'track') { item = j.item; playing = !!j.is_playing; progress = j.progress_ms || 0; }
    }
    if (!item) {
      const recent = await fetch(`${API}/me/player/recently-played?limit=1`, auth);
      const j = recent.ok ? await recent.json() : { items: [] };
      item = j.items && j.items[0] && j.items[0].track;
    }
    if (!item) return res.status(200).json({ isPlaying: false });
    res.status(200).json({
      isPlaying: playing,
      id: item.id,
      title: item.name,
      artist: item.artists.map((a) => a.name).join(', '),
      album: item.album.name,
      cover: (item.album.images && (item.album.images[1] || item.album.images[0]) || {}).url,
      durationMs: item.duration_ms,
      progressMs: progress,
      url: item.external_urls.spotify,
    });
  } catch (e) {
    res.status(500).json({ error: 'spotify' });
  }
};
