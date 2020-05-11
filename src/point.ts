import { Svg } from '@svgdotjs/svg.js'

export class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  add(p: Point) {
    return new Point(this.x + p.x, this.y + p.y)
  }

  sub(p: Point) {
    return new Point(this.x - p.x, this.y - p.y)
  }

  scale(scale: number) {
    return new Point(this.x * scale, this.y * scale)
  }

  unScale(scale: number) {
    return new Point(this.x / scale, this.y / scale)
  }

  isSamePoint(p: Point) {
    return this.x === p.x && this.y === p.y
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