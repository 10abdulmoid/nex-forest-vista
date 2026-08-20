import { evaluateGrid, type CellStyle } from "./excel-engine";

type DisplayHandler = (seq: number, display: string[][]) => void;

export function createFormulaClient(onDisplay: DisplayHandler) {
  let worker: Worker | null = null;
  let seq = 0;
  try {
    if (typeof Worker !== "undefined") {
      worker = new Worker(new URL("./formula.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<{ seq: number; display: string[][] }>) => {
        onDisplay(event.data.seq, event.data.display);
      };
    }
  } catch {
    worker = null;
  }

  const request = (grid: string[][], showFormulas: boolean, styles: Record<string, CellStyle>) => {
    seq += 1;
    const id = seq;
    if (worker) {
      worker.postMessage({ seq: id, grid, showFormulas, styles });
      return id;
    }
    const display = evaluateGrid(grid, showFormulas, styles);
    queueMicrotask(() => onDisplay(id, display));
    return id;
  };

  const dispose = () => {
    worker?.terminate();
    worker = null;
  };

  return { request, dispose, get seq() { return seq; } };
}
