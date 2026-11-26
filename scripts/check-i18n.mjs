#!/usr/bin/env node
/**
 * Pengecek terjemahan ID -> EN.
 *
 * Membaca semua pemanggilan t("...") di app/, components/, lib/ memakai parser TypeScript,
 * lalu mencocokkannya dengan kamus EN di lib/dictionary.ts.
 *
 *   ❌ error      : t("teks") tanpa terjemahan (dan tidak ada di SAME_IN_EN) -> exit code 1
 *   ⚠️ peringatan : entri kamus tidak dipakai, terjemahan kosong, terjemahan = teks asli
 *   ℹ️ info       : t(variabel) yang isinya tidak bisa dicek otomatis
 *
 * Jalankan: npm run check:i18n   (otomatis juga sebelum npm run build)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIRS = ["app", "components", "lib"];
const DICT_FILE = path.join(ROOT, "lib", "dictionary.ts");

/**
 * Teks yang memang sama dalam Bahasa Inggris (nama produk, standar, instansi, alamat, contoh isian).
 * Tambahkan di sini bila teks baru tidak perlu diterjemahkan.
 */
const SAME_IN_EN = new Set([
  // Merek & produk
  "Intramedika", "INTRAMEDIKA", "IntraHospital", "INTRAHOSPITAL", "IntraClinic", "INTRACLINIC",
  "IntraDoc", "INTRADOC", "IntraPuskesmas", "INTRAPUSKESMAS", "Posyandu AI", "POSYANDU AI",
  "Clinical Cohort Builder", "Clinical Cohort", "Builder", "Intravision (AI Imaging)", '"Innovating Health."',
  // Fasilitas & instansi
  "Puskesmas", "Posyandu", "BPJS Kesehatan", "Cybersher BPJS Kesehatan", "SATUSEHAT", "Mobile JKN",
  "PSE Kominfo", "TTE", "Permenkes 24/2022", "Oracle Cloud",
  // Standar & sistem
  "HL7 FHIR R4", "HIMS & EMR", "SNOMED CT", "SNOMED-CT", "ICD-10", "LOINC", "OMOP CDM", "XDS-I", "PACS", "LIS", "DICOM",
  // Kata yang identik
  "Email", "Digital", "Real-time", "AI / Data", "& Cloud",
  // Alamat & contoh isian form
  "Jakarta · Bogor, Indonesia", "Jl. RA Kartini Kav. 8, Jakarta 12430", "Boston View Building, Boston Square",
  "RK 1/6, Kota Wisata, Bogor 16968", "Dr. Budi Santoso",
]);

/** Pola yang otomatis dianggap sama di EN: email, domain/URL, angka (270M+, 2.2M+). */
const SAME_PATTERNS = [
  /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/,
  /^(https?:\/\/|www\.)\S+$/,
  /^[\d.,]+\s*[KMB]?\+?$/,
];

function isSameInEn(text) {
  const trimmed = text.trim().replace(/\s*[–—-]$/, ""); // "IntraDoc –" -> "IntraDoc"
  return SAME_IN_EN.has(text) || SAME_IN_EN.has(trimmed) || SAME_PATTERNS.some((re) => re.test(trimmed));
}

// ---------------------------------------------------------------------------

function parse(file) {
  const src = fs.readFileSync(file, "utf8");
  return ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function loc(sf, node) {
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `${path.relative(ROOT, sf.fileName).split(path.sep).join("/")}:${line + 1}`;
}

const literalText = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : undefined);

function walkDir(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

// 1. Baca kamus
const dict = new Map(); // key -> { value, loc }
const dictSf = parse(DICT_FILE);
const errors = [];
const warnings = [];
const infos = [];

ts.forEachChild(dictSf, function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(dictSf) === "EN" && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
    for (const prop of node.initializer.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = ts.isIdentifier(prop.name) ? prop.name.text : literalText(prop.name);
      const value = literalText(prop.initializer);
      if (key === undefined) continue;
      if (dict.has(key)) errors.push(`${loc(dictSf, prop)}  kunci dobel: ${JSON.stringify(key)}`);
      dict.set(key, { value, loc: loc(dictSf, prop) });
    }
    return;
  }
  ts.forEachChild(node, visit);
});

