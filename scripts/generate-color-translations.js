// node scripts/generate-color-translations.js
// Requires Node 18+ (built-in fetch)

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LANG_TO_LIST = {
  pl: 'mlmc_polish',
  de: 'mlmc_german',
  fr: 'mlmc_french',
  es: 'mlmc_spanish',
  zh: 'mlmc_chinese',
  ru: 'mlmc_russian',
  ko: 'mlmc_korean',
  nl: 'mlmc_dutch',
  pt: 'mlmc_portuguese',
  ro: 'mlmc_romanian',
  sv: 'mlmc_swedish',
  fi: 'mlmc_finnish',
  fa: 'mlmc_persian',
  en: 'mlmc_english'
};

const BATCH_SIZE = 150;
const DELAY_MS = 300;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchBatch(hexes, list) {
  const values = hexes.map(h => h.replace('#', '')).join(',');
  const url = `https://api.color.pizza/v1/?values=${values}&list=${list}&noduplicates=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status} for list ${list}`);
  const data = await res.json();
  return data.colors;
}

async function main() {
  const colorMapPath = join(__dirname, '..', 'node_modules', '@mtillmann', 'colors', 'dist', 'data', 'colorMap.json');
  const colorMap = JSON.parse(readFileSync(colorMapPath, 'utf8'));
  const hexes = Object.keys(colorMap);
  console.log(`Kolorów do przetworzenia: ${hexes.length}`);

  const result = {};
  for (const hex of hexes) result[hex] = {};

  const langs = Object.entries(LANG_TO_LIST);
  for (const [langCode, list] of langs) {
    console.log(`\nPobieram język: ${langCode} (${list})`);
    let processed = 0;
    for (let i = 0; i < hexes.length; i += BATCH_SIZE) {
      const batch = hexes.slice(i, i + BATCH_SIZE);
      try {
        const colors = await fetchBatch(batch, list);
        colors.forEach((c, idx) => {
          const hex = batch[idx];
          if (hex && c) result[hex][langCode] = c.name;
        });
        processed += batch.length;
        process.stdout.write(`\r  ${Math.min(processed, hexes.length)}/${hexes.length}`);
        await sleep(DELAY_MS);
      } catch (e) {
        console.error(`\nBłąd dla batcha ${i}-${i + BATCH_SIZE}: ${e.message}`);
        await sleep(1000);
      }
    }
  }

  const outputPath = join(__dirname, '..', 'assets', 'colorTranslations.json');
  writeFileSync(outputPath, JSON.stringify(result));
  console.log(`\n\nZapisano do assets/colorTranslations.json`);
  const size = Math.round(JSON.stringify(result).length / 1024);
  console.log(`Rozmiar: ~${size} KB`);
  console.log(`Kolorów: ${Object.keys(result).length}, Języków: ${langs.length}`);
}

main().catch(console.error);
