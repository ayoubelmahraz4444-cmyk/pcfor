Railway deployment — quick guide

1) Using the Railway web UI (recommended)

- Go to https://railway.app and sign in with GitHub.
- Click "New Project" → "Deploy from GitHub" and connect your repository `ayoubelmahraz4444-cmyk/pcfor`.
- Choose the `main` branch.
- Railway will detect a `Dockerfile` and build using it. If it does not, set the build command to `npm ci` and the start command to `npm start`.
- Set the environment variable `PORT` (Railway usually provides one automatically). Ensure your app uses `process.env.PORT || 3000` (already implemented).
- Deploy. Railway will provide a public URL when the service is up.

2) Optional: Using Railway CLI (advanced)

- Install the Railway CLI (follow Railway docs). Example (depending on system):
  - `npm i -g railway`
- Login: `railway login`
- In the project folder run: `railway init` and follow prompts to link/create a project.
- Deploy: `railway up` — this builds and deploys your project and prints the public URL.

3) Notes
- The included `Dockerfile` builds a production image. If you prefer the default Node build, remove the `Dockerfile` and set build/start commands as above.
- If your app requires extra environment variables (for example API keys), add them in the Railway project Settings → Variables.
- For automatic deploys on push, enable the GitHub integration in Railway when creating the project.

If you want, I can: create a Railway project for you (need you to authorize Railway with GitHub) or prepare a GitHub Action to trigger Railway deployments — which would you prefer?
