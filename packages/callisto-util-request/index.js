/**
 * Callisto - callisto-util-request <https://bitbucket.org/msikma/callisto-bot>
 * Copyright © 2018, Michiel Sikma
 */

import requestAsBrowser from 'requestAsBrowser'
import uuid from 'uuid'

import logger from 'callisto-util-logging'
import cookieJar from './cookies'
export { setCookies, loadCookieFile } from './cookies'

// How many times we'll retry a request if it fails.
const REQUEST_TRIES = 5
// How long to wait before checking the workload.
const WAIT_PERIOD = 1000

/**
 * This contains a simple request queue implementation. The purpose is to avoid making
 * a lot of requests at the same time, by putting them in a queue and running one at a time.
 * When making a request, a Promise is returned that resolves when the action has run and the result is available.
 * Furthermore, requests are retried a number of times if they do not succeed at first.
 *
 * The requests queue variables:
 *
 *   - queueOrder: contains references to items in queuedRequests in the order in which they should be executed.
 *   - queuedRequests: contains request IDs in sequential order, but not necessarily from index 0.
 *   - readyRequests: keys are request IDs, values are a boolean that is true if the request is allowed to run.
 *     Only one request is allowed to run at a time.
 *
 * Lastly, performingRequest is true if a task is running, false if no request is running.
 */
let queueOrder = []
let queuedRequests = []
let readyRequests = {}
let performingRequest = false

/**
 * Generates a Promise that makes the desired request and resolves if it was successful.
 * If something goes wrong, it will retry a few times before giving up.
 */
const makeQueuedRequest = (url, cookieJar, extraHeaders, gzip, retries = REQUEST_TRIES, waitPeriod = WAIT_PERIOD) => {
  // Add the request to the queue in whatever position is available.
  const { queueNumber, requestID } = getQueueSpot()

  // Return the actual task.
  return new Promise((resolve, reject) => {
    const task = setInterval(async () => {
      if (readyRequests[requestID] !== true) return
      // Avoid other requests from running in the meantime.
      performingRequest = true
      // Run this task only once.
      clearInterval(task)

      let tries = 0
      let latestError
      while (tries < retries) {
        // Warn if retrying the call.
        if (tries > 0) {
          logger.warn(`Request failed: ${lastError.code} - retry #${tries}: ${url}`)
        }
        tries += 1
        try {
          const result = await requestAsBrowser(url, cookieJar, extraHeaders, gzip)
          // Clean up self from the queue.
          cleanFromQueue(requestID, queueNumber)
          return resolve(result)
        }
        catch (err) {
          latestError = err
          continue
        }
      }
      cleanFromQueue(requestID, queueNumber)
      return reject(latestError)
    }, waitPeriod)
  })
}

/**
 * Removes a completed task from the queue.
 */
const cleanFromQueue = (requestID, queueNumber) => {
  delete readyRequests[requestID]
  delete queuedRequests[queueNumber]
  for (let a = 0; a < queueOrder.length; ++a) {
    if (queueOrder[a] !== queueNumber) continue
    delete queueOrder[a]
  }
  performingRequest = false
}

/**
 * Starts the interval that will power the queue. Every WAIT_PERIOD,
 * this function will check what's next and start up a job.
 * If there are no requests left, the queue is garbage collected by re-initializing the variables.
 */
setInterval(() => {
  // Only run when there are no other requests running.
  if (performingRequest) return
  // Pick the first request and give it the green light.
  for (let a = 0; a < queueOrder.length; ++a) {
    // If null, the request has already been finished.
    if (queueOrder[a] == null) continue

    // Pick the next task and activate it.
    const requestID = queuedRequests[a]
    readyRequests[requestID] = true
    return
  }
  // If we're here, it means the queue is completely empty.
  // Take this time to garbage collect the queue.
  queueOrder = []
  queuedRequests = []
  readyRequests = {}
}, WAIT_PERIOD)

/**
 * Returns a queue number and a request ID. These are placed in the queue pending the execution of the task.
 */
const getQueueSpot = () => {
  // We iterate over the queue, plus one. If the queue is completely full,
  // we'll end up adding the request at the end.
  for (let a = 0; a < queuedRequests.length + 1; ++a) {
    if (queuedRequests[a] != null) continue
    // Add to the empty spot we found.
    const requestID = uuid()
    queuedRequests[a] = requestID
    // Set it to not start working just yet.
    readyRequests[requestID] = false
    // Add it to the queue order so that we know which request goes first.
    queueOrder.push(a)
    return { queueNumber: a, requestID }
  }
  logger.warn('callisto-util-request: Could not add a task to the queue.')
}

/**
 * Safely requests and returns the HTML for a URL.
 *
 * This mimics a browser request to ensure we don't hit an anti-bot wall.
 */
export const requestURL = async (url, extraHeaders = {}, gzip = true) => {
  const req = await makeQueuedRequest(url, cookieJar.jar, extraHeaders, gzip, REQUEST_TRIES, WAIT_PERIOD)
  return req.body
}
