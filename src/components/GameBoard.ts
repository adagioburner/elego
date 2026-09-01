import { Player } from '../interfaces/Player';

export const BOARD_SIZE = 8;

export class GameBoard {
  private data: Int32Array;

  constructor(data?: Int32Array) {
    if (data) {
      this.data = new Int32Array(data);
    } else {
      this.data = new Int32Array(BOARD_SIZE * BOARD_SIZE);
      this.data.fill(Player.None);
    }
  }

  get(x: number, y: number): Player {
    return this.data[y * BOARD_SIZE + x] as Player;
  }

  set(x: number, y: number, player: Player): void {
    this.data[y * BOARD_SIZE + x] = player;
  }

  clone(): GameBoard {
    return new GameBoard(this.data);
  }
}
