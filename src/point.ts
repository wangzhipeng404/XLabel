import { Svg } from '@svgdotjs/svg.js'

export class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  paint (canvas: Svg) {
    const $point  = canvas.circle(5).attr({
      cx: this.x,
      cy: this.y,
      fill: `rgba(0, 204, 51, 0.8)`,
      class: 'vertex',
    })
  }
}