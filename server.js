const express = require('express');
const path = require('path');
const si = require('systeminformation');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server);

// In-memory pairing tokens and paired devices
const pairingTokens = new Map(); // token -> { createdAt }
const pairedDevices = new Map(); // token -> deviceInfo

const KNOWN_GAME_REQUIREMENTS = [
  { key: 'cyberpunk 2077', name: 'Cyberpunk 2077', ram: 12 * 1024 * 1024 * 1024, storage: 70 * 1024 * 1024 * 1024, aliases: ['cyberpunk'] },
  { key: 'fortnite', name: 'Fortnite', ram: 8 * 1024 * 1024 * 1024, storage: 30 * 1024 * 1024 * 1024 },
  { key: 'minecraft', name: 'Minecraft', ram: 2 * 1024 * 1024 * 1024, storage: 4 * 1024 * 1024 * 1024 },
  { key: 'valorant', name: 'Valorant', ram: 4 * 1024 * 1024 * 1024, storage: 15 * 1024 * 1024 * 1024 },
  { key: 'gta v', name: 'GTA V', ram: 8 * 1024 * 1024 * 1024, storage: 72 * 1024 * 1024 * 1024, aliases: ['gtav', 'gta'] },
  { key: 'elden ring', name: 'Elden Ring', ram: 12 * 1024 * 1024 * 1024, storage: 60 * 1024 * 1024 * 1024 },
  { key: 'call of duty modern warfare', name: 'Call of Duty Modern Warfare', ram: 12 * 1024 * 1024 * 1024, storage: 90 * 1024 * 1024 * 1024, aliases: ['cod modern warfare'] },
  { key: 'baldurs gate 3', name: 'Baldur\'s Gate 3', ram: 12 * 1024 * 1024 * 1024, storage: 150 * 1024 * 1024 * 1024 },
  { key: 'starfield', name: 'Starfield', ram: 16 * 1024 * 1024 * 1024, storage: 120 * 1024 * 1024 * 1024 },
  { key: 'warhammer 40k darktide', name: 'Warhammer 40K: Darktide', ram: 8 * 1024 * 1024 * 1024, storage: 85 * 1024 * 1024 * 1024 },
  { key: 'palworld', name: 'Palworld', ram: 32 * 1024 * 1024 * 1024, storage: 130 * 1024 * 1024 * 1024 },
  { key: 'dragon age inquisition', name: 'Dragon Age: Inquisition', ram: 8 * 1024 * 1024 * 1024, storage: 100 * 1024 * 1024 * 1024 },
  { key: 'the witcher 3', name: 'The Witcher 3', ram: 8 * 1024 * 1024 * 1024, storage: 136 * 1024 * 1024 * 1024 },
  { key: 'resident evil 4', name: 'Resident Evil 4', ram: 8 * 1024 * 1024 * 1024, storage: 150 * 1024 * 1024 * 1024 },
  { key: 'doom eternal', name: 'DOOM Eternal', ram: 8 * 1024 * 1024 * 1024, storage: 100 * 1024 * 1024 * 1024 },
  { key: 'fallout 4', name: 'Fallout 4', ram: 8 * 1024 * 1024 * 1024, storage: 30 * 1024 * 1024 * 1024 },
  { key: 'skyrim', name: 'The Elder Scrolls V: Skyrim', ram: 8 * 1024 * 1024 * 1024, storage: 20 * 1024 * 1024 * 1024 },
  { key: 'apex legends', name: 'Apex Legends', ram: 8 * 1024 * 1024 * 1024, storage: 72 * 1024 * 1024 * 1024 },
  { key: 'valorant', name: 'Valorant', ram: 4 * 1024 * 1024 * 1024, storage: 20 * 1024 * 1024 * 1024 },
  { key: 'league of legends', name: 'League of Legends', ram: 4 * 1024 * 1024 * 1024, storage: 15 * 1024 * 1024 * 1024 },
  { key: 'counter strike 2', name: 'Counter-Strike 2', ram: 4 * 1024 * 1024 * 1024, storage: 35 * 1024 * 1024 * 1024 },
  { key: 'overwatch 2', name: 'Overwatch 2', ram: 6 * 1024 * 1024 * 1024, storage: 40 * 1024 * 1024 * 1024 },
  { key: 'dota 2', name: 'Dota 2', ram: 4 * 1024 * 1024 * 1024, storage: 30 * 1024 * 1024 * 1024 },
  { key: 'team fortress 2', name: 'Team Fortress 2', ram: 2 * 1024 * 1024 * 1024, storage: 22 * 1024 * 1024 * 1024 },
  { key: 'terraria', name: 'Terraria', ram: 2 * 1024 * 1024 * 1024, storage: 3 * 1024 * 1024 * 1024 },
  { key: 'stardew valley', name: 'Stardew Valley', ram: 2 * 1024 * 1024 * 1024, storage: 166 * 1024 * 1024 },
  { key: 'hollow knight', name: 'Hollow Knight', ram: 2 * 1024 * 1024 * 1024, storage: 3 * 1024 * 1024 * 1024 },
  { key: 'dark souls 3', name: 'Dark Souls III', ram: 4 * 1024 * 1024 * 1024, storage: 25 * 1024 * 1024 * 1024 },
  { key: 'sekiro shadows die twice', name: 'Sekiro: Shadows Die Twice', ram: 4 * 1024 * 1024 * 1024, storage: 26 * 1024 * 1024 * 1024 },
  { key: 'bloodborne', name: 'Bloodborne', ram: 6 * 1024 * 1024 * 1024, storage: 60 * 1024 * 1024 * 1024 },
  { key: 'red dead redemption 2', name: 'Red Dead Redemption 2', ram: 12 * 1024 * 1024 * 1024, storage: 150 * 1024 * 1024 * 1024 },
  { key: 'assassins creed origins', name: 'Assassin\'s Creed Origins', ram: 8 * 1024 * 1024 * 1024, storage: 75 * 1024 * 1024 * 1024 },
  { key: 'horizon zero dawn', name: 'Horizon Zero Dawn', ram: 12 * 1024 * 1024 * 1024, storage: 100 * 1024 * 1024 * 1024 },
  { key: 'god of war', name: 'God of War', ram: 8 * 1024 * 1024 * 1024, storage: 130 * 1024 * 1024 * 1024 },
  { key: 'the last of us', name: 'The Last of Us Part I', ram: 12 * 1024 * 1024 * 1024, storage: 140 * 1024 * 1024 * 1024 },
  { key: 'ghost of tsushima', name: 'Ghost of Tsushima', ram: 8 * 1024 * 1024 * 1024, storage: 66 * 1024 * 1024 * 1024 },
  { key: 'uncharted 4', name: 'Uncharted 4: A Thief\'s End', ram: 8 * 1024 * 1024 * 1024, storage: 86 * 1024 * 1024 * 1024 },
  { key: 'hades', name: 'Hades', ram: 4 * 1024 * 1024 * 1024, storage: 17 * 1024 * 1024 * 1024 },
  { key: 'celeste', name: 'Celeste', ram: 2 * 1024 * 1024 * 1024, storage: 500 * 1024 * 1024 },
  { key: 'genshin impact', name: 'Genshin Impact', ram: 4 * 1024 * 1024 * 1024, storage: 30 * 1024 * 1024 * 1024 },
  { key: 'final fantasy xiv', name: 'Final Fantasy XIV', ram: 6 * 1024 * 1024 * 1024, storage: 100 * 1024 * 1024 * 1024 },
  { key: 'monster hunter world', name: 'Monster Hunter: World', ram: 8 * 1024 * 1024 * 1024, storage: 148 * 1024 * 1024 * 1024 },
  { key: 'no mans sky', name: 'No Man\'s Sky', ram: 8 * 1024 * 1024 * 1024, storage: 65 * 1024 * 1024 * 1024 },
  { key: 'kerbal space program', name: 'Kerbal Space Program', ram: 4 * 1024 * 1024 * 1024, storage: 4 * 1024 * 1024 * 1024 },
  { key: 'rimworld', name: 'RimWorld', ram: 4 * 1024 * 1024 * 1024, storage: 2 * 1024 * 1024 * 1024 },
  { key: 'the sims 4', name: 'The Sims 4', ram: 4 * 1024 * 1024 * 1024, storage: 50 * 1024 * 1024 * 1024 },
  { key: 'civilization vi', name: 'Civilization VI', ram: 4 * 1024 * 1024 * 1024, storage: 15 * 1024 * 1024 * 1024 },
  { key: 'strategy space invaders', name: 'Starcraft II', ram: 4 * 1024 * 1024 * 1024, storage: 35 * 1024 * 1024 * 1024 },
  { key: 'total war warhammer', name: 'Total War: Warhammer III', ram: 12 * 1024 * 1024 * 1024, storage: 190 * 1024 * 1024 * 1024 },
  { key: 'pathfinder wrath of the righteous', name: 'Pathfinder: Wrath of the Righteous', ram: 8 * 1024 * 1024 * 1024, storage: 165 * 1024 * 1024 * 1024 },
  { key: 'divinity original sin 2', name: 'Divinity: Original Sin 2', ram: 8 * 1024 * 1024 * 1024, storage: 150 * 1024 * 1024 * 1024 }
];

