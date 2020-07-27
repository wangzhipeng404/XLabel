import { SVG, Svg, Image, Circle, Rect, Polygon, Polyline, Line } from '@svgdotjs/svg.js';
import { Keyboard, stringifyKey, createShortcuts, filterInputEvent } from './keyboardManager';
import defaultConfig, { Config, changeType } from './config/config';
import { HashTable } from './hashTable';
import { Shape, ShapeType } from './shape';
import { Point } from './point';
import { List } from './list';
import { getUniqueColorKey, closeEnough, getDistance, hexToRgbA } from './utils';
import { AnyObject } from './typings.d'

interface Dataset {
  key?: string;
  type?: 'vertex';
  index?: number;
  [key: string]: any;
}

interface MouseEV extends MouseEvent {
  target: SVGAElement;
  dataset: Dataset;
}

export type LogType = 'ADD' | 'REMOVE' | 'EDIT' | 'SELECT' | 'UNSELECT' | 'SETSELECT';
export interface LogItem {
  type: LogType;
  target: Shape[];
}

export interface GetLabelData {
  imageHeight: number;
  imageWidth: number;
  scale: number;
  labels: Shape[];
}

export interface GetLogData {
  imageHeight: number;
  imageWidth: number;
  scale: number;
  logs: LogItem[];
}

type ShapeElement = Rect | Circle | Polygon | Polyline | Line;

interface LabelColor {
  hex: string;
  rgb: number[];
}

export class XLabel {
  private canvas: Svg;

  continuousMode: boolean = false;

  config: Config;

  shapes: HashTable<Shape>;

  createMode: ShapeType = 'rectangle';

  mode: 'CREATE' | 'EDIT' | 'MOVE' | 'SELECT' | 'DRAG' | 'COPY' = 'CREATE';

  mousePressed: boolean = false;

  current?: Shape;

  pressPoint: Point = new Point(0, 0);

  prevPoint: Point = new Point(0, 0);

  prevMovePoint: Point = new Point(0, 0);

  line: Shape;

  canvasWidth: number = 0;

  canvasHeight: number = 0;

  boundingLeft: number = 0;

  boundingTop: number = 0;

  offsetLeft: number = 0;

  offsetTop: number = 0;

  originPoint: Point;

  originOffset: Point = new Point(0, 0);

  centerPoint: Point;

  scale: number = 1;

  selectedDataset: Dataset = {};

  labelImagePath?: string;

  labelImage?: Image;

  labelImageWidth: number = 0;

  labelImageHeight: number = 0;

  pixmapWidth: number = 0;

  pixmapHeight: number = 0;

  elements: HashTable<ShapeElement> = new HashTable<ShapeElement>();

  vertexs: HashTable<Circle[]> = new HashTable<Circle[]>();

  colors: HashTable<string | number> = new HashTable<string | number>();

  labelColor: HashTable<LabelColor> = new HashTable<LabelColor>();

  labelInfo: AnyObject = {};

  logEnable: boolean = true;

  logType: LogType = 'ADD';

  logs: LogItem[] = [];

  keydownHandler: (event: KeyboardEvent) => void = () => {};

