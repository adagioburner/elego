const BOARD_SIZE = 8;

class DistanceMap {
  constructor() {
    this.data = new Int32Array(BOARD_SIZE * BOARD_SIZE);
  }
  get(x, y) {
    return this.data[y * BOARD_SIZE + x];
  }
  set(x, y, value) {
    this.data[y * BOARD_SIZE + x] = value;
  }
  fill(value) {
    this.data.fill(value);
  }
}

function test2D() {
  const start = performance.now();
  let total = 0;
  for (let i = 0; i < 100000; i++) {
    const arr = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(999999));
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        arr[y][x] = i;
        total += arr[y][x];
      }
    }
  }
  console.log('2D Array time:', performance.now() - start, 'ms', total);
}

function test1DWrapped() {
  const start = performance.now();
  const map = new DistanceMap();
  let total = 0;
  for (let i = 0; i < 100000; i++) {
    map.fill(999999);
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        map.set(x, y, i);
        total += map.get(x, y);
      }
    }
  }
  console.log('1D Wrapped time:', performance.now() - start, 'ms', total);
}

test2D();
test1DWrapped();
