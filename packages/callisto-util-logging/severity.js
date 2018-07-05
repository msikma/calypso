/**
 * Callisto - callisto-util-logging <https://bitbucket.org/msikma/callisto-bot>
 * Copyright © 2018, Michiel Sikma
 */

// All available log levels from most severe to least severe.
export const logLevels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly']

const severity = {
  error: 60,
  warn: 50,
  info: 40,
  verbose: 30,
  debug: 20,
  silly: 10
}

export default severity
