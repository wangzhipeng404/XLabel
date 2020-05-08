class HashValue<T>{
  key: string;
  value: T;
  index: number;
}

export class HashTable<T> {
  private items: { [key: string]: HashValue<T> };
  private itemList: Array<T>;
  constructor() {
    this.items = {};
    this.itemList = [];
  }

  set(key: string, value: T): void {
    var vl = new HashValue<T>();
    vl.key = key;
    vl.value = value;
    var index = this.itemList.length;
    if (this.has(key)) {
      index = this.items[key].index;
    }
    vl.index = index;
    this.itemList[index] = value;
    this.items[key] = vl;
  }

  del(key: string): void {
    if (this.has(key)) {
      var index = this.items[key].index;
      if (index > -1) {
        this.itemList.splice(index, 1);
      }
      delete this.items[key];
      this.resetIndex();
    }
  }

  resetIndex(): void {

    this.foreach((k, v: T) => {
      var index = this.itemList.indexOf(v);
      this.items[k].index = index;
    });
  }

  has(key: string): boolean {
    return key in this.items;
  }

  get(key: string): T {
    if (this.has(key)) {
      return this.items[key].value;
    }
    return null;
  }

  count(): number {
    return this.itemList.length;
  }

  all(): Array<T> {
    return this.itemList;
  }

  first() {
    return this.itemList[0];
  }

  last() {
    return this.itemList[this.itemList.length - 1];
  }

  getByIndex(index: number): T {
    return this.itemList[index];
  }

  //遍历 扩展
  foreach(callback: (key: string, value: T) => void) {
    for (var key in this.items) {
      callback(key, this.items[key].value);
    }
  }

  //获取index
  indexOf(key) {
    if (this.has(key)) {
      return this.items[key].index;
    }
  }

  //插入
  insertAt(index: number, value: T, key: string) {
    this.itemList.splice(index, 0, value);
    var hashV = new HashValue<T>();
    hashV.index = index;
    hashV.key = key;
    hashV.value = value;
    this.items[key] = hashV;
    this.resetIndex();
  }

  sort(callback: Function) {
    this.itemList.sort((a: T, b: T) => {
      return callback(a, b);
    });
  }
}