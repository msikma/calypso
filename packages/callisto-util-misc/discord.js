/**
 * Callisto - callisto-util-misc <https://bitbucket.org/msikma/callisto-bot>
 * Copyright © 2018, Michiel Sikma
 */

import { isPlainObject, isArray } from 'lodash'
import { config } from './resources'

let callistoName

// Used to match @mentions in numerical form.
const mentions = new RegExp('<@[0-9]+>', 'g')
// Splits up commands by whitespace.
const split = new RegExp('\\S+', 'g')

/**
 * Sets the bot name. We will use this to respond to messages.
 */
export const registerBotName = (name) => {
  callistoName = name
}

/**
 * Renders a list of usage strings for all accepted command formats.
 */
export const showCommandHelp = (identifier, formats) => (
  `The following commands are accepted:\n\n${formats.map(
    f => `**${f[0]}** - ${formatUsage(identifier, f)}\n${f[3]}\n`
  ).join('\n')}`
)

/**
 * Displays command usage for a command format.
 */
export const showCommandUsage = (identifier, command, formats) => {
  const matchingFormat = getMatchingFormat(command)
  return `Usage: ${formatUsage(identifier, matchingFormat)}`
}

/**
 * Renders a usage string for a specific command.
 *
 * E.g. ['add', ['keyword'], ['category', 'maxPrice']] will show:
 * !Callisto mandarake add :keyword [:category [:maxPrice]]
 */
const formatUsage = (identifier, format) => {
  const reqArgs = format[1].map(name => `__:${name}__`).join(' ')
  const optArgs = `${format[2].map(name => `[__:${name}__`).join(' ')}${']'.repeat(format[2].length)}`
  return `@${callistoName} ${identifier} ${format[0]} ${[reqArgs, optArgs].join(' ').trim()}`
}

/**
 * Parses a message to see if there's an actionable command in there.
 *
 * The 'formats' parameter should be an array of accepted command formats.
 * A format itself is an array with 0: the command name, 1: required named arguments, 2: optional named arguments.
 * An example formats array:
 *
 *     const formats = [
 *       // Add a new item to the search query.
 *       ['add', ['name'], ['category', 'maxPrice']],
 *       // List all search queries.
 *       ['list'],
 *       // Remove a search query by ID (see 'list' for IDs).
 *       ['remove', ['id']]
 *     ]
 *
 * Returns { success: false } if no suitable command was found. If the command was found, but the format was invalid,
 * we will return { success: false, name: 'name_of_command' }. If the command was successfully parsed,
 * we will return { success: true, name: 'name_of_command', requiredArguments, optionalArguments, matchingFormat }.
 */
export const parseCommand = (identifier, formats, message) => {
  // Strip out all mentions. Assumed we have the regular content with mentions in numerical form.
  const msg = message.replace(mentions, '').trim()

  // Cut the remainder into an array of words so we can identify what command we need to run.
  const bits = msg.match(split)
  if (!bits) return false
  if (bits[0] !== identifier) return false

  // Find the matching command format.
  const matchingFormat = getMatchingFormat(bits[1], formats)
  if (!matchingFormat) return [false]

  // Check to ensure we have enough arguments. If not, return the name of the command the user was trying to run.
  // We can then display usage information for that command.
  if (bits.length < matchingFormat[1].length + 2) return [false, matchingFormat[0]]

  // Retrieve required arguments and optional arguments from the remainder of the command.
  const reqArgs = matchingFormat[1].reduce(reduceCommandArguments(bits, 2), {})
  const optArgs = matchingFormat[2].reduce(reduceCommandArguments(bits, 2 + matchingFormat[1].length), {})

  return { success: true, name: matchingFormat[0], reqArgs, optArgs, matchingFormat }
}

/**
 * Returns the matching format for a command name.
 */
const getMatchingFormat = (command, formats) => formats.filter(f => f[0].match(new RegExp(command), 'i'))[0]

/**
 * Matches a command with the list of required and optional arguments expected for the format.
 */
const reduceCommandArguments = (command, offset) => (acc, key, n) =>
  (command.length >= n + offset ? { ...acc, [key]: command[n + offset] } : acc)

/**
 * Returns a channel integer from a Discord API error path,
 * e.g. '/api/v7/channels/454275744751812608/'.
 */
export const getChannelFromPath = path => {
  const matches = path.match(/\/api\/v[0-9]+\/channels\/([0-9]+)\//i)
  if (matches && matches[1]) {
    return matches[1]
  }
}
/**
 * Returns information about the configuration file by a channel.
 */
export const findChannelPath = channel => {
  const tasks = config.CALLISTO_TASK_SETTINGS

  // Iterate through every task and see if it contains a reference to the given channel.
  for (let [task, taskConfig] of Object.entries(tasks)) {
    const path = findChannel([task], taskConfig, channel)
    // If found, return it; otherwise continue.
    if (path) {
      return path
    }
  }
}

/**
 * Recursively digs through an object to find a specific channel ID.
 */
const findChannel = (path, obj, channel) => {
  let result
  if (isPlainObject(obj)) {
    for (let [key, value] of Object.entries(obj)) {
      result = findChannel([...path, key], value, channel)
    }
    if (result) return result
  }
  if (isArray(obj)) {
    for (let a = 0; a < obj.length; ++a) {
      result = findChannel([...path, a], obj[a], channel)
    }
    if (result) return result
  }
  if (obj === channel) {
    return path
  }
}
