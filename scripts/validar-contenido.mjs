#!/usr/bin/env node
// Valida content/contenido.json. Uso: node scripts/validar-contenido.mjs
// Sale con código 1 si hay errores. Los avisos no bloquean.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const d = JSON.parse(readFileSync(join(root, 'content', 'contenido.json'), 'utf8'));
const errors = [], warns = [];
const err = (w, m) => errors.push(`✗ ${w}: ${m}`);
const warn = (w, m) => warns.push(`! ${w}: ${m}`);
const REV = ['borrador', 'pendiente', 'aprobado', 'rechazado'];
const LIT = ['green', 'white', 'red', 'purple'];
const EMO_IDS = ['happy','tired','healing','depression','sad','confused','anger','joy','lonely','love','forgiveness','gratitude'];
const str = v => typeof v === 'string' && v.trim().length > 0;
const pair = v => Array.isArray(v) && v.length === 2 && v.every(str);

// Emociones
const emos = d.emociones || [];
for (const id of EMO_IDS) if (!emos.find(e => e.id === id)) err('emociones', `falta la emoción "${id}"`);
for (const e of emos) {
  const w = `emoción ${e.id}`;
  if (!str(e.es) || !str(e.en)) err(w, 'falta nombre es/en');
  if (!Array.isArray(e.items) || !e.items.length) { err(w, 'sin items'); continue; }
  if (e.items.length < 7) warn(w, `${e.items.length}/7 entradas (meta: 7)`);
  if (['depression','sad','lonely'].includes(e.id) && !e.care) err(w, 'debe tener care: 1');
  const refs = new Set();
  e.items.forEach((it, i) => {
    const wi = `${w} #${i + 1}`;
    if (!pair(it.ref)) err(wi, 'ref debe ser [es, en]');
    if (!pair(it.v)) err(wi, 'v (versículo) debe ser [es, en]');
    if (!pair(it.p)) err(wi, 'p (oración) debe ser [es, en]');
    if (!it.c || !str(it.c.ini) || !pair(it.c.es) || !pair(it.c.en)) err(wi, 'santo compañero incompleto');
    if (it.c?.lrn && !(d.lecturas || []).find(l => l.id === it.c.lrn)) err(wi, `lrn "${it.c.lrn}" no existe`);
    if (it.c?.nov && !(d.novenas || []).find(n => n.id === it.c.nov)) err(wi, `nov "${it.c.nov}" no existe`);
    if (!REV.includes(it.revision)) err(wi, 'revision inválida');
    if (it.ref && refs.has(it.ref[0])) warn(wi, `versículo repetido en la misma emoción (${it.ref[0]})`);
    if (it.ref) refs.add(it.ref[0]);
  });
}

// Rasgos
const rasgos = d.rasgos || {};
for (const [k, r] of Object.entries(rasgos)) if (!pair(r.es) || !pair(r.en)) err(`rasgo ${k}`, 'debe tener es y en [nombre, descripción]');

// Lecturas
const ids = new Set();
for (const l of d.lecturas || []) {
  const w = `lectura ${l.id}`;
  if (ids.has(l.id)) err(w, 'id duplicado'); ids.add(l.id);
  if (!str(l.ini)) err(w, 'falta ini');
  if (!LIT.includes(l.lit)) err(w, `lit debe ser ${LIT.join('|')}`);
  if (!Array.isArray(l.traits) || l.traits.length !== 3) err(w, 'debe tener 3 rasgos');
  (l.traits || []).forEach(t => { if (!rasgos[t]) err(w, `rasgo "${t}" no está definido en rasgos`); });
  if (!Array.isArray(l.fuentes) || !l.fuentes.length) err(w, 'falta fuentes');
  if (!REV.includes(l.revision)) err(w, 'revision inválida');
  for (const lang of ['es', 'en']) {
    const x = l[lang], wl = `${w} (${lang})`;
    if (!x) { err(wl, 'falta idioma'); continue; }
    if (!str(x.name) || !str(x.sub) || !str(x.ring)) err(wl, 'falta name/sub/ring');
    if (x.ring && x.ring.length > 28) warn(wl, `ring muy largo para la medalla (${x.ring.length} > 28)`);
    if (!Array.isArray(x.secs) || x.secs.length !== 5) err(wl, 'debe tener 5 secciones');
    const found = new Set();
    (x.secs || []).forEach((s, i) => {
      if (!str(s.h) || !Array.isArray(s.ps) || !s.ps.every(str)) err(wl, `sección ${i + 1} incompleta`);
      if (s.q && !pair(s.q)) err(wl, `sección ${i + 1}: q debe ser [cita, referencia]`);
      if (s.trait) { if (!(l.traits || []).includes(s.trait)) err(wl, `sección ${i + 1}: trait "${s.trait}" no es de esta lectura`); found.add(s.trait); }
    });
    (l.traits || []).forEach(t => { if (!found.has(t)) err(wl, `el rasgo "${t}" no aparece en ninguna sección`); });
    if (!Array.isArray(x.quiz) || x.quiz.length !== 5) err(wl, 'el quiz debe tener 5 preguntas');
    (x.quiz || []).forEach((q, i) => {
      const wq = `${wl} pregunta ${i + 1}`;
      if (!str(q.q) || !str(q.e)) err(wq, 'falta pregunta o explicación');
      if (!Array.isArray(q.o) || q.o.length !== 4 || !q.o.every(str)) err(wq, 'debe tener 4 alternativas');
      else if (new Set(q.o).size !== 4) err(wq, 'alternativas repetidas');
      if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) err(wq, 'a debe ser 0..3');
    });
    if (l.pass > (x.quiz || []).length) err(wl, 'pass mayor que el número de preguntas');
  }
  if (l.es && l.en) {
    if (l.es.secs?.length !== l.en.secs?.length) err(w, 'es y en tienen distinto número de secciones');
    (l.es.quiz || []).forEach((q, i) => { if (l.en.quiz?.[i] && l.en.quiz[i].a !== q.a) err(w, `pregunta ${i + 1}: la respuesta correcta difiere entre es y en`); });
    (l.es.secs || []).forEach((s, i) => { if (l.en.secs?.[i] && (s.trait || null) !== (l.en.secs[i].trait || null)) err(w, `sección ${i + 1}: trait difiere entre es y en`); });
  }
}
const soon = d.proximamente || [];
for (const s of soon) { if (ids.has(s.id)) err(`próximamente ${s.id}`, 'ya existe como lectura'); }

