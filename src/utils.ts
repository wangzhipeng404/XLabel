/* eslint-disable */
import { HashTable } from './hashTable';
import { List } from './list';
import { Point } from './point';

const baseColors: string[] = [
  'FF008C',
  '8E83FF',
  'CA00D2',
  '7B3CD5',
  '2FB7FF',
  'FF4747',
  'FF8E3B',
  'DBD821',
  '1FD121',
  '29F33F',
  '00C993',
  '4C7DFF',
  '3C49E6',
  'BA62FF',
  'FF4082',
  'F64B21',
  'FF7700',
  'BFDB17',
  '21E855',
  '0FCBE0',
];
let colorCount = 0;

export function resetColorCount() {
  console.log('resetcolorcount');
  colorCount = 0;
}

function getDeepRandomColor(color = ''): string {
  const base = '0123401abc012780';
  let randColor = color + base[Math.floor(Math.random() * 16)];
  if (colorCount < baseColors.length - 1) {
    randColor = baseColors[colorCount];
    colorCount += 1;
  } else {
    while (randColor.length < 6) {
      randColor = getDeepRandomColor(randColor);
    }
  }
  return randColor;
}

function getRandomColor() {
  let randColor = ((Math.random() * 0xffffff) << 0).toString(16);
  while (randColor.length < 6) {
    randColor = '0' + randColor;
  }
  return randColor;
}

export function getUniqueColorKey(elements: HashTable<any>, deep: boolean = false) {
  var key = '';
  while (true) {
    key = deep ? getDeepRandomColor() : getRandomColor();
    if (key && !elements.has(`#${key}`)) {
      break;
    }
  }
  return `#${key}`;
}

export function hexToRgbA(hex: string): [number, number, number] {
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c.x, c.x, c.y, c.y, c[2], c[2]];
    }
    c = '0x' + c.join('');
    return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  }
  console.log(`bad hex ${hex}`);
  return [255, 255, 255];
}

export function abgleCacul(pointA: Point, pointB: Point, pointC: Point): number {
  const lengthAB = Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2));
  const lengthAC = Math.sqrt(Math.pow(pointA.x - pointC.x, 2) + Math.pow(pointA.y - pointC.y, 2));
  const lengthBC = Math.sqrt(Math.pow(pointB.x - pointC.x, 2) + Math.pow(pointB.y - pointC.y, 2));
  const cosA =
    (Math.pow(lengthAB, 2) + Math.pow(lengthAC, 2) - Math.pow(lengthBC, 2)) /
    (2 * lengthAB * lengthAC);
  const angleA = Math.round((Math.acos(cosA) * 180) / Math.PI);
  return angleA;
}

export function isInPolygon(checkPoint: Point, polygonPoints: List<Point>): boolean {
  var counter = 0;
  var i;
  var xinters;
  var p1, p2;
  var pointCount = polygonPoints.length();
  p1 = polygonPoints.get(0);

  for (i = 1; i <= pointCount; i++) {
    p2 = polygonPoints.get(i % pointCount);
    if (checkPoint.x > Math.min(p1.x, p2.x) && checkPoint.x <= Math.max(p1.x, p2.x)) {
      if (checkPoint.y <= Math.max(p1.y, p2.y)) {
        if (p1.x != p2.x) {
          xinters = ((checkPoint.x - p1.x) * (p2.y - p1.y)) / (p2.x - p1.x) + p1.y;
          if (p1.y == p2.y || checkPoint.y <= xinters) {
            counter++;
          }
        }
      }
    }
    p1 = p2;
  }
  if (counter % 2 == 0) {
    return false;
  } else {
    return true;
  }
}

export function getDistance(p1: Point, p2: Point): number {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

export function closeEnough(p1: Point, p2: Point, errorRange: number = 1): boolean {
  const dis = getDistance(p1, p2);
  return dis < errorRange;
}

export function getElementLeft(element: HTMLElement) {
  let actualLeft = element.offsetLeft;
  let current = element.offsetParent as HTMLElement;
  while (current !== null) {
    actualLeft += current.offsetLeft;
    current = current.offsetParent as HTMLElement;
  }
  return actualLeft;
}

export function getElementTop(element: HTMLElement) {
  let actualTop = element.offsetTop;
  let current = element.offsetParent as HTMLElement;

  while (current !== null) {
    actualTop += current.offsetTop;
    current = current.offsetParent as HTMLElement;
  }

  return actualTop;
}