  constructor($container: HTMLElement = document.body, conf: Partial<Config> = {}) {
    const $parent = $container;
    const bounding = $parent.getBoundingClientRect();
    this.config = { ...defaultConfig, ...conf };
    this.canvas = SVG().addTo($parent).size('100%', '100%').id('xlabelsvg');
    this.shapes = new HashTable<Shape>();
    this.line = new Shape(getUniqueColorKey(this.shapes), this.createMode);
    this.originPoint = new Point(0, 0);
    this.canvasWidth = bounding.width;
    this.canvasHeight = bounding.height;
    this.boundingLeft = bounding.left;
    this.boundingTop = bounding.top;
    this.offsetLeft = bounding.left - document.documentElement.scrollLeft;
    this.offsetTop = bounding.top - document.documentElement.scrollTop;
    this.pixmapWidth = this.canvasWidth;
    this.pixmapHeight = this.canvasHeight;
    this.centerPoint = new Point(this.canvasWidth, this.canvasHeight).scale(0.5);
    this.canvas.mousedown((e: any) => this.mousePressEvent(e));
    this.canvas.mousemove((e: any) => this.mouseMoveEvent(e));
    this.canvas.mouseup((e: any) => this.mouseUpEvent(e));
    this.canvas.dblclick(() => this.mousedoubleClick());

    $parent.oncontextmenu = (ev: MouseEvent) => {
      ev.preventDefault();
    };

    $parent.addEventListener(
      'mousewheel',
      (e: any) => {
        if (e.ctrlKey) {
          this.zoom(e.deltaY);
          e.returnValue = false;
        }
      },
      { passive: false },
    );

    document.onscroll = () => {
      console.log('scroll');
      this.offsetLeft = this.boundingLeft - document.documentElement.scrollLeft;
      this.offsetTop = this.boundingTop - document.documentElement.scrollTop;
    };
    window.onresize = () => {
      console.log('resizel');
      const { left, top } = $parent.getBoundingClientRect();
      this.boundingLeft = left;
      this.boundingTop = top;
      this.offsetLeft = this.boundingLeft - document.documentElement.scrollLeft;
      this.offsetTop = this.boundingTop - document.documentElement.scrollTop;
    };
    this.registerShutcuts();
  }

  // eslint-disable-next-line class-methods-use-this
  destdory() {
    window.onresize = null;
    document.onscroll = null;
    window.removeEventListener('keydown', this.keydownHandler);
  }

  drawing() {
    return this.mode === 'CREATE';
  }

  editing() {
    return this.mode === 'EDIT';
  }

  moving() {
    return this.mode === 'MOVE';
  }

  draging() {
    return this.mode === 'DRAG';
  }

  selecting() {
    return this.mode === 'SELECT';
  }

  copying() {
    return this.mode === 'COPY';
  }

  continuous() {
    return this.continuousMode;
  }

  registerShutcuts() {
    const keyboard = new Keyboard();
    const shortcutContinuous = stringifyKey('ctrl', 'r');
    const shortcutRectangle = stringifyKey('ctrl', 'f');
    const shortcutpolyon = stringifyKey('ctrl', 'g');
    const shortcutCircle = stringifyKey('ctrl', 'h');
    const shortcutZoomIn = stringifyKey('ctrl', 'up');
    const shortcutZoomOut = stringifyKey('ctrl', 'down');
    const shortcutDel = stringifyKey('ctrl', 'd');
    const shortcutUndo = stringifyKey('ctrl', 'z');
    const shortcutEdit = stringifyKey('ctrl', 'e');
    const shortcutUnselectAll = stringifyKey('ctrl', 'h');
    const shortcutUp = stringifyKey('w');
    const shortcutDown = stringifyKey('s');
    const shortcutLeft = stringifyKey('a');
    const shortcutRight = stringifyKey('d');
    keyboard.addListener(
      createShortcuts({
        [shortcutRectangle]: (e) => {
          e.preventDefault();
          this.setCreateMode('rectangle');
          this.onChange('createMode');
        },
        [shortcutCircle]: (e) => {
          e.preventDefault();
          this.setCreateMode('circle');
          this.onChange('createMode');
        },
        [shortcutpolyon]: (e) => {
          e.preventDefault();
          this.setCreateMode('polygon');
          this.setContinuousMode(false);
          this.onChange('createMode');
        },
        [shortcutContinuous]: (e) => {
          e.preventDefault();
          this.continuousMode = !this.continuousMode;
        },
        [shortcutZoomIn]: (e) => {
          e.preventDefault();
          this.zoom(-1);
        },
        [shortcutZoomOut]: (e) => {
          e.preventDefault();
          this.zoom(1);
        },
        [shortcutDel]: (e) => {
          e.preventDefault();
          const keys: string[] = [];
          this.shapes.foreach((key, shape) => {
            if (shape.active) {
              keys.push(key);
            }
          });
          this.removeShapes(keys);
        },
        [shortcutUndo]: (e) => {
          e.preventDefault();
          this.undo();
        },
        [shortcutEdit]: (e) => {
          e.preventDefault();
          this.onChange('editActive');
        },
        [shortcutUnselectAll]: (e) => {
          e.preventDefault();
          this.setActiveShapes([]);
        },
        [shortcutUp]: filterInputEvent((e) => {
          e.preventDefault();
          this.originOffset = this.originOffset.add(new Point(0, 10));
          this.originPoint = this.originPoint.add(new Point(0, 10));
          this.reRender();
        }),
        [shortcutDown]: filterInputEvent((e) => {
          e.preventDefault();
          this.originOffset = this.originOffset.add(new Point(0, -10));
          this.originPoint = this.originPoint.add(new Point(0, -10));
          this.reRender();
        }),
        [shortcutLeft]: filterInputEvent((e) => {
          e.preventDefault();
          this.originOffset = this.originOffset.add(new Point(10, 0));
          this.originPoint = this.originPoint.add(new Point(10, 0));
          this.reRender();
        }),
        [shortcutRight]: filterInputEvent((e) => {
          e.preventDefault();
          this.originOffset = this.originOffset.add(new Point(-10, 0));
          this.originPoint = this.originPoint.add(new Point(-10, 0));
          this.reRender();
        }),
      }),
    );
    const handler = keyboard.getHandler();
    this.keydownHandler = handler;
    window.addEventListener('keydown', handler, false);
  }

