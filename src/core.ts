import { SVG, Svg, Dom, Image, Circle, Rect, Polygon, Polyline, Line } from '@svgdotjs/svg.js'
import { Keyboard, stringifyKey, createShortcuts } from './keyboardManager'
import defaultConfig from './config/config'
import { HashTable } from './hashTable'
import { Shape, ShapeType } from './shape'
import { Point } from './point'
import { List } from './list'
import { getUniqueColorKey, closeEnough, getDistance } from './utils'
import { AnyObject } from './typings'

export type Config = typeof defaultConfig

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

type ShapeElement = Rect | Circle | Polygon | Polyline | Line

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
  elements: HashTable<ShapeElement> = new HashTable<ShapeElement>()
  vertexs: HashTable<Circle[]> = new HashTable<Circle[]>()

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
    this.registerShutcuts()
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

  registerShutcuts() {
    const keyboard = new Keyboard();
    const shortcutCtrl = stringifyKey("ctrl")
    const shortcutRectangle = stringifyKey("ctrl", "r")
    const shortcutCircle = stringifyKey("ctrl", "c")
    const shortcutpolyon = stringifyKey("ctrl", "p")
    keyboard.addListener(
      createShortcuts({
        [shortcutRectangle]: (e, combo) => {
          e.preventDefault()
          this.setCreateMode('rectangle')
        },
        [shortcutCircle]: e => {
          e.preventDefault()
          this.setCreateMode('circle')
        },
        [shortcutpolyon]: e => {
          e.preventDefault()
          this.setCreateMode('polygon')
        },
      })
    )
    window.addEventListener("keydown", keyboard.getHandler(), false)
  }

  setContinuousMode(flag: boolean) {
    this.continuousMode = flag
  }

  setImg(path: string) {
    if (!path) return;
    this.clean()
    this.labelImagePath = path
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
      console.log(ev)
      this.selectedDataset = dataset
      this.current = this.shapes.get(dataset.key)
      this.prevPoint = pos
      this.prevMovePoint = pos
      if (dataset.type === 'vertex') {
        this.mode = 'EDIT'
      } else {
        this.mode = 'MOVE'
        if (ev.ctrlKey) {
          console.log('copy')
          this.mousePressed = false
          this.copyShape = true
          this.current = this.current.copy(getUniqueColorKey(this.shapes))
          this.paint(this.current)
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
      this.paint(this.current)
    }
  }

  editShape(pos: Point) {
    if (this.outOfPixmap(pos)) return;
    const { index } = this.selectedDataset
    this.current.points.set(index, pos)
    this.paint(this.current)
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
      if (this.current.shapeType === 'polygon') {
        this.removeElement(this.current)
      }
      this.shapes.set(this.current.colorKey, this.current)
      this.paint(this.current)
    }
    this.removeElement(this.line)
    this.line.points.clear()

    this.current = null
    console.log('finalise')
  }

  repaint() {
    if(this.createMode === 'polygon') {
      this.paint(this.current)
    }
    this.paint(this.line)
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
      this.paint(v)
    })
  }

  paint(shape: Shape) {
    if (shape.points.length() > 1) {
      if (shape.shapeType === 'rectangle') {
        this.drawReact(shape)
      }
      if (shape.shapeType === 'circle') {
        this.drawCircle(shape)
      }
      if (shape.shapeType === 'polygon' || shape.shapeType === 'linestrip') {
        this.drawPolygon(shape)
      }
      if (shape.shapeType === 'line') {
        this.drawLine(shape)
      }
      
    }
    shape.points.foreach((i, p) => {
      this.drawPoint(shape, i)
    })
  }

  drawPoint(shape: Shape, index: number) {
    const vts = this.vertexs.get(shape.colorKey) || []
    if (!vts[index]) {
      vts[index] = this.canvas.circle()
      this.vertexs.set(shape.colorKey, vts)
    }
    const p = shape.points.get(index).add(this.originPoint).scale(this.scale)
    vts[index].size(6).attr({
      cx: p.x,
      cy: p.y,
      fill: `rgba(${shape.rgb.join(',')}, 1)`,
      'data-key': shape.colorKey,
      'data-type': 'vertex',
      'data-index': index,
    })
  }

  drawLine(shape: Shape) {
    let el = this.elements.get(shape.colorKey)
    if (!el) {
      el = this.canvas.line()
      this.elements.set(shape.colorKey, el)
    }
    const points = []
    shape.points.foreach((i, p) => {
      const pos = p.add(this.originPoint).scale(this.scale)
      points.push(`${pos.x},${pos.y}`)
    });
    (<Line>el).plot(points.join(',')).attr({
      stroke: shape.lineColor,
      'stroke-width': 1,
      fill: 'none',
      'data-key': shape.colorKey,
    }).plot()
  }

  drawReact(shape: Shape) {
    let el = this.elements.get(shape.colorKey)
    if(!el) {
      el = this.canvas.rect()
      this.elements.set(shape.colorKey, el)
    }
    const p0 = shape.points.get(0).add(this.originPoint).scale(this.scale)
    const p1 = shape.points.get(1).add(this.originPoint).scale(this.scale)
    const x = (p0.x < p1.x ? p0.x : p1.x)
    const y = (p0.y < p1.y ? p0.y : p1.y)
    ;(<Rect>el)
      .width(Math.abs(p1.x - p0.x))
      .height(Math.abs(p1.y - p0.y))
      .attr({
        x,
        y,
        stroke: shape.lineColor,
        'stroke-width': 1,
        fill: `rgba(${shape.rgb.join(',')}, 0.1)`,
      'data-key': shape.colorKey,
      })
  }

  drawCircle(shape: Shape) {
    let el = this.elements.get(shape.colorKey)
    if (!el) {
      el = this.canvas.circle()
      this.elements.set(shape.colorKey, el)
    }
    const p0 = shape.points.get(0).add(this.originPoint).scale(this.scale)
    const p1 = shape.points.get(1).add(this.originPoint).scale(this.scale)
    const d = getDistance(p1, p0)
    ;(<Circle>el).size(d).attr({
      cx: (p0.x + p1.x) / 2,
      cy: (p0.y + p1.y) / 2,
      stroke: shape.lineColor,
      'stroke-width': 1,
      fill: `rgba(${shape.rgb.join(',')}, 0.1)`,
      'data-key': shape.colorKey,
    })
  }

  drawPolygon(shape: Shape) {
    let el = this.elements.get(shape.colorKey)
    if (!el) {
      el = shape.isClose() ? this.canvas.polygon() : this.canvas.polyline()
      this.elements.set(shape.colorKey, el)
    }
    const points = []
    shape.points.foreach((i, p) => {
      const pos = p.add(this.originPoint).scale(this.scale)
      points.push(`${pos.x},${pos.y}`)
    })
    ;(<Polygon | Polyline>el).plot(points.join(' '))
    ;(<Polygon | Polyline>el).attr({
      stroke: shape.lineColor,
      'stroke-width': 1,
      fill: `rgba(${shape.rgb.join(',')}, 0.1)`,
      'data-key': shape.colorKey,
    })
  }

  removeElement(shape: Shape) {
    this.elements.get(shape.colorKey)?.remove()
    this.vertexs.get(shape.colorKey)?.forEach(el => {
      el.remove()
    })
    this.elements.del(shape.colorKey)
    this.vertexs.del(shape.colorKey)
  }

  clean () {
    this.labelImage = null
    this.shapes = new HashTable<Shape>()
    this.elements = new HashTable<ShapeElement>()
    this.vertexs = new HashTable<Circle[]>()
    this.canvas.clear()
  }
}