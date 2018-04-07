/**
 * Callisto - callisto-discord-interface <https://bitbucket.org/msikma/callisto-bot>
 * Copyright © 2018, Michiel Sikma
 */

import Discord from 'discord.js'

import { dbInit, getSettings } from 'callisto-util-cache'
import { registerBotName } from 'callisto-util-misc'
import logger, { configureLogger } from 'callisto-util-logging'

import decorateResponses from './decorator'
import { findTasks, findAndRegisterTasks } from './task-manager'
import { config, pkg } from './resources'

export const discord = {
  client: null,
  settings: null,
  bot: null
}

/**
 * Main entry point that runs the bot. Command line arguments are passed here.
 * If 'task' is set, we'll run the bot with that one task only. Others get ignored.
 * 'level' sets the console logging verbosity.
 */
export const run = async ({ task, level }) => {
  // Make sure we can write logs.
  configureLogger(config.CALLISTO_BASE_DIR, level)

  logger.info(`callisto-bot ${pkg.version}`)

  // Load single task if testing.
  let taskData
  if (task) {
    taskData = findTasks().filter(taskData => taskData.slug === task)[0]
    if (!taskData) {
      logger.error(`Could not find task: callisto-task-${task}`)
      process.exit(1)
    }
    logger.warn(`Testing with only this task: ${taskData.slug}`)
  }

  // Saves our chosen bot name for writing responses to users instructing them to @ us.
  // TODO: this should likely be removed, since we can just pass the bot user object's name.
  registerBotName(config.CALLISTO_BOT_NAME)

  // Mount database file, or create a new file if it doesn't exist.
  await dbInit(`${config.CALLISTO_BASE_DIR}/cache/`);
  discord.settings = await getSettings('discordInterface')
  discord.client = new Discord.Client()

  // Log in to the server.
  await discord.client.login(config.CALLISTO_BOT_TOKEN)
  discord.bot = await discord.client.fetchUser(config.CALLISTO_BOT_CLIENT_ID)

  // Get a list of all installed tasks and register them.
  findAndRegisterTasks(discord.client, discord.bot, config.CALLISTO_TASK_SETTINGS, taskData)
}