  setContinuousMode(flag: boolean) {
    this.continuousMode = flag;
  }

  setLabelInfo(labelInfo: AnyObject) {
    this.labelInfo = labelInfo;
    this.line.setOtherData(labelInfo);
  }

  setImg(path: string, callback?: (scale: number, instance: XLabel) => void) {
    if (!path) return;
    this.onChange('loading');
    this.clean();
    this.labelImagePath = path;
    const img = document.createElement('img');
    img.src = path;
    if (img.complete) {
      this.labelImageWidth = img.width;
      this.labelImageHeight = img.height;
      this.pixmapHeight = img.height < this.canvasHeight ? img.height : this.canvasHeight - 30;
      this.pixmapWidth = img.width * (this.pixmapHeight / this.labelImageHeight);
      this.originPoint = new Point(
        this.canvasWidth - this.pixmapWidth,
        this.canvasHeight - this.pixmapHeight,
      ).scale(0.5);
      // this.pixmapWidth = this.canvasWidth;
      // this.pixmapHeight = img.height * (this.canvasWidth / img.width);
      this.reRender();
      if (callback) {
        callback(this.pixmapHeight / img.height, this);
      }
    } else {
      img.onload = () => {
        this.labelImageWidth = img.width;
        this.labelImageHeight = img.height;
        this.pixmapHeight = img.height < this.canvasHeight ? img.height : this.canvasHeight - 30;
        this.pixmapWidth = img.width * (this.pixmapHeight / this.labelImageHeight);
        this.originPoint = new Point(
          this.canvasWidth - this.pixmapWidth,
          this.canvasHeight - this.pixmapHeight,
        ).scale(0.5);
        // this.pixmapWidth = this.canvasWidth;
        // this.pixmapHeight = img.height * (this.canvasWidth / img.width);
        this.centerPoint = new Point(this.pixmapWidth, this.pixmapHeight).scale(0.5);
        this.reRender();
        if (callback) {
          callback(this.pixmapHeight / img.height, this);
        }
      };
    }
    this.onChange('loaded');
  }

  setConfig(conf: Partial<Config>) {
    this.config = { ...this.config, ...conf };
    this.reRender();
  }

  getConfig() {
    return this.config;
  }

  setCreateMode(type: ShapeType) {
    this.createMode = type;
    this.line.shapeType = type;
  }

  setData(data: HashTable<Shape>) {
    this.shapes = data;
    this.reRender();
    this.onChange('shapes');
  }

  getData(): GetLabelData {
    return {
      imageWidth: this.labelImageWidth,
      imageHeight: this.labelImageHeight,
      scale: this.labelImageHeight / this.pixmapHeight,
      labels: this.shapes.all(),
    };
  }

  getLog(): GetLogData {
    const needType: LogType[] = ['ADD', 'EDIT', 'REMOVE'];
    return {
      imageWidth: this.labelImageWidth,
      imageHeight: this.labelImageHeight,
      scale: this.labelImageHeight / this.pixmapHeight,
      logs: this.logs.filter((log) => needType.includes(log.type)),
    };
  }

