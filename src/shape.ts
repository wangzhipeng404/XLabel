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
    /* if (this.shapeType === 'polygon') {
      this.removeElement()
    } */
  }

  isClose() {
    return this._close
  }

  setOpen() {
    this._close = false
    /* if (this.shapeType === 'polygon') {
      this.removeElement()
    } */
  }

  copy (colorKey: string) {
    const copyed = new Shape(colorKey, this.shapeType, this.label, this.groupId, this.otherData)
    copyed.points.addList(this.points)
    return copyed
  }
}