const BOARD_SIZE = 8;
const INFINITY = 999999;

class DistanceMap {
  private data: Int32Array;
  constructor() {
    this.data = new Int32Array(BOARD_SIZE * BOARD_SIZE);
  }
  get(x: number, y: number): number {
    return this.data[y * BOARD_SIZE + x];
  }
  set(x: number, y: number, value: number): void {
    this.data[y * BOARD_SIZE + x] = value;
  }
  fill(value: number): void {
    this.data.fill(value);
  }
}

class Queue {
    private data: Int32Array;
    private head: number = 0;
    private tail: number = 0;
    constructor(capacity: number) {
        this.data = new Int32Array(capacity);
    }
    push(val: number) {
        this.data[this.tail++] = val;
    }
    pop(): number {
        return this.data[this.head++];
    }
    get length(): number {
        return this.tail - this.head;
    }
    clear() {
        this.head = 0;
        this.tail = 0;
    }
}

function test2D() {
  const start = performance.now();
  let total = 0;
  for (let i = 0; i < 100000; i++) {
    const arr: number[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(INFINITY));
    const q: number[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        arr[y][x] = i;
        q.push(i);
        total += arr[y][x];
      }
    }
  }
  console.log('2D Array + queue time:', performance.now() - start, 'ms', total);
}

function test1DWrapped() {
  const start = performance.now();
  const map = new DistanceMap();
  const q = new Queue(BOARD_SIZE * BOARD_SIZE);
  let total = 0;
  for (let i = 0; i < 100000; i++) {
    map.fill(INFINITY);
    q.clear();
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        map.set(x, y, i);
        q.push(i);
        total += map.get(x, y);
      }
    }
  }
  console.log('1D Wrapped + queue time:', performance.now() - start, 'ms', total);
}

test2D();
test1DWrapped();