  zoom(deltaY: number) {
    if (deltaY < 0) {
      if (this.scale >= this.config.zoomMax) return;
      this.scale += 0.1;
      // this.originPoint = this.centerPoint.scale(1 - this.scale);
    } else {
      if (this.scale <= this.config.zoomMin) return;
      this.scale -= 0.1;
      // this.originPoint = this.centerPoint.scale(1 - this.scale);
    }
    this.originPoint = new Point(
      this.canvasWidth - this.pixmapWidth * this.scale,
      this.canvasHeight - this.pixmapHeight * this.scale,
    )
      .scale(0.5)
      .unScale(this.scale)
      .add(this.originOffset);
    this.reRender();
  }

  mousePressEvent(ev: MouseEV) {
    if (!this.labelImagePath) return;
    if (!this.config.editable) return;
    const pos = this.transformPos(ev);
    this.pressPoint = pos;
    if (this.outOfPixmap(pos)) {
      if (this.drawing() && this.current?.shapeType === 'rectangle') {
        this.createShape(this.line.points.get(1));
      }
      return;
    }
    const { dataset } = ev.target;
    this.mousePressed = true;
    if (ev.button === 1) return;
    if (ev.button === 2) {
      // this.continuousMode = false;
      this.line.points.clear();
      if (this.createMode === 'polygon' && this.current) {
        this.removeElement(this.current);
      }
      this.current = undefined;
      this.finalise();
      this.onChange('continuousMode');
      return;
    }
    // 点击矩形框或点 移动或编辑
    if (!this.current && dataset.key) {
      this.selectedDataset = dataset;
      this.current = this.shapes.get(dataset.key);
      this.prevPoint = pos;
      this.prevMovePoint = pos;
      if (dataset.type === 'vertex') {
        this.mode = 'EDIT';
        this.logType = 'EDIT';
      } else {
        this.mode = 'SELECT';
        if (ev.ctrlKey) {
          this.mode = 'COPY';
          this.current = this.current?.copy(getUniqueColorKey(this.shapes), true);
          this.logType = 'ADD';
          if (this.current) {
            this.paint(this.current);
          }
        }
      }
      return;
    }
    // 移动背景
    if (ev.ctrlKey) {
      this.mode = 'DRAG';
      this.prevPoint = pos;
      this.prevMovePoint = new Point(ev.x, ev.y);
      return;
    }
    if (this.drawing()) {
      this.logType = 'ADD';
      this.createShape(pos);
    } else {
      this.mode = 'CREATE';
      this.selectedDataset = {};
      this.finalise();
    }
  }

  mouseMoveEvent(ev: MouseEV) {
    if (!this.labelImagePath) return;
    const pos = this.transformPos(ev);
    if (this.draging() && this.mousePressed) {
      this.moveLabelImage(new Point(ev.x, ev.y));
      return;
    }
    if (this.drawing()) {
      if (!this.current) return;
      if (this.outOfPixmap(pos)) return;
      if (['polygon', 'linestrip'].includes(this.createMode)) {
        this.line.points.set(0, this.current.points.last() as Point);
        this.line.points.set(1, pos);
      } else if (['rectangle', 'circle', 'line'].includes(this.createMode)) {
        this.line.points.set(0, this.current.points.get(0));
        this.line.points.set(1, pos);
        // this.line.close()
      } else if (this.createMode === 'point') {
        this.line.points.set(0, this.current.points.get(0));
        // this.line.close()
      }
      this.repaint();
    }
    if ((this.selecting() || this.copying()) && this.mousePressed) {
      this.moveShape(pos);
    }
    if (this.editing()) {
      this.editShape(pos);
    }
  }

  mousedoubleClick() {
    if (this.current && this.drawing() && this.createMode === 'polygon') {
      if (this.current.points.length() > 4) {
        this.current.points.removeMany(this.current.points.length() - 2, 2);
        this.finalise();
      }
    }
  }

