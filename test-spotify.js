require('dotenv').config();

const SpotifyService = require('./spotifyService');

async function main() {
  const spotify = new SpotifyService(
    process.env.SPOTIFY_CLIENT_ID,
    process.env.SPOTIFY_CLIENT_SECRET,
    process.env.SPOTIFY_REFRESH_TOKEN
  );

  try {
    const track = await spotify.getCurrentlyPlaying();

    if (!track) {
      console.log('Spotify connected, but no track is currently playing.');
      return;
    }

    console.log('Spotify connection successful!');
    console.log('Track:', track.name);
    console.log('Artist:', track.artists);
    console.log('Playing:', track.isPlaying);
  } catch (error) {
    console.log('Spotify test failed:', error.message);
  }
}

main();