// Colecciones
for (const c of d.colecciones || []) {
  if (!str(c.es) || !str(c.en)) err(`colección ${c.id}`, 'falta nombre es/en');
  for (const it of c.items || []) if (!ids.has(it) && !soon.find(s => s.id === it)) err(`colección ${c.id}`, `item "${it}" no existe`);
}

// Novenas
for (const n of d.novenas || []) {
  const w = `novena ${n.id}`;
  if (!str(n.es) || !str(n.en)) err(w, 'falta nombre es/en');
  if (!n.fixed && !(n.m >= 1 && n.m <= 12 && n.d >= 1 && n.d <= 31)) err(w, 'falta fecha (m, d) o fixed');
  if (n.fixed) warn(w, 'fiesta móvil con fecha fija: falta cálculo automático');
}

// Ayuda (líneas de crisis)
const ay = d.ayuda;
if (!ay || !ay.respaldo || !str(ay.respaldo.url)) err('ayuda', 'falta el respaldo (Find A Helpline)');
const hoy = new Date();
for (const c of ay?.paises || []) {
  const w = `ayuda ${c.pais}`;
  if (!/^[A-Z]{2}$/.test(c.pais || '')) err(w, 'pais debe ser código ISO de 2 letras');
  if (!c.nombre || !str(c.nombre.es) || !str(c.nombre.en)) err(w, 'falta nombre es/en');
  if (!Array.isArray(c.lineas) || !c.lineas.length) err(w, 'sin líneas');
  (c.lineas || []).forEach((l, i) => {
    if (!l.nombre || !str(l.nombre.es) || !str(l.nombre.en)) err(w, `línea ${i + 1}: falta nombre es/en`);
    if (!str(l.numero) || !/^[*#+0-9]+$/.test(l.marcar || '')) err(w, `línea ${i + 1}: numero/marcar inválido`);
    if (!/^https?:\/\//.test(l.fuente || '')) err(w, `línea ${i + 1}: falta fuente`);
  });
  if (!REV.includes(c.revision)) err(w, 'revision inválida');
  const v = new Date(c.verificado);
  if (isNaN(v)) err(w, 'falta fecha verificado');
  else if ((hoy - v) / 864e5 > 180) warn(w, `verificación vencida (${c.verificado}): volver a verificar`);
}

// Resumen
const count = (arr, f) => arr.filter(f).length;
const allItems = emos.flatMap(e => e.items || []), lect = d.lecturas || [];
console.log('Obra Buena · validación de contenido\n');
console.log(`Emociones: ${allItems.length} entradas (${count(allItems, i => i.revision === 'aprobado')} aprobadas)`);
console.log(`Lecturas:  ${lect.length} (${count(lect, l => l.revision === 'aprobado')} aprobadas), ${lect.reduce((a, l) => a + (l.es?.quiz?.length || 0), 0)} preguntas`);
console.log(`Novenas:   ${(d.novenas || []).length} · Próximamente: ${soon.length}`);
console.log(`Ayuda:     ${(ay?.paises || []).length} países con líneas (${count(ay?.paises || [], c => c.revision === 'aprobado')} aprobados)\n`);
warns.forEach(m => console.log(m));
errors.forEach(m => console.log(m));
console.log(`\n${errors.length} errores, ${warns.length} avisos`);
process.exit(errors.length ? 1 : 0);