  mouseUpEvent(ev: MouseEV) {
    if (!this.labelImagePath) return;
    this.mousePressed = false;
    const pos = this.transformPos(ev);
    if (this.copying()) {
      this.finalise();
      this.mode = 'CREATE';
      this.logType = 'ADD';
      this.selectedDataset = {};
      return;
    }
    if (pos.x === this.pressPoint.x && pos.y === this.pressPoint.y) {
      if (this.selecting() && this.current) {
        this.logType = this.current.active ? 'UNSELECT' : 'SELECT';
        this.addLog([this.current.copy(this.current.colorKey)]);
        this.current.active = !this.current.active;
        this.shapes.set(this.current.colorKey, this.current);
        this.onChange('shapes');
        this.reRender([this.current.colorKey]);
        this.mode = 'CREATE';
        this.current = undefined;
      }
      return;
    }
    if (this.selecting() || this.draging() || this.editing()) {
      this.finalise();
      this.mode = 'CREATE';
      this.logType = 'ADD';
      this.selectedDataset = {};
      return;
    }
    if (this.drawing() && this.createMode !== 'polygon' && !this.continuous()) {
      this.createShape(pos);
    }
  }

  createShape(pos: Point) {
    /* if (!this.labelInfo.labelName) {
      this.onError('请选择一个标签');
      return;
    } */
    if (this.current) {
      // 如果有当前图形则处理当前图形
      const tooClose = closeEnough(pos, this.current.points.get(0), 10);
      if (this.createMode === 'polygon') {
        if (this.current.points.length() === 1 && tooClose) {
          this.removeElement(this.current);
          this.current = undefined;
          this.finalise();
          return;
        }
        if (pos.isSamePoint(this.current.points.last())) {
          const len = this.current.points.length();
          if (len < 3) return;
        }
        this.current.addPoint(pos);
        this.line.points.set(0, this.current.points.last() as Point);
        if (this.current.isClose()) {
          this.finalise();
        }
      } else if (['rectangle', 'circle', 'line'].includes(this.createMode)) {
        if (tooClose) {
          this.current = undefined;
          this.finalise();
        } else {
          this.current.points.clear();
          this.current.points.addList(this.line.points);
          this.finalise();
        }
        if (this.createMode === 'rectangle' && this.continuousMode) {
          this.createShape(pos);
        }
      } else if (this.createMode === 'linestrip') {
        // to do pass
      }
    } else {
      // 没有就新建图形
      const colorKey = getUniqueColorKey(this.shapes);
      this.current = new Shape(colorKey, this.createMode, this.labelInfo);
      this.current.addPoint(pos);
      if (this.createMode === 'point') {
        this.finalise();
      } else {
        this.line.points.add(pos);
        this.line.points.add(pos);
        this.repaint();
      }
    }
  }

  moveShape(pos: Point) {
    const offsetX = pos.x - this.prevMovePoint.x;
    const offsetY = pos.y - this.prevMovePoint.y;
    let flag = true;
    const newPointList = new List<Point>();
    if (this.current) {
      this.current.points.foreach((i, p) => {
        const newPoint = new Point(p.x + offsetX, p.y + offsetY);
        newPointList.add(newPoint);
        if (this.outOfPixmap(newPoint)) {
          flag = false;
        }
      });
      if (!this.outOfPixmap(pos)) {
        this.prevMovePoint = pos;
      } else {
        this.mode = 'CREATE';
        this.selectedDataset = {};
        this.finalise();
      }
      if (flag) {
        this.current.points.clear();
        this.current.points.addList(newPointList);
        this.paint(this.current);
      }
    }
  }

  editShape(pos: Point) {
    if (this.outOfPixmap(pos)) return;
    const { index } = this.selectedDataset;
    if (this.current) {
      this.current.points.set(index as number, pos);
      this.paint(this.current);
    }
  }

  moveLabelImage(pos: Point) {
    const offsetPoint = pos.sub(this.prevMovePoint).unScale(this.scale);
    this.originOffset = this.originOffset.add(offsetPoint);
    this.originPoint = this.originPoint.add(offsetPoint);
    this.prevMovePoint = pos;
    this.reRender();
  }