function findGameRequirement(name) {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return KNOWN_GAME_REQUIREMENTS.find(game => game.key === normalized || (game.aliases || []).includes(normalized));
}

function parseRequirements(query) {
  const rawRam = query.ram || query.ramGB || query.requiredRam || query.requiredRamGB;
  const rawStorage = query.storage || query.storageGB || query.requiredStorage || query.requiredStorageGB;
  const ram = Number(rawRam);
  const storage = Number(rawStorage);
  return {
    requiredRam: Number.isFinite(ram) && ram > 0 ? ram * 1024 * 1024 * 1024 : null,
    requiredStorage: Number.isFinite(storage) && storage > 0 ? storage * 1024 * 1024 * 1024 : null
  };
}

function getAvailableStorage(fileSys) {
  return fileSys.reduce((sum, disk) => {
    const free = disk.available != null ? disk.available : (disk.size != null && disk.used != null ? disk.size - disk.used : 0);
    return sum + Math.max(0, free);
  }, 0);
}

async function getSystemStats() {
  const [osInfo, cpuInfo, cpuLoad, cpuTemp, mem, disk, fileSys, network, graphics] = await Promise.all([
    si.osInfo(),
    si.cpu(),
    si.currentLoad(),
    si.cpuTemperature(),
    si.mem(),
    si.diskLayout(),
    si.fsSize(),
    si.networkStats(),
    si.graphics()
  ]);

  return {
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      hostname: osInfo.hostname,
      arch: osInfo.arch,
      uptime: osInfo.uptime
    },
    cpu: {
      manufacturer: cpuInfo.manufacturer,
      brand: cpuInfo.brand,
      speed: cpuInfo.speed,
      cores: cpuInfo.cores,
      physicalCores: cpuInfo.physicalCores,
      load: ((cpuLoad.currentload ?? cpuLoad.currentLoad ?? 0)).toFixed(1),
      temperature: cpuTemp.main || 0
    },
    memory: {
      total: mem.total,
      free: mem.free,
      used: mem.used,
      available: mem.available
    },
    disks: fileSys.map(d => ({
      fs: d.fs,
      type: d.type,
      mount: d.mount,
      size: d.size,
      used: d.used,
      use: d.use
    })),
    diskLayout: disk.map(d => ({
      device: d.device,
      type: d.type,
      name: d.name,
      size: d.size
    })),
    network: network.map(n => ({
      iface: n.iface,
      operstate: n.operstate,
      rx_bytes: n.rx_bytes,
      tx_bytes: n.tx_bytes,
      rx_sec: n.rx_sec,
      tx_sec: n.tx_sec,
      ms: n.ms
    })),
    graphics: {
      controllers: graphics.controllers.map(g => ({
        model: g.model,
        vendor: g.vendor,
        vram: g.vram,
        memoryUsed: g.memoryUsed,
        utilizationGpu: g.utilizationGpu,
        utilizationMemory: g.utilizationMemory
      })),
      displays: graphics.displays.map(d => ({
        model: d.model,
        main: d.main,
        resolutionx: d.resolutionx,
        resolutiony: d.resolutiony,
        pixelDepth: d.pixelDepth
      }))
    }
  };
}

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to read system stats:', error);
    res.status(500).json({ error: 'Unable to read system stats' });
  }
});

