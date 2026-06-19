# Local PC Monitor Dashboard

A simple local website that displays PC performance stats for CPU, GPU, memory, disk, and network.

## Setup

1. Open a terminal in `c:\Users\hp\Downloads\yh`
2. Run `npm install`
3. Run `npm start`
4. Open `http://localhost:3000` in your browser

## Notes

- This app runs only on your local machine because it reads your PC hardware using Node.js.
- The `systeminformation` library does not work on a phone directly.
- The website itself can be opened on a phone if the PC server is reachable on the same network.
- Refreshes automatically every 3 seconds.

## Use on PC and phone

- Run the app on your PC with `npm start`.
- Open `http://localhost:3000` on the same PC.
- To open it on your phone, use your PC local IP address, for example `http://192.168.1.10:3000`.
- Your phone and PC must be on the same Wi-Fi network.
- The phone will only view the dashboard; it cannot read the phone hardware.

## Publish to GitHub

1. Create a GitHub account if you do not have one.
2. Create a new repository on GitHub.
3. In `c:\Users\hp\Downloads\yh`, run:

```bash
git init
git add .
git commit -m "Initial PC monitor dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

4. Your code will now be on GitHub.

## Free deployment

- GitHub stores the source code, but to run the app online you need a Node.js host.
- Good free options: Render, Railway, Fly.io.
- On those services, choose "Deploy from GitHub" and connect your repo.
- The app will then run online and anyone can visit the published URL.

## Important

- If you deploy online, the dashboard will show stats for the server machine, not your PC.
- To monitor your PC specifically, keep the app running on your PC and use the local IP address from another device.
