import { SVG, Svg, Dom } from '@svgdotjs/svg.js'
import defaultConfig from './config/config'
import { HashTable } from './hashTable'
import { Shape, ShapeType } from './shape'
import { Point } from './point'
import { List } from './list'
import { getUniqueColorKey, closeEnough } from './utils'
import { AnyObject } from './typings'

type Config = typeof defaultConfig

interface Dataset {
  key?: string
  type?: 'vertex'
  index?: number
  [key: string]: any
}

interface MouseEV extends MouseEvent {
  target: SVGAElement
  dataset: Dataset
}

export class Canvas {
  private canvas: Svg
  private cursor: Point
  private continuousMode: boolean = false

  config: Config;
  shapes: HashTable<Shape>
  createMode: ShapeType = 'rectangle'
  mode: 'CREATE'  | 'EDIT' | 'MOVE' = 'CREATE'
  current?: Shape = null
  prevPoint?: Point = null
  prevMovePoint?: Point = null
  line: Shape
  offsetLeft: number = 0
  offsetTop: number = 0
  scale: number = 1
  selectedDataset: Dataset = {}

  constructor($parent: HTMLElement, conf: Partial<Config> = {}) {
    this.config = { ...defaultConfig, ...conf }
    this.canvas = SVG().addTo($parent).size('100%', '100%')
    this.shapes = new HashTable<Shape>()
    this.line = new Shape(getUniqueColorKey(this.shapes), this.createMode)
    this.offsetLeft = $parent.offsetLeft
    this.offsetTop = $parent.offsetTop
    this.canvas.mousedown((e) => this.mousePressEvent(e))
    this.canvas.mousemove((e) => this.mouseMoveEvent(e))
    this.canvas.dblclick(() => {
      console.log('dbclick')
      this.continuousMode = !this.continuousMode
    })
    $parent.oncontextmenu = (ev: MouseEvent) => {
      ev.preventDefault()
    }
  }

  drawing() {
    return this.mode === 'CREATE'
  }

  editing() {
    return this.mode === 'EDIT'
  }

  moving() {
    return this.mode === 'MOVE'
  }

  continuous() {
    return this.continuousMode
  }

  setContinuousMode(flag: boolean) {
    this.continuousMode = flag
  }

  setImg(url: string) {
    this.canvas.clear()
    this.shapes = new HashTable<Shape>()
    this.canvas.image(url).size('100%', '100%')
  }

  setConfig(conf: Partial<Config>) {
    this.config = { ...this.config, ...conf }
  }

  setCreateMode(type: ShapeType) {
    this.createMode = type
    this.line.shapeType = type
  }

  setData() {
  }

  getData() {

  }

  mousePressEvent(ev: MouseEV) {
    const pos = this.transformPos(ev)
    const { nodeName, dataset } = ev.target
    if (ev.button === 1) return;
    if (ev.button === 2) {
      this.continuousMode = !this.continuousMode
      this.line.points.clear()
      this.current = null
      console.log('stop continousMode')
      return
    }
    if(!this.current && dataset.key) {
      this.selectedDataset = dataset
      this.current = this.shapes.get(dataset.key)
      this.prevPoint = pos
      this.prevMovePoint = pos
      if (dataset.type === 'vertex') {
        this.mode = 'EDIT'
      } else {
        this.mode = 'MOVE'
      }
      return
    }
    if (this.drawing()) {
      this.createShape(pos)
    } else {
      this.mode = 'CREATE'
      this.selectedDataset = {}
      this.finalise()
    }
  }

  mouseMoveEvent(ev: MouseEV) {
    const pos = this.transformPos(ev)
    this.cursor = pos
    if (this.drawing()) {
      if (!this.current) return;
      if (['polygon', 'linestrip'].includes(this.createMode)) {
        this.line.points.set(0, this.current.points.last())
        this.line.points.set(1, pos)
      } else if (['rectangle', 'circle', 'line'].includes(this.createMode)) {
        this.line.points.set(0, this.current.points.get(0))
        this.line.points.set(1, pos)
        // this.line.close()
      } else if (this.createMode === 'point') {
        this.line.points.set(0, this.current.points.get(0))
        // this.line.close()
      }
      this.repaint()
    }
    if (this.moving()) {
      this.moveShape(pos)
    }
    if (this.editing()) {
      this.editShape(pos)
    }
  }

  createShape(pos: Point) {
    if (this.current) { // 如果有当前图形则处理当前图形
      const tooClose = closeEnough(pos, this.current.points.get(0), 5)
      if (this.createMode === 'polygon') {
        this.current.addPoint(pos)
        this.line.points.set(0, this.current.points.last())
        if (this.current.isClose()) {
          this.finalise()
        }
      } else if(['rectangle', 'circle', 'line'].includes(this.createMode)) {
        if (tooClose) {
          this.current = null
          this.finalise()
        } else {
          this.current.points.clear()
          this.current.points.addList(this.line.points)
          this.finalise()
        }
        if (this.createMode === 'rectangle' && this.continuousMode) {
          this.createShape(pos)
        }
      } else if (this.createMode === 'linestrip') {
        console.log('line strip pass')
      }
    } else { // 没有就新建图形
      const colorKey = getUniqueColorKey(this.shapes)
      this.current = new Shape(colorKey, this.createMode)
      this.current.addPoint(pos)
      if (this.createMode === 'point') {
        this.finalise()
      } else {
        this.line.points.add(pos)
        this.line.points.add(pos)
        this.repaint()
      }
    }
  }

  moveShape(pos: Point) {
    const offsetX = pos.x - this.prevMovePoint.x
    const offsetY = pos.y - this.prevMovePoint.y
    this.current.points.foreach((i, p) => {
      const newPoint = new Point(p.x + offsetX, p.y + offsetY)
      this.current.points.set(i, newPoint)
    })
    this.prevMovePoint = pos
    this.current.paint(this.canvas)
  }

  editShape(pos: Point) {
    const { index } = this.selectedDataset
    this.current.points.set(index, pos)
    this.current.paint(this.canvas)
  }

  transformPos(ev: MouseEV) {
    const { clientX, clientY } = ev
    const x = (clientX - this.offsetLeft) / this.scale
    const y = (clientY - this.offsetTop) / this.scale
    return new Point(x, y)
  }

  finalise() {
    if (this.current) {
      this.current.close()
      this.shapes.set(this.current.colorKey, this.current)
      this.current.paint(this.canvas)
    }
    this.line.removeElement()
    this.line.points.clear()
    this.current = null
  }

  repaint() {
    if(this.createMode === 'polygon') {
      this.current.paint(this.canvas)
    }
    this.line.paint(this.canvas)
  }

  reRender() {
    console.log('render')
    this.shapes.foreach((k, v) => {
      v.paint(this.canvas)
    })
  }
}