  setActiveShapes(keys: string[]) {
    this.logType = 'SETSELECT';
    const logShape: Shape[] = [];
    this.shapes.foreach((i, s) => {
      const shape = this.shapes.get(s.colorKey);
      if (shape) {
        if (s.active === !keys.includes(s.colorKey)) {
          logShape.push(s.copy(i));
        }
        shape.active = keys.includes(s.colorKey);
        this.shapes.set(shape.colorKey, shape);
      }
    });
    this.onChange('shapes');
    this.reRender(logShape.map((l) => l.colorKey));
    this.addLog(logShape);
  }

  activeShapes(keys: string[]) {
    this.logType = 'SELECT';
    const shapes: Shape[] = [];
    keys.forEach((key) => {
      const shape = this.shapes.get(key);
      if (shape) {
        shapes.push(shape.copy(key));
        shape.active = true;
        this.shapes.set(key, shape);
      }
    });
    this.addLog(shapes);
    this.reRender(keys);
  }

  unactiveShapes(keys: string[]) {
    this.logType = 'UNSELECT';
    const shapes: Shape[] = [];
    keys.forEach((key) => {
      const shape = this.shapes.get(key);
      if (shape) {
        shapes.push(shape.copy(key));
        shape.active = false;
        this.shapes.set(key, shape);
      }
    });
    this.addLog(shapes);
    this.reRender(keys);
  }

  transformPos(ev: MouseEV) {
    const { clientX, clientY } = ev;
    const x = (clientX - this.offsetLeft) / this.scale;
    const y = (clientY - this.offsetTop) / this.scale;
    return new Point(x, y).sub(this.originPoint);
  }

  outOfPixmap(p: Point) {
    const pos = p;
    return pos.x < 1 || pos.x > this.pixmapWidth || pos.y < 1 || pos.y > this.pixmapHeight;
  }

  finalise() {
    if (this.current) {
      this.current.show = true;
      this.current.close();
      if (this.current.shapeType === 'polygon') {
        this.removeElement(this.current);
      }
      this.shapes.set(this.current.colorKey, this.current);
      this.paint(this.current);
      this.addLog([this.current.copy(this.current.colorKey)]);
    }
    this.removeElement(this.line);
    this.line.points.clear();
    this.current = undefined;
    this.onChange('shapes');
  }

  addShapes(shapes: Shape[]) {
    shapes.forEach((s) => {
      const newShape = s.copy(s.colorKey);
      this.shapes.set(newShape.colorKey, newShape);
    });
    this.reRender(shapes.map((s) => s.colorKey));
    this.onChange('shapes');
  }

  removeShapes(keys: string[]) {
    this.logType = 'REMOVE';
    const shapes: Shape[] = [];
    keys.forEach((key) => {
      const shape = this.shapes.get(key);
      if (shape) {
        shapes.push(shape.copy(key));
        this.removeElement(shape);
        this.shapes.del(key);
      }
    });
    this.addLog(shapes);
    this.onChange('shapes');
  }

  changeShapeData(keys: string[], data: AnyObject) {
    this.logType = 'EDIT';
    const shapes: Shape[] = [];
    keys.forEach((key) => {
      const shape = this.shapes.get(key);
      if (shape) {
        shapes.push(shape.copy(key));
        shape.active = false;
        shape.setOtherData(data);
        this.shapes.set(key, shape);
      }
      this.addLog(shapes);
      this.onChange('shapes');
      this.reRender(keys);
    });
  }

  undo() {
    this.logEnable = false;
    const log = this.logs.pop();
    if (log) {
      switch (log.type) {
        case 'ADD':
          this.removeShapes(log.target.map((s) => s.colorKey));
          break;
        case 'REMOVE':
          this.addShapes(log.target);
          break;
        case 'EDIT':
          log.target.forEach((shape) => {
            this.shapes.set(shape.colorKey, shape.copy(shape.colorKey));
          });
          this.reRender();
          this.onChange('shapes');
          break;
        case 'SELECT':
          this.unactiveShapes(log.target.map((s) => s.colorKey));
          break;
        case 'UNSELECT':
          this.activeShapes(log.target.map((s) => s.colorKey));
          break;
        case 'SETSELECT':
          log.target.forEach((shape) => {
            this.shapes.set(shape.colorKey, shape.copy(shape.colorKey));
          });
          break;
        default:
          break;
      }
    }
    this.logEnable = true;
  }

