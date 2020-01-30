// Callisto - callisto-core <https://github.com/msikma/callisto>
// © MIT license

const { writeFileSync } = require('fs')
const { get } = require('lodash')
const checkPropTypes = require('prop-types-checker')
const { logWarn } = require('dada-cli-tools/log')
const { fileExists } = require('dada-cli-tools/util/fs')

const { replaceMagic } = require('./magic')
const { configTpl, configModel } = require('./tpl')
const runtime = require('../../state')

/**
 * Returns the value of a config key.
 */
const getConfigKey = (key, ns = null, config = runtime.config) => {
  const path = `${!ns || ns == null ? 'systemConfig' : `taskConfig.${ns}`}`
  return get(config, `${path}.${key}`, null)
}

/**
 * Reads the contents of a config file.
 * 
 * If the config file cannot be read for some reason, null is returned;
 * otherwise, an object with the config content is returned.
 * 
 * TODO: run the JS file in a separate VM instance.
 */
const readConfigFile = configPath => {
  let success = true
  let exists = true
  let content = null

  try {
    content = require(configPath)
  }
  catch (err) {
    success = false
    exists = err.code === 'MODULE_NOT_FOUND'
  }

  return {
    success,
    exists,
    data: content
  }
}

/**
 * Reads the config file and returns its data, with magic strings replaced.
 */
const readConfig = configPath => {
  const { baseDir, cacheDir, configDir } = runtime
  const result = readConfigFile(configPath)
  return {
    ...result,
    data: result.success ? replaceMagic(result.data, baseDir, configDir, cacheDir) : null
  }
}

/**
 * Loads a config file's data and validates its structure.
 */
const validateConfigFile = configPath => {
  const config = readConfig(configPath)
  return _validateMainConfig(config.data)
}

/**
 * Checks config data to see if it's base structure is valid.
 * This does NOT check the tasks' config.
 */
const _validateMainConfig = (configData) => {
  logWarn('Not implemented yet: _validateMainConfig()')
  try {
    const configSyntax = checkPropTypes(configModel, configData.SYSTEM)
    return {
      success: true
    }
  }
  catch (err) {
    return {
      error: err,
      success: false
    }
  }
}

/**
 * Checks the config data for whether it's correct for a specific task.
 * TODO
 */
const _validateTaskConfig = async (taskName) => {
  logWarn('Not implemented yet: _validateTaskConfig()')
  const configSyntax = checkPropTypes()
  return {
    success: true
  }
}

/**
 * Generates a new config file and saves it to a given location.
 */
const writeNewConfig = async (configPath, tasks) => {
  let exists = await fileExists(configPath)
  let success = false
  let error = null

  if (!exists) {
    try {
      const tplFns = tasks.map(task => task.data.config.template)
      const configContent = generateNewConfig(tplFns)
      writeFileSync(configPath, configContent)
      success = await fileExists(configPath)
    }
    catch (err) {
      error = err
    }
  }
  return {
    success,
    error,
    exists
  }
}

/**
 * Generates a new config object based on all available tasks' config templates.
 */
const generateNewConfig = tplFns => {
  const padding = '    '
  const configContent = tplFns.map(tplFn => tplFn()).join(',\n')
  const configPadded = `${padding}${configContent.replace(/\n/g, `\n${padding}`)}`
  const mainTpl = configTpl(configPadded)
  return `${mainTpl.trim()}\n`
}

module.exports = {
  getConfigKey,
  readConfig,
  validateConfigFile,
  writeNewConfig
}
