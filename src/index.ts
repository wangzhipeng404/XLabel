import { XLabel } from './core'
import { Keyboard, stringifyKey, createShortcuts } from './keyboardManager'

const $parent = document.getElementById('painter')
const canvas = new XLabel($parent)
canvas.setImg('http://wetwet.cc/db/img/a.1e269410.jpg')

const keyboard = new Keyboard();
const shortcutCtrl = stringifyKey("ctrl")
const shortcutRectangle = stringifyKey("ctrl", "r")
const shortcutCircle = stringifyKey("ctrl", "c")
const shortcutpolyon = stringifyKey("ctrl", "p")

keyboard.addListener(
  createShortcuts({
    [shortcutRectangle]: (e, combo) => {
      e.preventDefault()
      canvas.setCreateMode('rectangle')
    },
    [shortcutCircle]: e => {
      e.preventDefault()
      canvas.setCreateMode('circle')
    },
    [shortcutpolyon]: e => {
      e.preventDefault()
      canvas.setCreateMode('polygon')
    },
  })
)

window.addEventListener("keydown", keyboard.getHandler(), false)