  addLog(shapes: Shape[]) {
    if (!this.logEnable) return;
    this.logs.push({
      type: this.logType,
      target: [...shapes],
    });
  }

  repaint() {
    if (this.createMode === 'polygon' && this.current) {
      this.paint(this.current);
    }
    this.paint(this.line);
  }

  reRender(keys?: string[]) {
    if (this.labelImagePath) {
      if (!this.labelImage) {
        this.labelImage = this.canvas.image().id('labelimage');
      }
      this.labelImage
        .load(this.labelImagePath)
        .size(this.pixmapWidth * this.scale, this.pixmapHeight * this.scale)
        .x(this.originPoint.x * this.scale)
        .y(this.originPoint.y * this.scale);
    }
    if (keys && keys.length > 0) {
      keys.forEach((key) => {
        const shape = this.shapes.get(key);
        if (shape) {
          this.paint(shape);
        }
      });
    } else {
      this.shapes.foreach((k, v) => {
        this.paint(v);
      });
    }
  }

  paint(shape: Shape) {
    if (shape.points.length() > 1) {
      if (!this.labelColor.get(`${shape.labelId}`)) {
        const colorKey = getUniqueColorKey(this.colors, true);
        this.colors.set(colorKey, shape.labelId);
        const rgb = hexToRgbA(colorKey);
        this.labelColor.set(`${shape.labelId}`, { hex: colorKey, rgb });
      }
      if (shape.shapeType === 'rectangle') {
        this.drawReact(shape);
      }
      if (shape.shapeType === 'circle') {
        this.drawCircle(shape);
      }
      if (shape.shapeType === 'polygon' || shape.shapeType === 'linestrip') {
        this.drawPolygon(shape);
      }
      if (shape.shapeType === 'line') {
        this.drawLine(shape);
      }
    }
    if (this.config.editable) {
      shape.points.foreach((i) => {
        this.drawVertex(shape, i);
      });
    }
  }

  drawVertex(shape: Shape, index: number) {
    const vts = this.vertexs.get(shape.colorKey) || [];
    if (!vts[index]) {
      vts[index] = this.canvas.circle();
      this.vertexs.set(shape.colorKey, vts);
    }
    if (shape.show) {
      vts[index].show();
    } else {
      vts[index].hide();
    }
    const p = shape.points.get(index).add(this.originPoint).scale(this.scale);
    const color = this.labelColor.get(`${shape.labelId}`);
    vts[index].size(10).attr({
      cx: p.x,
      cy: p.y,
      fill: shape.active ? this.config.activeColor : color?.hex || this.config.lineColor,
      'data-key': shape.colorKey,
      'data-type': 'vertex',
      'data-index': index,
      class: 'xlabel-vetrex',
    });
  }

  drawLine(shape: Shape) {
    let el = this.elements.get(shape.colorKey);
    if (!el) {
      el = this.canvas.line();
      this.elements.set(shape.colorKey, el);
    }
    if (shape.show) {
      el.show();
    } else {
      el.hide();
      return;
    }
    const points: string[] = [];
    shape.points.foreach((i, p) => {
      const pos = p.add(this.originPoint).scale(this.scale);
      points.push(`${pos.x},${pos.y}`);
    });
    const color = this.labelColor.get(`${shape.labelId}`);

    (<Line>el)
      .plot(points.join(','))
      .attr({
        stroke: shape.active ? this.config.activeColor : color?.hex || this.config.lineColor,
        'stroke-width': 1,
        fill: 'none',
        'data-key': shape.colorKey,
      })
      .plot();
  }

