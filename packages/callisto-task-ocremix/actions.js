/**
 * Callisto - callisto-task-ocremix <https://bitbucket.org/msikma/callisto-bot>
 * Copyright © 2018, Michiel Sikma
 */

import { RichEmbed } from 'discord.js'
import moment from 'moment'

import logger from 'callisto-util-logging'
import { sendMessage } from 'callisto-discord-interface/src/responder'
import { embedTitle, embedDescription } from 'callisto-util-misc'
import { findNewItems } from './search'
import { color } from './index'

const ICON = 'https://i.imgur.com/4pVcJnw.png'

/**
 * Find new tracks and albums on OCReMix.
 */
export const actionRemixes = async (discordClient, user, taskConfig) => {
  try {
    logger.debug(`ocremix: Searching for new tracks and albums`)
    const { tracks, albums } = await findNewItems()

    if (tracks.length) {
      logger.debug(`ocremix: Found ${tracks.length} new tracks`)
      taskConfig.tracks.target.forEach(t => reportResults(t[0], t[1], tracks, 'track'))
    }

    if (albums.length) {
      logger.debug(`ocremix: Found ${albums.length} new albums`)
      taskConfig.albums.target.forEach(t => reportResults(t[0], t[1], albums, 'album'))
    }
  }
  catch (err) {
    logger.error('ocremix: Error occurred while scraping')
    logger.error(err.stack)
  }
}

/**
 * Passes on the search results to the server.
 */
const reportResults = (server, channel, results, type) => {
  if (results.length === 0) return
  results.forEach(item => sendMessage(server, channel, null, formatMessage(item, type)))
}

/**
 * Returns a RichEmbed describing a new item.
 */
const formatMessage = (item, type) => {
  if (type === 'track') return formatMessageTrack(item)
  if (type === 'album') return formatMessageAlbum(item)
}

/**
 * Returns a RichEmbed for a track.
 */
const formatMessageTrack = (item) => {
  const embed = new RichEmbed();
  embed.setAuthor(`New track on OverClocked ReMix`, ICON)
  embed.setTitle(embedTitle(item.title))
  embed.setThumbnail(item.image)
  embed.setURL(item.link)
  embed.addField('Author', item.artist.artistName)
  embed.addField('Game', item.game.gameName)
  embed.setFooter(`Published on ${moment(item.pubDate).format('MMMM D, YYYY')}`)
  embed.setColor(color)
  return embed
}

/**
 * Returns a RichEmbed for an album.
 */
const formatMessageAlbum = (item) => {
  const embed = new RichEmbed();
  embed.setAuthor(`New album on OverClocked ReMix`, ICON)
  embed.setTitle(embedTitle(item.title))
  embed.setImage(item.image)
  embed.setURL(item.link)
  embed.setFooter(`Published on ${moment(item.pubDate).format('MMMM D, YYYY')}`)
  embed.setColor(color)
  return embed
}
