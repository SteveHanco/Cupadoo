
import { Stats } from './types';

export const INITIAL_DICE_COUNT = 5;

export const DEFAULT_STATS: Stats = {
  mostWins: { name: 'Player One', count: 12 },
  mostLosses: { name: 'Unlucky Joe', count: 45 },
  bestCalza: { name: 'Dice Master', count: 5, bid: '12 x 4s' }
};

export const DICE_FACE_MAP: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅'
};
