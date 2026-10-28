const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = "http://127.0.0.1:8888/callback";
const state = crypto.randomBytes(16).toString("hex");

if (!clientId || !clientSecret) {
  console.log("Add your Spotify Client ID and Client Secret to .env first.");
  process.exit(1);
}

const authUrl = new URL("https://accounts.spotify.com/authorize");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", redirectUri);
authUrl.searchParams.set("scope", "user-read-playback-state user-read-currently-playing");
authUrl.searchParams.set("state", state);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);

  if (url.pathname !== "/callback") {
    res.writeHead(404);
    return res.end("Not found");
  }

  if (url.searchParams.get("state") !== state) {
    res.writeHead(400);
    return res.end("State mismatch. Try again.");
  }

  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    return res.end("Spotify authorization was not completed.");
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    if (!response.ok || !data.refresh_token) {
      console.log("Spotify error:", data.error || data.error_description || "No refresh token returned");
      res.writeHead(400);
      return res.end("Token exchange failed. Check your terminal.");
    }

    let env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";

    if (/^SPOTIFY_REFRESH_TOKEN=.*$/m.test(env)) {
      env = env.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m,
        `SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`);
    } else {
      env += `\nSPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`;
    }

    fs.writeFileSync(".env", env);
    console.log("Refresh token saved to .env. Keep it private.");

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Spotify authorization successful. You can return to Termux.");
  } catch (err) {
    console.error("Error:", err.message);
    res.writeHead(500);
    res.end("Authorization failed.");
  } finally {
    server.close();
  }
});

server.listen(8888, "127.0.0.1", () => {
  console.log("Open this URL in your browser:\n");
  console.log(authUrl.toString());
  console.log("\nWaiting for Spotify authorization...");
});
