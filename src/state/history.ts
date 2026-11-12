/**
 * Pile d'historique circulaire immuable (Undo / Redo) par partage de références (Copy-on-Write).
 * Comme CharacterSheetV1 est immuable, empiler un état ne copie que la référence racine (~8 octets),
 * tandis que les sous-arbres inchangés (ex: portraitDataUrl Base64, inventaire) sont partagés en RAM.
 */

export interface HistoryStack<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  readonly maxDepth: number;
}

export function createHistoryStack<T>(initialPresent: T, maxDepth = 30): HistoryStack<T> {
  return {
    past: [],
    present: initialPresent,
    future: [],
    maxDepth: Math.max(1, maxDepth),
  };
}

export function pushHistoryState<T>(
  stack: HistoryStack<T>,
  nextPresent: T,
): HistoryStack<T> {
  if (Object.is(stack.present, nextPresent)) {
    return stack;
  }

  const nextPast = [...stack.past, stack.present];
  const trimmedPast =
    nextPast.length > stack.maxDepth
      ? nextPast.slice(nextPast.length - stack.maxDepth)
      : nextPast;

  return {
    ...stack,
    past: trimmedPast,
    present: nextPresent,
    future: [],
  };
}

export function undoHistoryState<T>(stack: HistoryStack<T>): HistoryStack<T> {
  if (stack.past.length === 0) {
    return stack;
  }

  const previous = stack.past[stack.past.length - 1];
  if (previous === undefined) {
    return stack;
  }

  const nextPast = stack.past.slice(0, stack.past.length - 1);
  return {
    ...stack,
    past: nextPast,
    present: previous,
    future: [stack.present, ...stack.future],
  };
}

export function redoHistoryState<T>(stack: HistoryStack<T>): HistoryStack<T> {
  if (stack.future.length === 0) {
    return stack;
  }

  const next = stack.future[0];
  if (next === undefined) {
    return stack;
  }

  const nextFuture = stack.future.slice(1);
  return {
    ...stack,
    past: [...stack.past, stack.present],
    present: next,
    future: nextFuture,
  };
}
