// import { Svg } from '@svgdotjs/svg.js'

export class Point {
  x: number;

  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(p: Point) {
    return new Point(this.x + p.x, this.y + p.y);
  }

  sub(p: Point) {
    return new Point(this.x - p.x, this.y - p.y);
  }

  scale(scale: number) {
    return new Point(
      Number(parseFloat(`${this.x * scale}`).toFixed(2)),
      Number(parseFloat(`${this.y * scale}`).toFixed(2)),
    );
  }

  unScale(scale: number) {
    return new Point(
      Number(parseFloat(`${this.x / scale}`).toFixed(2)),
      Number(parseFloat(`${this.y / scale}`).toFixed(2)),
    );
  }

  isSamePoint(p?: Point | null) {
    if (!p) return false;
    return this.x === p.x && this.y === p.y;
  }
}
