import { Svg } from '@svgdotjs/svg.js'
import { List } from './list'
import { Point } from './point'
import { hexToRgbA } from './utils'
import { AnyObject } from './typings'

type ShapeType = 'rectangle' | 'polygon' | 'line' | 'linestrip' | 'point' | 'circle'

export class Shape {
  private close: boolean = false;
  shapeType: ShapeType;
  label?: string;
  groupId?: string | number;
  colorKey: string;
  lineColor: string;
  lineWidth: number;
  points: List<Point>;
  rgb: [number, number, number];
  otherData: AnyObject
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
    this.rgb = hexToRgbA(colorKey)
    this.lineColor = colorKey
    this.lineWidth = 1
    this.points = new List<Point>()
  }

  copy (colorKey: string) {
    const copyed = new Shape(colorKey, this.shapeType, this.label, this.groupId, this.otherData)
    copyed.points.addList(this.points)
    return copyed
  }

  paint(painter: Svg) {

  }

}