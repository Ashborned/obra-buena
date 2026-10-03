/**
 * Corre las pruebas de lógica de fechas en varias zonas horarias
 * (incluidas zonas con cambio de horario de verano).
 * Uso: npm run test:tz  (equivale a TZ=<zona> npx jest src/lib en cada zona)
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ZONAS = ['UTC', 'America/Santiago', 'Europe/Madrid', 'America/New_York', 'Pacific/Auckland', 'Asia/Tokyo'];
const jestBin = require.resolve('jest/bin/jest');
const raiz = path.join(__dirname, '..');

let fallas = 0;
for (const zona of ZONAS) {
  console.log(`\n=== TZ=${zona} ===`);
  const r = spawnSync(process.execPath, [jestBin, 'src/lib', ...process.argv.slice(2)], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, TZ: zona },
  });
  if (r.status !== 0) {
    fallas++;
    console.log(`*** falla en TZ=${zona}`);
  }
}
console.log(fallas ? `\n${fallas} zona(s) con fallas` : '\nTodas las zonas pasan');
process.exit(fallas ? 1 : 0);