// Pairing API - create a short token and return a pairing URL
app.post('/api/pair', express.json(), (req, res) => {
  try {
    const token = crypto.randomBytes(3).toString('hex'); // 6 hex chars
    pairingTokens.set(token, { createdAt: Date.now() });
    const url = `${req.protocol}://${req.get('host')}/pair/${token}`;
    res.json({ token, url });
  } catch (err) {
    res.status(500).json({ error: 'Unable to create pairing token' });
  }
});

// Serve pairing page for devices
app.get('/pair/:token', (req, res) => {
  const token = req.params.token;
  if (!pairingTokens.has(token)) {
    return res.status(404).send('Pairing token not found or expired.');
  }
  res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

// Health score API
app.get('/api/health', async (req, res) => {
  try {
    const [mem, fileSys, cpuLoad, cpuTemp] = await Promise.all([
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.cpuTemperature()
    ]);
    const availableRam = mem.available || mem.free || 0;
    const totalRam = mem.total || 1;
    const ramPercent = 100 - (availableRam / totalRam) * 100;
    
    let totalFree = 0, totalSize = 0;
    fileSys.forEach(d => {
      totalSize += d.size || 0;
      totalFree += (d.available != null ? d.available : ((d.size || 0) - (d.used || 0)));
    });
    const storagePercent = totalSize > 0 ? 100 - (totalFree / totalSize) * 100 : 0;
    const temp = cpuTemp.main || 0;
    const cpuL = Number(cpuLoad.currentload ?? cpuLoad.currentLoad ?? 0) || 0;
    
    const ramScore = Math.max(0, 100 - ramPercent);
    const storageScore = Math.max(0, 100 - storagePercent);
    const tempScore = Math.max(0, 100 - (temp / 100) * 100);
    const cpuScore = Math.max(0, 100 - cpuL);
    const health = Math.round((ramScore + storageScore + tempScore + cpuScore) / 4);
    
    res.json({
      health,
      ramPercent: ramPercent.toFixed(1),
      storagePercent: storagePercent.toFixed(1),
      temperature: temp,
      cpuLoad: cpuL.toFixed(1),
      status: health >= 75 ? 'Excellent' : health >= 50 ? 'Good' : health >= 25 ? 'Fair' : 'Poor'
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to compute health score' });
  }
});

// Recommendations API
app.get('/api/recommendations', async (req, res) => {
  try {
    const [mem, fileSys] = await Promise.all([si.mem(), si.fsSize()]);
    const availableRam = mem.available || mem.free || 0;
    const availableStorage = getAvailableStorage(fileSys);
    
    const canInstall = KNOWN_GAME_REQUIREMENTS.filter(game => 
      availableRam >= game.ram && availableStorage >= game.storage
    ).sort((a, b) => b.storage - a.storage).slice(0, 10);
    
    res.json({ recommendations: canInstall.map(g => ({ name: g.name, ram: g.ram, storage: g.storage })) });
  } catch (error) {
    res.status(500).json({ error: 'Unable to generate recommendations' });
  }
});

// Export stats API
app.get('/api/export', async (req, res) => {
  try {
    const stats = await getSystemStats();
    const format = req.query.format || 'json';
    
    if (format === 'csv') {
      const csv = `PC Monitor Export - ${new Date().toISOString()}\nCPU Manufacturer,${stats.cpu.manufacturer}\nCPU Brand,${stats.cpu.brand}\nCPU Speed,${stats.cpu.speed} GHz\nCPU Cores,${stats.cpu.cores}\nCPU Load,${stats.cpu.load}%\nCPU Temp,${stats.cpu.temperature}°C\nMemory Total,${(stats.memory.total / (1024**3)).toFixed(2)} GB\nMemory Used,${(stats.memory.used / (1024**3)).toFixed(2)} GB\nMemory Available,${(stats.memory.available / (1024**3)).toFixed(2)} GB\nOS,${stats.os.distro} ${stats.os.release}\nHostname,${stats.os.hostname}\nArch,${stats.os.arch}`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=pc-stats.csv');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=pc-stats.json');
      res.json(stats);
    }
  } catch (error) {
    res.status(500).json({ error: 'Unable to export stats' });
  }
});

app.get('/api/check-game', async (req, res) => {
  try {
    const gameName = String(req.query.name || '').trim();
    if (!gameName) {
      return res.status(400).json({ error: 'Game name is required.' });
    }

    const game = findGameRequirement(gameName);
    const { requiredRam, requiredStorage } = parseRequirements(req.query);
    const useRam = requiredRam != null ? requiredRam : game?.ram ?? null;
    const useStorage = requiredStorage != null ? requiredStorage : game?.storage ?? null;

    if (useRam == null || useStorage == null) {
      return res.status(400).json({
        error: 'Game not found or missing requirements. Enter a game name and provide required RAM and storage in GB if the game is not recognized.',
        availableGames: KNOWN_GAME_REQUIREMENTS.map(g => g.name)
      });
    }

    const [mem, fileSys] = await Promise.all([si.mem(), si.fsSize()]);
    const availableRam = mem.available || mem.free || 0;
    const availableStorage = getAvailableStorage(fileSys);
    const canInstall = availableRam >= useRam && availableStorage >= useStorage;

    res.json({
      game: game?.name ?? gameName,
      requiredRam: useRam,
      requiredStorage: useStorage,
      availableRam,
      availableStorage,
      canInstall,
      message: canInstall ? 'Yes, your PC can install this game now.' : 'No, your PC does not have enough current RAM and/or storage.'
    });
  } catch (error) {
    console.error('Failed to check game requirements:', error);
    res.status(500).json({ error: 'Unable to check game requirements.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection handling
io.on('connection', socket => {
  socket.on('watch-token', token => {
    if (!token) return;
    socket.join(token);
  });

  socket.on('complete-pair', data => {
    const { token, device } = data || {};
    if (!token || !pairingTokens.has(token)) return;
    pairedDevices.set(token, { device, pairedAt: Date.now() });
    // notify watchers of this token
    io.to(token).emit('paired', { token, device });
  });
});

server.listen(port, () => {
  console.log(`PC Monitor dashboard running at http://localhost:${port}`);
});
