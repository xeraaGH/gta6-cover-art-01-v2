// Vice Cover Studio v2 — the entry program (Node 22, standard library only).
//
// Hands the app in: it copies this repository's app/ and screenshots/ beside
// this file into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, the summary the
// judge reads. Run it twice and both runs must write the same bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
  const shots = join(repoRoot, 'screenshots');
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(shots)) cpSync(shots, join(outDir, 'screenshots'), { recursive: true });
  writeFileSync(
    join(outDir, 'dossier.json'),
    buildDossier(outDir, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      app_max_files: 993,
      app_max_bytes: 50331648,
      app_path_max_bytes: 1000,
    }),
  );
}

handIn();
