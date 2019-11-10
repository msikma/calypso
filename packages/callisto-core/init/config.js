// Callisto - callisto-core <https://github.com/msikma/callisto>
// © MIT license

const { logFatal, logError, die } = require('dada-cli-tools/log')
const { progName, canAccess } = require('dada-cli-tools/util/fs')
const { readConfig } = require('../lib/config')
const runtime = require('../state')

/**
 * Reads and checks the config file.
 * 
 * If something is wrong, this exits the program. If all goes well, the runtime
 * state object will have 'config' set to the config file's data.
 */
const initConfig$ = async (pathConfig) => {
  if (!(await canAccess(pathConfig))) {
    return exitError('could not find the config file.', pathConfig)
  }

  // Retrieve config data and replace magic strings (like <%baseDir%>).
  const config = readConfig(pathConfig)
  if (!config.success) {
    console.log(config)
    return exitError('could not parse config file - run config check.', pathConfig)
  }
  runtime.config = config.data
}

/** Exits the program if there's something wrong with the config file. */
const exitError = (error, path, valResults) => {
  const prog = progName()
  logFatal(`${prog}: error: ${error}`)
  if (valResults) {
    // Contains specific validation result errors.
    // valResults
  }
  logError('Ensure a valid config file is available at this location:', path)
  logError(`You can generate one: ${prog} --new-config`)
  die()
}

module.exports = initConfig$
