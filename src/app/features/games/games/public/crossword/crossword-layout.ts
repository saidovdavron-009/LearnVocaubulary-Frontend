export type Dir = 'across' | 'down';

/** Joylashtirilgan so'z: `index` — kirish ro'yxatidagi tartib raqami. */
export interface PlacedWord {
  index: number;
  answer: string;
  row: number;
  col: number;
  dir: Dir;
}

export interface CrosswordLayout {
  rows: number;
  cols: number;
  words: PlacedWord[];
}

const step = (dir: Dir) => (dir === 'across' ? [0, 1] : [1, 0]);

/**
 * So'zlarni kesishadigan qilib joylaydi (ochko'z algoritm, bir necha urinishdan eng yaxshisi).
 * Qoidalar: kesishgan katakda harf bir xil, so'zlar yonma-yon tegib turmaydi, to'r `maxSize` dan oshmaydi.
 */
export function buildLayout(answers: string[], maxWords: number, maxSize = 12, attempts = 40): CrosswordLayout {
  let best: CrosswordLayout = { rows: 0, cols: 0, words: [] };
  let bestArea = Infinity;

  for (let a = 0; a < attempts; a++) {
    const order = answers.map((answer, index) => ({ answer, index }));
    // Birinchi urinish — uzunlik bo'yicha, qolganlari — aralash (uzunroqlar oldinroq bo'lishga moyil).
    order.sort((x, y) => y.answer.length - x.answer.length + (a === 0 ? 0 : (Math.random() - 0.5) * 6));

    const result = attempt(order, maxWords, maxSize);
    const area = result.rows * result.cols;
    if (result.words.length > best.words.length || (result.words.length === best.words.length && area < bestArea)) {
      best = result;
      bestArea = area;
    }
  }
  return best;
}

function attempt(order: { answer: string; index: number }[], maxWords: number, maxSize: number): CrosswordLayout {
  const letters = new Map<string, string>();
  const dirs = new Map<string, Set<Dir>>();
  const placed: PlacedWord[] = [];
  let minR = 0, maxR = 0, minC = 0, maxC = 0;
  const key = (r: number, c: number) => `${r},${c}`;

  const put = (w: PlacedWord) => {
    const [dr, dc] = step(w.dir);
    for (let i = 0; i < w.answer.length; i++) {
      const k = key(w.row + dr * i, w.col + dc * i);
      letters.set(k, w.answer[i]);
      if (!dirs.has(k)) dirs.set(k, new Set());
      dirs.get(k)!.add(w.dir);
    }
    if (!placed.length) {
      minR = w.row; minC = w.col;
      maxR = w.row; maxC = w.col;
    }
    minR = Math.min(minR, w.row);
    minC = Math.min(minC, w.col);
    maxR = Math.max(maxR, w.row + dr * (w.answer.length - 1));
    maxC = Math.max(maxC, w.col + dc * (w.answer.length - 1));
    placed.push(w);
  };

  /** Joylab bo'lsa — kesishishlar soni, bo'lmasa -1. */
  const fit = (answer: string, row: number, col: number, dir: Dir): number => {
    const [dr, dc] = step(dir);
    const endR = row + dr * (answer.length - 1);
    const endC = col + dc * (answer.length - 1);
    if (Math.max(maxR, endR) - Math.min(minR, row) + 1 > maxSize) return -1;
    if (Math.max(maxC, endC) - Math.min(minC, col) + 1 > maxSize) return -1;
    // So'z oldidan va keyinidan katak bo'sh bo'lishi kerak.
    if (letters.has(key(row - dr, col - dc)) || letters.has(key(endR + dr, endC + dc))) return -1;

    let crossings = 0;
    for (let i = 0; i < answer.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const k = key(r, c);
      const existing = letters.get(k);
      if (existing) {
        if (existing !== answer[i] || dirs.get(k)!.has(dir)) return -1;
        crossings++;
      } else {
        // Yon tomonlarda harf bo'lmasin — aks holda ma'nosiz "so'z"lar paydo bo'ladi.
        if (letters.has(key(r + dc, c + dr)) || letters.has(key(r - dc, c - dr))) return -1;
      }
    }
    return crossings === answer.length ? -1 : crossings;
  };

  const queue = [...order];
  put({ ...queue.shift()!, row: 0, col: 0, dir: 'across' });

  // Joylab bo'lmagan so'zlarga keyingi aylanishda yana imkon beriladi.
  for (let pass = 0; pass < 2 && placed.length < maxWords; pass++) {
    for (let q = 0; q < queue.length && placed.length < maxWords; ) {
      const { answer, index } = queue[q];
      let bestFit: PlacedWord | null = null;
      let bestScore = 0;
      for (const [k, ch] of letters) {
        const [r, c] = k.split(',').map(Number);
        for (let i = 0; i < answer.length; i++) {
          if (answer[i] !== ch) continue;
          for (const dir of ['across', 'down'] as Dir[]) {
            const row = dir === 'down' ? r - i : r;
            const col = dir === 'across' ? c - i : c;
            const score = fit(answer, row, col, dir);
            const ranked = score + Math.random() * 0.5; // teng variantlar orasidan tasodifiy
            if (score > 0 && ranked > bestScore) {
              bestScore = ranked;
              bestFit = { index, answer, row, col, dir };
            }
          }
        }
      }
      if (bestFit) {
        put(bestFit);
        queue.splice(q, 1);
      } else {
        q++;
      }
    }
  }

  return {
    rows: maxR - minR + 1,
    cols: maxC - minC + 1,
    words: placed.map((w) => ({ ...w, row: w.row - minR, col: w.col - minC })),
  };
}
