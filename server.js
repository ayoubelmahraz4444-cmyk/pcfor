const express = require('express');
const path = require('path');
const si = require('systeminformation');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const KNOWN_GAME_REQUIREMENTS = [
  { key: 'cyberpunk 2077', name: 'Cyberpunk 2077', ram: 12 * 1024 * 1024 * 1024, storage: 70 * 1024 * 1024 * 1024, aliases: ['cyberpunk'] },
  { key: 'fortnite', name: 'Fortnite', ram: 8 * 1024 * 1024 * 1024, storage: 30 * 1024 * 1024 * 1024 },
  { key: 'minecraft', name: 'Minecraft', ram: 2 * 1024 * 1024 * 1024, storage: 4 * 1024 * 1024 * 1024 },
  { key: 'valorant', name: 'Valorant', ram: 4 * 1024 * 1024 * 1024, storage: 15 * 1024 * 1024 * 1024 },
  { key: 'gta v', name: 'GTA V', ram: 8 * 1024 * 1024 * 1024, storage: 72 * 1024 * 1024 * 1024, aliases: ['gtav', 'gta'] },
  { key: 'elden ring', name: 'Elden Ring', ram: 12 * 1024 * 1024 * 1024, storage: 60 * 1024 * 1024 * 1024 },
  { key: 'call of duty modern warfare', name: 'Call of Duty Modern Warfare', ram: 12 * 1024 * 1024 * 1024, storage: 90 * 1024 * 1024 * 1024, aliases: ['cod modern warfare'] }
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

app.listen(port, () => {
  console.log(`PC Monitor dashboard running at http://localhost:${port}`);
});
