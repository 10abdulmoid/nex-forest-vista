import { evaluateGrid, type CellStyle } from "./excel-engine";

type Req = {
  seq: number;
  grid: string[][];
  showFormulas: boolean;
  styles: Record<string, CellStyle>;
};

self.onmessage = (event: MessageEvent<Req>) => {
  const { seq, grid, showFormulas, styles } = event.data;
  const display = evaluateGrid(grid, showFormulas, styles);
  self.postMessage({ seq, display });
};
