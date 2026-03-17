export class SpatialHash {
  private cs: number;
  private cells: Map<string, any[]>;

  constructor(cellSize: number) {
    this.cs = cellSize;
    this.cells = new Map();
  }

  key(x: number, y: number): string {
    return `${Math.floor(x / this.cs)},${Math.floor(y / this.cs)}`;
  }

  insert(x: number, y: number, obj: any) {
    const k = this.key(x, y);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k)!.push(obj);
  }

  query(x: number, y: number, r: number): any[] {
    const res: any[] = [];
    const mn = Math.floor((x - r) / this.cs), mx = Math.floor((x + r) / this.cs);
    const my = Math.floor((y - r) / this.cs), my2 = Math.floor((y + r) / this.cs);
    for (let cx = mn; cx <= mx; cx++) {
      for (let cy = my; cy <= my2; cy++) {
        const k = `${cx},${cy}`;
        if (this.cells.has(k)) res.push(...this.cells.get(k)!);
      }
    }
    return res;
  }

  clear() {
    this.cells.clear();
  }
}
