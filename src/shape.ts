import { Svg, Rect, Circle, Polygon, Polyline, Line, pointed } from '@svgdotjs/svg.js'
import { List } from './list'
import { Point } from './point'
import { hexToRgbA, closeEnough, getDistance } from './utils'
import { AnyObject } from './typings'

export type ShapeType = 'rectangle' | 'polygon' | 'line' | 'linestrip' | 'point' | 'circle'

export class Shape {
  private _close: boolean = false;
  shapeType: ShapeType;
  label?: string;
  groupId?: string | number;
  colorKey: string;
  lineColor: string = `#00FF00`;
  lineWidth: number = 1;
  points: List<Point>;
  rgb: [number, number, number] = [0, 255, 0];
  otherData: AnyObject;
  el: Rect | Circle | Polygon | Polyline | Line;
  vertexs: Circle[] = []

  constructor(
    colorKey: string, 
    shapeType: ShapeType = 'rectangle',
    label: string = null,
    groupId: string | number = null,
    otherData: AnyObject = {},
  ) {
    this.colorKey = colorKey
    this.shapeType = shapeType
    this.label = label
    this.groupId = groupId
    this.otherData = otherData
    // this.rgb = hexToRgbA(colorKey)
    // this.lineColor = colorKey
    // this.lineWidth = 1
    this.points = new List<Point>()
  }

  setShapeType(type: ShapeType) {
    this.shapeType = type
  }

  addPoint(point: Point) {
    if (this.points.length() > 0 && closeEnough(this.points.get(0), point, 5)) {
      this.close()
    } else {
      this.points.add(point)
    }
  }

  close() {
    this._close = true
    if (this.shapeType === 'polygon') {
      this.removeElement()
    }
  }

  isClose() {
    return this._close
  }

  setOpen() {
    this._close = false
    if (this.shapeType === 'polygon') {
      this.removeElement()
    }
  }

  copy (colorKey: string) {
    const copyed = new Shape(colorKey, this.shapeType, this.label, this.groupId, this.otherData)
    copyed.points.addList(this.points)
    return copyed
  }

  removeElement() {
    if (this.el) {
      this.el.remove()
      this.el = null
    }
    this.vertexs.forEach(p => p.remove())
    this.vertexs = []
  }

  paint(canvas: Svg, originPoint: Point, scale: number) {
    if (this.points.length() > 1) {
      if (this.shapeType === 'rectangle') {
        this.drawReact(canvas, originPoint, scale)
      }
      if (this.shapeType === 'circle') {
        this.drawCircle(canvas, originPoint, scale)
      }
      if (this.shapeType === 'polygon' || this.shapeType === 'linestrip') {
        this.drawPolygon(canvas, originPoint, scale)
      }
      if (this.shapeType === 'line') {
        this.drawLine(canvas, originPoint, scale)
      }
      
    }
    this.points.foreach((i, p) => {
      this.drawPoint(canvas, originPoint, scale, p, i)
    })
  }

  drawPoint(canvas: Svg, originPoint: Point, scale: number, pos: Point, index: number) {
    if (!this.vertexs[index]) {
      this.vertexs[index] = canvas.circle()
    }
    const p = pos.add(originPoint).scale(scale)
    this.vertexs[index].size(6).attr({
      cx: p.x,
      cy: p.y,
      fill: `rgba(${this.rgb.join(',')}, 1)`,
      'data-key': this.colorKey,
      'data-type': 'vertex',
      'data-index': index,
    })
  }

  drawLine(canvas: Svg, originPoint: Point, scale: number) {
    if (!this.el) {
      this.el = canvas.line()
    }
    const points = []
    this.points.foreach((i, p) => {
      const pos = p.add(originPoint).scale(scale)
      points.push(`${pos.x},${pos.y}`)
    });
    (<Line>this.el).plot(points.join(',')).attr({
      stroke: this.lineColor,
      'stroke-width': 1,
      fill: 'none',
      'data-key': this.colorKey,
    }).plot()
  }

  drawReact(canvas: Svg, originPoint: Point, scale: number) {
    if(!this.el) {
      this.el = canvas.rect()
    }
    const p0 = this.points.get(0).add(originPoint).scale(scale)
    const p1 = this.points.get(1).add(originPoint).scale(scale)
    const x = (p0.x < p1.x ? p0.x : p1.x)
    const y = (p0.y < p1.y ? p0.y : p1.y)
    ;(<Rect>this.el)
      .width(Math.abs(p1.x - p0.x))
      .height(Math.abs(p1.y - p0.y))
      .attr({
        x,
        y,
        stroke: this.lineColor,
        'stroke-width': 1,
        fill: `rgba(${this.rgb.join(',')}, 0.1)`,
      'data-key': this.colorKey,
      })
  }

  drawCircle(canvas: Svg, originPoint: Point, scale: number) {
    if (!this.el) {
      this.el = canvas.circle()
    }
    const p0 = this.points.get(0).add(originPoint).scale(scale)
    const p1 = this.points.get(1).add(originPoint).scale(scale)
    const d = getDistance(p1, p0)
    ;(<Circle>this.el).size(d).attr({
      cx: (p0.x + p1.x) / 2,
      cy: (p0.y + p1.y) / 2,
      stroke: this.lineColor,
      'stroke-width': 1,
      fill: `rgba(${this.rgb.join(',')}, 0.1)`,
      'data-key': this.colorKey,
    })
  }

  drawPolygon(canvas: Svg, originPoint: Point, scale: number) {
    if (!this.el) {
      this.el = this.isClose() ? canvas.polygon() : canvas.polyline()
    }
    const points = []
    this.points.foreach((i, p) => {
      const pos = p.add(originPoint).scale(scale)
      points.push(`${pos.x},${pos.y}`)
    })
    ;(<Polygon | Polyline>this.el).plot(points.join(' '))
    ;(<Polygon | Polyline>this.el).attr({
      stroke: this.lineColor,
      'stroke-width': 1,
      fill: `rgba(${this.rgb.join(',')}, 0.1)`,
      'data-key': this.colorKey,
    })
  }
}