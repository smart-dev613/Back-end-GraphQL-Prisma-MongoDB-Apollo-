// @author: Rishabh Jindal
// @description: Create media formats

import { createFormat } from "../util/createFormat"


const FORMAT_NAMES = [
    'standard',
    'super_optic',
    'video',
    'scrolling_banner',
    'video_background_window',
    'infinity_canvas',
    'hidden_story',
    'sticky_banner',
    'interstitial',
    'interscroller',
    'expandable_resize',
    'expandable_overlay'
  ]

  export const runScript = async() => {
      for (let formatName of FORMAT_NAMES) {
        await createFormat({formatName})
      }
  }