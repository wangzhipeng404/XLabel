import { SVG, Svg, Dom, Image } from '@svgdotjs/svg.js'
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

export class XLabel {
  private canvas: Svg
  private cursor: Point
  private continuousMode: boolean = false

  config: Config;
  shapes: HashTable<Shape>
  createMode: ShapeType = 'rectangle'
  mode: 'CREATE'  | 'EDIT' | 'MOVE' = 'CREATE'
  mousePressed: boolean = false
  copyShape: boolean = false
  current?: Shape = null
  prevPoint?: Point = null
  prevMovePoint?: Point = null
  line: Shape
  canvasWidth: number = 0
  canvasHeight: number = 0
  offsetLeft: number = 0
  offsetTop: number = 0
  originPoint: Point
  centerPoint: Point
  scale: number = 1
  selectedDataset: Dataset = {}
  labelImagePath?: string = null
  labelImage?: Image = null
  labelImageWidth: number = 0
  labelImageHeight: number = 0
  pixmapWidth: number = 0
  pixmapHeight: number = 0

  constructor($parent: HTMLElement = document.body, conf: Partial<Config> = {}) {
    this.config = { ...defaultConfig, ...conf }
    this.canvas = SVG().addTo($parent).size('100%', '100%').id('xlabelsvg')
    this.shapes = new HashTable<Shape>()
    this.line = new Shape(getUniqueColorKey(this.shapes), this.createMode)
    this.originPoint = new Point(0, 0)
    this.canvasWidth = $parent.clientWidth
    this.canvasHeight = $parent.clientHeight
    this.offsetLeft = $parent.offsetLeft
    this.offsetTop = $parent.offsetTop
    this.pixmapWidth = this.canvasWidth
    this.pixmapHeight = this.canvasHeight
    this.centerPoint = new Point(this.canvasWidth, this.canvasHeight).scale(0.5)
    this.canvas.mousedown((e) => this.mousePressEvent(e))
    this.canvas.mousemove((e) => this.mouseMoveEvent(e))
    this.canvas.mouseup(e => this.mouseUpEvent(e))
    this.canvas.dblclick(() => {
      console.log('dbclick')
      this.continuousMode = !this.continuousMode
    })
    $parent.oncontextmenu = (ev: MouseEvent) => {
      ev.preventDefault()
    }
    $parent.addEventListener('mousewheel', (e: MouseWheelEvent & MouseEV) => {
      if (e.ctrlKey) {
        this.zoom(e.deltaY, this.transformPos(e))
        e.returnValue = false
      }
    }, { passive: false })
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

  copying() {
    return this.copyShape
  }

  continuous() {
    return this.continuousMode
  }

  setContinuousMode(flag: boolean) {
    this.continuousMode = flag
  }

  setImg(path: string) {
    this.labelImagePath = path
    this.shapes = new HashTable<Shape>()
    const img = document.createElement('img')
    img.src = path
    if(img.complete){
      this.labelImageWidth = img.width
      this.labelImageHeight = img.height
      this.pixmapWidth = this.canvasWidth
      this.pixmapHeight = this.canvasWidth / img.width * img.height
      this.reRender()
    }else{
      img.onload = () => {
        this.labelImageWidth = img.width
        this.labelImageHeight = img.height
        this.pixmapWidth = this.canvasWidth
        this.pixmapHeight = this.canvasWidth / img.width * img.height
        this.centerPoint = new Point(this.pixmapWidth, this.pixmapHeight).scale(0.5)
        this.reRender()
      }
    }
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

  zoom(deltaY: number, pos: Point) {
    if (deltaY < 0) {
      if (this.scale >= this.config.zoomMax) return;
      this.scale += 0.1
      this.originPoint = this.centerPoint.scale(1 - this.scale)
    } else {
      if (this.scale <= this.config.zoomMin) return;
      this.scale -= 0.1
      this.originPoint = this.centerPoint.scale(1 - this.scale)
    }
    this.reRender()
  }

  mousePressEvent(ev: MouseEV) {
    const pos = this.transformPos(ev)
    if (this.outOfPixmap(pos)) return;
    const { nodeName, dataset } = ev.target
    this.mousePressed = true
    if (ev.button === 1) return;
    if (ev.button === 2) {
      this.continuousMode = !this.continuousMode
      this.line.points.clear()
      this.current = null
      console.log('stop continousMode')
      return
    }
    // 点击矩形框或点 移动或编辑
    if(!this.current && dataset.key) {
      this.selectedDataset = dataset
      this.current = this.shapes.get(dataset.key)
      this.prevPoint = pos
      this.prevMovePoint = pos
      if (dataset.type === 'vertex') {
        this.mode = 'EDIT'
      } else {
        this.mode = 'MOVE'
        if (ev.ctrlKey) {
          this.mousePressed = false
          this.copyShape = true
          this.current = this.current.copy(getUniqueColorKey(this.shapes))
          this.current.paint(this.canvas, this.originPoint, this.scale)
        }
      }
      return
    }
    // 移动背景
    if (ev.ctrlKey) {
      this.prevPoint = pos
      this.prevMovePoint = pos
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
    if (ev.ctrlKey) {
      if (this.mousePressed) {
        this.moveLabelImage(pos)
        return
      }
    }
    if (this.drawing()) {
      if (!this.current) return;
      if (this.outOfPixmap(pos)) return;
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

  mouseUpEvent(ev: MouseEV) {
    this.mousePressed = false
    if (this.copying()) {
      this.mode = 'CREATE'
      this.copyShape = false
      this.selectedDataset = {}
      this.finalise()
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
    let flag = true
    const newPointList = new List<Point>()
    this.current.points.foreach((i, p) => {
      const newPoint = new Point(p.x + offsetX, p.y + offsetY)
      newPointList.add(newPoint)
      if (this.outOfPixmap(newPoint)) {
        flag = false
      }
    })
    if (!this.outOfPixmap(pos)) {
      this.prevMovePoint = pos
    } else {
      this.mode = 'CREATE'
      this.selectedDataset = {}
      this.finalise()
    }
    if (flag) {
      this.current.points.clear()
      this.current.points.addList(newPointList)
      this.current.paint(this.canvas, this.originPoint, this.scale)
    }
  }

  editShape(pos: Point) {
    if (this.outOfPixmap(pos)) return;
    const { index } = this.selectedDataset
    this.current.points.set(index, pos)
    this.current.paint(this.canvas, this.originPoint, this.scale)
  }

  moveLabelImage(pos: Point) {
    const offsetPoint = pos.sub(this.prevMovePoint)
    this.originPoint = this.originPoint.add(offsetPoint)
    this.prevMovePoint = pos
    this.reRender()
  }

  transformPos(ev: MouseEV) {
    const { clientX, clientY } = ev
    const x = (clientX - this.offsetLeft) / this.scale
    const y = (clientY - this.offsetTop) / this.scale
    return new Point(x, y).sub(this.originPoint)
  }

  outOfPixmap(p: Point) {
    const pos = p
    return pos.x < 1 || pos.x > this.pixmapWidth - 1 || pos.y < 1 || pos.y > this.pixmapHeight - 1
  }

  finalise() {
    if (this.current) {
      this.current.close()
      this.shapes.set(this.current.colorKey, this.current)
      this.current.paint(this.canvas, this.originPoint, this.scale)
    }
    this.line.removeElement()
    this.line.points.clear()
    this.current = null
  }

  repaint() {
    if(this.createMode === 'polygon') {
      this.current.paint(this.canvas, this.originPoint, this.scale)
    }
    this.line.paint(this.canvas, this.originPoint, this.scale)
  }

  reRender() {
    if (this.labelImagePath) {
      if (!this.labelImage) {
        this.labelImage = this.canvas.image().id('labelimage')
      }
      this.labelImage
        .load(this.labelImagePath)
        .size(this.pixmapWidth * this.scale, this.pixmapHeight * this.scale)
        .x(this.originPoint.x * this.scale)
        .y(this.originPoint.y * this.scale)
    }
    this.shapes.foreach((k, v) => {
      v.paint(this.canvas, this.originPoint, this.scale)
    })
  }
}