#!/usr/bin/env node
'use strict';

/**
 * Validates the dashboard's data before it can reach the live page.
 *
 * Run it locally exactly as CI does:
 *   node scripts/validate.js
 *
 * Four things get checked:
 *   1. Every data/<slug>.json matches schema.json.
 *   2. The manifest is sound, and it agrees with what's on disk.
 *   3. A card claiming "done" has every milestone done.
 *   4. Milestones read done -> in progress -> next.
 *
 * Checks 3 and 4 live here rather than in schema.json because JSON Schema
 * can't express either one: both depend on how the items in an array relate
 * to each other, not on any single value.
 *
 * Exits non-zero on the first failing category, so CI blocks the merge.
 */

// ajv's default export is draft-07; schema.json is draft 2020-12.
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const MANIFEST = path.join(ROOT, 'manifest.json');
const SCHEMA = path.join(ROOT, 'schema.json');

const failures = [];
const fail = (msg) => failures.push(msg);

/** Read a JSON file, turning a parse error into a failure rather than a crash. */
function readJson(file, label) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    fail(`${label}: cannot read ${path.relative(ROOT, file)} — ${err.message}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`${label}: ${path.relative(ROOT, file)} is not valid JSON — ${err.message}`);
    return null;
  }
}

const MILESTONE_ORDER = { done: 0, 'in progress': 1, next: 2 };

/** Milestones must never go backwards: done -> in progress -> next. */
function checkMilestoneOrder(card, label) {
  let highest = 0;
  let highestState = null;
  card.milestones.forEach((m, i) => {
    const rank = MILESTONE_ORDER[m.state];
    if (rank < highest) {
      fail(
        `${label}: milestone ${i + 1} ("${m.title}") is "${m.state}" but follows a "${highestState}" one. ` +
        `Order must read done -> in progress -> next.`
      );
    } else if (rank > highest) {
      highest = rank;
      highestState = m.state;
    }
  });
}

/** A card can only claim "done" if its own milestone list agrees. */
function checkDoneConsistency(card, label) {
  if (card.status !== 'done') return; // the reverse is allowed on purpose — see docs/SCHEMA.md
  const unfinished = card.milestones.filter((m) => m.state !== 'done');
  if (unfinished.length > 0) {
    fail(
      `${label}: status is "done" but ${unfinished.length} of ${card.milestones.length} milestones are not — ` +
      unfinished.map((m) => `"${m.title}" (${m.state})`).join(', ')
    );
  }
}

function main() {
  const schema = readJson(SCHEMA, 'schema');
  const manifest = readJson(MANIFEST, 'manifest');
  if (!schema || !manifest) return report(); // nothing further is meaningful

  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateCard = ajv.compile(schema);

  // --- The manifest itself ------------------------------------------------
  // It is the single point of failure for the whole page (one bad manifest,
  // no dashboard), so it gets checked before anything trusts it.
  if (!Array.isArray(manifest.projects)) {
    fail('manifest: "projects" must be an array of slugs.');
    return report();
  }
  if (manifest.schema_version !== '1') {
    fail(`manifest: schema_version must be "1", found ${JSON.stringify(manifest.schema_version)}.`);
  }
  const dupes = manifest.projects.filter((s, i) => manifest.projects.indexOf(s) !== i);
  if (dupes.length > 0) {
    fail(`manifest: duplicate slugs — ${[...new Set(dupes)].join(', ')}.`);
  }

  // --- Manifest vs. disk, in both directions ------------------------------
  // A leading underscore marks a data file that is NOT a project card —
  // configuration the page reads for itself (data/_featured.json powers the
  // optional "live pilots" band). It carries no slug, belongs in no manifest,
  // and is not held to the card schema, so it is skipped on both counts here.
  //
  // One deployment catch: GitHub Pages runs Jekyll, which drops any path that
  // begins with "_" — so an underscore file 404s in production unless the repo
  // root carries a .nojekyll marker. It does; if it is ever removed, the band
  // silently stops loading while every other card keeps working.
  const onDisk = fs.existsSync(DATA_DIR)
    ? fs.readdirSync(DATA_DIR)
        .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
        .map((f) => f.replace(/\.json$/, ''))
    : [];

  for (const slug of manifest.projects) {
    if (!onDisk.includes(slug)) {
      fail(`manifest: lists "${slug}" but data/${slug}.json does not exist — that card would render an error.`);
    }
  }
  for (const slug of onDisk) {
    if (!manifest.projects.includes(slug)) {
      fail(`data/${slug}.json exists but the manifest does not list it — the page would never load it.`);
    }
  }

  // --- Each card ----------------------------------------------------------
  for (const slug of onDisk) {
    const label = `data/${slug}.json`;
    const card = readJson(path.join(DATA_DIR, `${slug}.json`), label);
    if (!card) continue;

    if (!validateCard(card)) {
      for (const e of validateCard.errors) {
        fail(`${label}: ${e.instancePath || '/'} ${e.message}`);
      }
      continue; // the checks below assume a well-formed card
    }

    if (card.slug !== slug) {
      fail(`${label}: slug field is "${card.slug}" but the filename says "${slug}".`);
    }
    checkDoneConsistency(card, label);
    checkMilestoneOrder(card, label);
  }

  report(onDisk.length);
}

function report(count) {
  if (failures.length > 0) {
    console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'} found:\n`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error('');
    process.exit(1);
  }
  const n = count || 0;
  console.log(`OK — manifest sound, ${n} project${n === 1 ? '' : 's'} valid.`);
  process.exit(0);
}

main();
