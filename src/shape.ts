/* eslint-disable no-underscore-dangle */
import { List } from './list';
import { Point } from './point';
import { closeEnough } from './utils';
import { AnyObject } from './typings';

export type ShapeType = 'rectangle' | 'polygon' | 'line' | 'linestrip' | 'point' | 'circle';

export class Shape {
  private _close: boolean = false;

  shapeType: ShapeType;

  labelName: string;

  labelId: string | number;

  shapeId: string | number | null | undefined;

  colorKey: string;

  points: List<Point>;

  rgb: [number, number, number] = [0, 255, 0];

  otherData: AnyObject;

  show: boolean = true;

  active: boolean = false;

  constructor(colorKey: string, shapeType: ShapeType = 'rectangle', otherData: AnyObject = {}) {
    this.colorKey = colorKey;
    this.shapeType = shapeType;
    this.otherData = otherData;
    this.labelName = otherData.labelName;
    this.labelId = otherData.labelId;
    this.shapeId = otherData.skuId;
    this.points = new List<Point>();
  }

  setShapeType(type: ShapeType) {
    this.shapeType = type;
  }

  setOtherData(data: AnyObject) {
    this.labelId = data.labelId;
    this.labelName = data.labelName;
    if (data.skuId) {
      this.shapeId = data.skuId;
    }
    this.otherData = data;
  }

  addPoint(point: Point) {
    if (this.points.length() > 0 && closeEnough(this.points.get(0), point, 5)) {
      this.close();
    } else {
      this.points.add(point);
    }
  }

  close() {
    this._close = true;
    /* if (this.shapeType === 'polygon') {
      this.removeElement()
    } */
  }

  isClose() {
    return this._close;
  }

  setOpen() {
    this._close = false;
    /* if (this.shapeType === 'polygon') {
      this.removeElement()
    } */
  }

  copy(colorKey: string, omitId: boolean = false, scale: number = 1) {
    const copyed = new Shape(colorKey, this.shapeType, this.otherData);
    copyed.active = this.active;
    copyed._close = this._close;
    copyed.points.addList(this.points);
    if (omitId) {
      copyed.shapeId = null;
      copyed.otherData.skuId = null;
      copyed.active = false;
      copyed.points.foreach((index, point) => {
        copyed.points.set(index, point.add(new Point(10, 10)));
      });
    }
    return copyed;
  }
}
