#!/usr/bin/env node
/**
 * Add a movie or a TV episode to public/movies.json.
 *
 * Movie:
 *   node scripts/add-movie.mjs movie --title "Shrek" --poster <img-url> --link <embed-url>
 *
 * New show / new episode (creates the show if it doesn't exist yet):
 *   node scripts/add-movie.mjs episode --show "South Park" --poster <img-url> \
 *        --name "S27E01" --link <embed-url>
 *
 * IDs are generated from the title, duplicates are skipped, and `updated` is
 * refreshed so the site shows the new entries on the next load.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(process.cwd(), 'public/movies.json');

const args = process.argv.slice(2);
const mode = args[0];
const flags = {};
for (let i = 1; i < args.length; i += 2) {
  if (!args[i]?.startsWith('--')) continue;
  flags[args[i].slice(2)] = args[i + 1];
}

const slug = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const die = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const catalog = JSON.parse(readFileSync(FILE, 'utf8'));
catalog.movies ??= [];
catalog.shows ??= [];

if (mode === 'movie') {
  const { title, poster = '', link } = flags;
  if (!title || !link) die('movie needs --title and --link');
  const id = slug(title);
  if (catalog.movies.some((m) => m.id === id)) die(`movie "${title}" already exists`);
  catalog.movies.unshift({ id, type: 'movie', title, poster, link });
  console.log(`added movie: ${title}`);
} else if (mode === 'episode') {
  const { show, name, link, poster = '' } = flags;
  if (!show || !name || !link) die('episode needs --show, --name and --link');
  const id = slug(show);
  let entry = catalog.shows.find((s) => s.id === id);
  if (!entry) {
    entry = { id, type: 'show', title: show, poster, episodes: [] };
    catalog.shows.push(entry);
    console.log(`created show: ${show}`);
  }
  if (poster && !entry.poster) entry.poster = poster;
  if (entry.episodes.some((e) => e.name === name)) die(`episode "${name}" already exists`);
  entry.episodes.push({ name, link });
  console.log(`added episode: ${show} — ${name} (${entry.episodes.length} total)`);
} else {
  die('usage: add-movie.mjs <movie|episode> [--flags]  (see file header)');
}

catalog.updated = new Date().toISOString();
writeFileSync(FILE, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`wrote ${FILE}`);
