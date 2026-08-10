#!/usr/bin/env node
/**
 * Merges the Part Requests translation sections into the app's locale files.
 *
 * Run it from the project root (the folder containing `frontend/`), with this
 * module folder unzipped anywhere:
 *
 *   node path/to/part-requests-module/i18n/merge-i18n.mjs
 *
 * Or point it at the locales folder explicitly:
 *
 *   node merge-i18n.mjs ../../frontend/src/i18n/locales
 *
 * Everything is read and written as UTF-8, so the Farsi strings survive
 * intact -- which is why this is a script rather than a copy-paste step.
 * Existing keys are never overwritten; run it twice and the second run is a
 * no-op.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

const localesDir = resolve(
  process.argv[2] || join(process.cwd(), 'frontend', 'src', 'i18n', 'locales')
)

if (!existsSync(localesDir)) {
  console.error(`Locales folder not found: ${localesDir}`)
  console.error('Pass the path explicitly, e.g. node merge-i18n.mjs ./frontend/src/i18n/locales')
  process.exit(1)
}

/** Adds missing keys from `source` into `target`, leaving existing values alone. */
function mergeMissing(target, source, path = [], added = []) {
  for (const [key, value] of Object.entries(source)) {
    const isObject = value && typeof value === 'object' && !Array.isArray(value)
    if (isObject) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {}
      mergeMissing(target[key], value, [...path, key], added)
    } else if (!(key in target)) {
      target[key] = value
      added.push([...path, key].join('.'))
    }
  }
  return added
}

for (const lang of ['en', 'fa']) {
  const localePath = join(localesDir, `${lang}.json`)
  const sectionPath = join(here, `partRequests.${lang}.json`)

  if (!existsSync(localePath)) {
    console.error(`Skipping ${lang}: ${localePath} not found`)
    continue
  }

  const locale = JSON.parse(readFileSync(localePath, 'utf8'))
  const section = JSON.parse(readFileSync(sectionPath, 'utf8'))

  const added = mergeMissing(locale, section)
  writeFileSync(localePath, JSON.stringify(locale, null, 2) + '\n', 'utf8')

  console.log(`${lang}.json: added ${added.length} key(s)`)
  if (added.length) console.log(added.map((k) => `  + ${k}`).join('\n'))
}

console.log('\nDone. Reload the dev server to pick up the new strings.')