  drawReact(shape: Shape) {
    let el = this.elements.get(shape.colorKey);
    if (!el) {
      el = this.canvas.rect();
      this.elements.set(shape.colorKey, el);
    }
    if (shape.show) {
      el.show();
    } else {
      el.hide();
      return;
    }
    const p0 = shape.points.get(0).add(this.originPoint).scale(this.scale);
    const p1 = shape.points.get(1).add(this.originPoint).scale(this.scale);
    const x = p0.x < p1.x ? p0.x : p1.x;
    const y = p0.y < p1.y ? p0.y : p1.y;
    const color = this.labelColor.get(`${shape.labelId}`) || {
      hex: this.config.lineColor,
      rgb: this.config.fillColor,
    };

    (<Rect>el)
      .width(Math.abs(p1.x - p0.x))
      .height(Math.abs(p1.y - p0.y))
      .attr({
        x,
        y,
        stroke: shape.active ? this.config.activeColor : color.hex,
        'stroke-width': 1,
        fill: shape.active
          ? `rgba(${this.config.activeFillColor.join(',')}, ${this.config.fillOpacity + 0.5})`
          : `rgba(${color.rgb.join(',')}, ${this.config.fillOpacity})`,
        'data-key': shape.colorKey,
      });
  }

  drawCircle(shape: Shape) {
    let el = this.elements.get(shape.colorKey);
    if (!el) {
      el = this.canvas.circle();
      this.elements.set(shape.colorKey, el);
    }
    if (shape.show) {
      el.show();
    } else {
      el.hide();
      return;
    }
    const p0 = shape.points.get(0).add(this.originPoint).scale(this.scale);
    const p1 = shape.points.get(1).add(this.originPoint).scale(this.scale);
    const d = getDistance(p1, p0);
    const color = this.labelColor.get(`${shape.labelId}`) || {
      hex: this.config.lineColor,
      rgb: this.config.fillColor,
    };
    (<Circle>el).size(d).attr({
      cx: (p0.x + p1.x) / 2,
      cy: (p0.y + p1.y) / 2,
      stroke: shape.active ? this.config.activeColor : color.hex,
      'stroke-width': 1,
      fill: shape.active
        ? `rgba(${this.config.activeFillColor.join(',')}, ${this.config.fillOpacity + 0.5})`
        : `rgba(${color.rgb.join(',')}, ${this.config.fillOpacity})`,
      'data-key': shape.colorKey,
    });
  }

  drawPolygon(shape: Shape) {
    let el = this.elements.get(shape.colorKey);
    if (!el) {
      el = shape.isClose() ? this.canvas.polygon() : this.canvas.polyline();
      this.elements.set(shape.colorKey, el);
    }
    if (shape.show) {
      el.show();
    } else {
      el.hide();
      return;
    }
    const points: string[] = [];
    shape.points.foreach((i, p) => {
      const pos = p.add(this.originPoint).scale(this.scale);
      points.push(`${pos.x},${pos.y}`);
    });
    const color = this.labelColor.get(`${shape.labelId}`) || {
      hex: this.config.lineColor,
      rgb: this.config.fillColor,
    };
    (<Polygon | Polyline>el).plot(points.join(' '));
    (<Polygon | Polyline>el).attr({
      stroke: shape.active ? this.config.activeColor : color.hex,
      'stroke-width': 1,
      fill: shape.active
        ? `rgba(${this.config.activeFillColor.join(',')}, ${this.config.fillOpacity + 0.5})`
        : `rgba(${color.rgb.join(',')}, ${this.config.fillOpacity})`,
      'data-key': shape.colorKey,
    });
  }

  removeElement(shape: Shape) {
    const element = this.elements.get(shape.colorKey);
    if (element) {
      element.remove();
    }
    const vert = this.vertexs.get(shape.colorKey);
    if (vert) {
      vert.forEach((el) => {
        el.remove();
      });
    }
    this.elements.del(shape.colorKey);
    this.vertexs.del(shape.colorKey);
  }

  clean() {
    this.scale = 1;
    this.logs = [];
    this.originPoint = new Point(0, 0);
    this.originPoint = new Point(0, 0);
    this.labelImage = undefined;
    this.shapes = new HashTable<Shape>();
    this.elements = new HashTable<ShapeElement>();
    this.vertexs = new HashTable<Circle[]>();
    this.canvas.clear();
    this.onChange('shapes');
  }

  onChange(type: changeType) {
    if (this.config.onChange) {
      this.config.onChange(type, this);
    }
  }

  onError(message: string) {
    if (this.config.onError) {
      this.config.onError(message);
    }
  }
}
