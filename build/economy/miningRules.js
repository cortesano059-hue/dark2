const MINING_CONFIG = {
  cooldown: 10 * 1e3,
  minerals: {
    cuarzo: { price: 40, chance: 0.6, quantity: [1, 5] },
    mercurio: { price: 125, chance: 0.4, quantity: [1, 4] },
    apatito: { price: 500, chance: 0.25, quantity: [1, 3] },
    malaquita: { price: 1e3, chance: 0.15, quantity: [1, 2] },
    oro: { price: 1250, chance: 0.12, quantity: [1, 2] },
    rubi: { price: 5e3, chance: 0.05, quantity: [1, 1] },
    esmeralda: { price: 1e4, chance: 0.025, quantity: [1, 1] },
    obsidiana: { price: 15e3, chance: 0.015, quantity: [1, 1] },
    diamante: { price: 2e4, chance: 0.01, quantity: [1, 1] }
  },
  rarities: {
    roto: { chance: 0.45, multiplier: 0.5 },
    bruto: { chance: 0.4, multiplier: 1 },
    puro: { chance: 0.15, multiplier: 2 }
  }
};
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function chance(p) {
  return Math.random() < p;
}
function pickRarity(rarities) {
  let roll = Math.random();
  let acc = 0;
  for (const [key, data] of Object.entries(rarities)) {
    acc += data.chance;
    if (roll <= acc) return key;
  }
  return "bruto";
}
function formatTime(ms) {
  const s = Math.ceil(ms / 1e3);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}
export {
  MINING_CONFIG,
  chance,
  formatTime,
  pickRarity,
  random
};
