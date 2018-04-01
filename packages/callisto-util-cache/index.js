/**
 * Callisto - callisto-util-cache <https://bitbucket.org/msikma/callisto-bot>
 * Copyright © 2018, Michiel Sikma
 */

import sqlite from 'sqlite'

let db

/**
 * Returns the path to the database, given a base path.
 */
const dbPath = (base) => (
  `${base}/db.sqlite`
)

/**
 * Opens the database file and checks whether we need to bootstrap our required tables.
 */
export const dbInit = async (basePath) => {
  db = await sqlite.open(dbPath(basePath))

  // If we don't have the 'cached_items' table, assume that this is a new database file.
  if (!await hasTable('cached_items')) {
    await createTables();
  }
}

/**
 * Checks whether a table exists. Resolves with true/false.
 */
const hasTable = async ($name) => (
  !!await db.get(`select * from sqlite_master where type='table' and name=$name`, { $name })
)

/**
 * Creates all necessary tables.
 */
const createTables = () => (
  Promise.all([
    db.run(`
      create table cached_items (
        id varchar(127),
        task text,
        title text,
        added datetime default current_timestamp,
        primary key (id, task)
      )
    `),
    db.run(`
      create table settings (
        identifier varchar(127) primary key,
        data text
      )
    `)
  ])
)

/**
 * Closes the database file.
 */
export const dbClose = () => (
  db.close()
)

/**
 * Takes a list of items, checks which ones we've already cached in our database,
 * and returns a list of new items that we haven't reported on yet.
 *
 * Normally, you would scrape a page full of items, then run the results through
 * this function, and finally display only the ones we return from here.
 *
 * Every item needs to have at least an 'id' value.
 */
export const removeCached = async (task, items) => {
  if (items.length === 0) return []

  const ids = items.map(item => item.id)
  const sql = (`
    select id, task
    from cached_items
    where id in (${new Array(ids.length).fill('?').join(', ')})
    and task = ?
  `)

  const stmt = await db.prepare(sql)
  const results = await stmt.all([...ids, task])

  // We now have an array of objects with 'id' and 'task' from the database.
  // Make it an array of just IDs so we can check our list for previously seen items.
  const seenIDs = results.map(r => r.id)
  const newItems = items.filter(i => seenIDs.indexOf(i.id) === -1)

  return newItems;
}

/**
 * Saves items into our database.
 */
export const cacheItems = async (task, items) => {
  if (items.length === 0) return

  const stmt = await db.prepare(`insert into cached_items values (?, ?, ?, ?)`)
  items.forEach(i => stmt.run(i.id, task, i.title, null));
  stmt.finalize();
  return stmt;
}

/**
 * Returns task settings. If settings do not exist in the database,
 * we will create an empty row.
 */
export const getSettings = async ($identifier) => {
  const row = await db.get(`select * from settings where identifier=$identifier`, { $identifier })

  if (!row) {
    // If no data exists, make an empty row. Data is always an object (serialized as JSON), so return {} by default.
    await saveSettings($identifier, JSON.stringify({}));
    return {};
  }
  else {
    // Return deserialized JSON from the database.
    return JSON.parse(row.data);
  }
}

/**
 * Replaces saved task settings with a new set.
 */
export const saveSettings = async ($identifier, $data) => (
  db.run(`insert or replace into settings (identifier, data) values ($identifier, $data)`, { $identifier, $data })
)