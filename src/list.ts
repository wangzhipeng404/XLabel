export class List<T> {
  private items: Array<T>;

  private checkIndex(index): boolean {
    return !(index < 0 || isNaN(index) || index >= this.items.length);
  }
  constructor() {
    this.items = new Array<T>();
  }

  length(): number {
    return this.items.length;
  }

  add(value: T): void {
    this.items.push(value);
  }
  addList(valueList: List<T>) {
    for (var i = 0; i < valueList.length(); i++) {
      var value = valueList.get(i);
      this.items.push(value);
    }
  }
  pop(): T {
    return this.items.pop();
  }

  shift() {
    this.items.shift();
  }

  remove(index: number): void {
    if (this.checkIndex(index)) {
      this.items.splice(index, 1);

    }
  }
  /**
   * 從指定索引處開始刪除指定個數的元素
   * @param from 
   * @param count 
   */
  removeMany(from: number, count: number) {

    if (this.checkIndex(from)) {
      this.items.splice(from, count);
    }
  }

  clear(): void {
    this.items = [];
  }

  contains(value: T): boolean {
    for (var i in this.items) {
      return value == this.items[i];
    }
    return false;
  }

  indexOf(value: T): number {
    return this.items.indexOf(value);
  }

  insert(index: number, value: T) {
    //this.checkIndex(index) && this.items.splice(index , 0, value);
    this.items.splice(index, 0, value);
  }

  get(index: number): T {
    return this.items[index];
  }
  set(index, value: T) {
    this.items[index] = value;
  }
  all(): Array<T> {
    return this.items;
  }
  foreach(callback: (i: number, item: T) => any) {
    var len = this.items.length;
    for (var i = 0; i < len; i++) {
      if (callback(i, this.items[i]) === false) break;
    }
  }
  reverseForeach(callback) {
    var len = this.items.length;
    for (var i = len - 1; i >= 0; i--) {
      if (callback(i, this.items[i]) === false) break;
    }
  }
  sort(callback: Function) {
    this.items.sort((a: T, b: T) => { return callback(a, b); });
  }
}