if (dict.size === 0) {
  console.error("❌ Kamus EN di lib/dictionary.ts tidak ditemukan.");
  process.exit(1);
}

// 2. Baca semua pemanggilan t(...) dan semua string literal di kode
const usedKeys = new Set();
const allStrings = new Set(); // untuk teks yang dikirim lewat variabel, mis. t(m.label)
let callCount = 0;

const files = SOURCE_DIRS.flatMap((d) => walkDir(path.join(ROOT, d))).filter((f) => path.resolve(f) !== DICT_FILE);

for (const file of files) {
  const sf = parse(file);
  ts.forEachChild(sf, function visit(node) {
    const lit = literalText(node);
    if (lit !== undefined) allStrings.add(lit);

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t" && node.arguments.length > 0) {
      callCount++;
      const text = literalText(node.arguments[0]);
      const scopeArg = node.arguments[1];
      const scope = scopeArg ? literalText(scopeArg) : undefined;

      if (text === undefined || (scopeArg && scope === undefined)) {
        infos.push(`${loc(sf, node)}  ${node.getText(sf).replace(/\s+/g, " ")}`);
      } else {
        const scopedKey = scope ? `${scope}|${text}` : undefined;
        if (scopedKey && dict.has(scopedKey)) usedKeys.add(scopedKey);
        else if (dict.has(text)) usedKeys.add(text);
        else if (!isSameInEn(text)) errors.push(`${loc(sf, node)}  belum ada terjemahan: ${JSON.stringify(text)}${scope ? `  (section "${scope}")` : ""}`);
      }
    }
    ts.forEachChild(node, visit);
  });
}

// 3. Periksa isi kamus
for (const [key, { value, loc: where }] of dict) {
  if (value === undefined) {
    warnings.push(`${where}  terjemahan bukan teks biasa: ${JSON.stringify(key)}`);
    continue;
  }
  if (value.trim() === "") warnings.push(`${where}  terjemahan kosong: ${JSON.stringify(key)}`);
  else if (value === key) warnings.push(`${where}  terjemahan sama dengan teks asli (pindahkan ke SAME_IN_EN?): ${JSON.stringify(key)}`);

  const isScoped = key.includes("|");
  const used = usedKeys.has(key) || (!isScoped && allStrings.has(key));
  if (!used) warnings.push(`${where}  tidak dipakai di kode: ${JSON.stringify(key)}`);
}

// 4. Laporan
const section = (icon, title, list) => {
  if (!list.length) return;
  console.log(`\n${icon} ${title} (${list.length})`);
  for (const line of list) console.log(`   ${line}`);
};

console.log(`Cek terjemahan: ${files.length} file, ${callCount} pemanggilan t(), ${dict.size} entri kamus.`);
section("ℹ️ ", "t(variabel) — isi dicek lewat string di kode, tidak dari pemanggilan langsung", process.argv.includes("--verbose") ? infos : []);
section("⚠️ ", "Peringatan", warnings);
section("❌", "Error", errors);

if (errors.length) {
  console.log(`\nGagal: ${errors.length} masalah terjemahan. Perbaiki lib/dictionary.ts, atau tambahkan ke SAME_IN_EN di scripts/check-i18n.mjs bila teks memang sama di EN.`);
  process.exit(1);
}
console.log(`\n✅ Semua teks punya terjemahan.${warnings.length ? ` (${warnings.length} peringatan)` : ""}${infos.length && !process.argv.includes("--verbose") ? ` ${infos.length} t(variabel) — lihat dengan --verbose.` : ""}`);
