/**
 * Calypso - calypso-task-youtube <https://github.com/msikma/calypso>
 * © MIT license
 */

import { commandResponder } from 'calypso-core/src/responder'
import { actionSearchUpdates } from './actions'

export const id = 'youtube'
export const name = 'Youtube'
export const color = 0xff0000
export const icon = 'https://i.imgur.com/rAFBjZ4.jpg'
const formats = [
//  ['todo', [], [], 'Nothing here yet'],
//  ['help', [], [], 'Displays this help message']
]
const triggerActions = [
  ['message', commandResponder(id, name, color, formats)]
]
const scheduledActions = [
  { delay: 480000, desc: 'find new videos from Youtube searches and subscriptions', fn: actionSearchUpdates }
]

export const getTaskInfo = () => {
  return { id, name, color, icon, formats, triggerActions, scheduledActions }
}