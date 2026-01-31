
import { DiceValue, Bid, Player } from '../types';

/**
 * Binomial Coefficient: nCr
 */
function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  if (r > n / 2) r = n - r;
  let res = 1;
  for (let i = 1; i <= r; i++) {
    res = res * (n - i + 1) / i;
  }
  return res;
}

/**
 * Probability of getting exactly k successes in n trials with probability p
 */
function binomialProb(n: number, k: number, p: number): number {
  return nCr(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/**
 * Cumulative Probability: P(X >= k)
 */
function probAtLeast(n: number, k: number, p: number): number {
  let prob = 0;
  for (let i = k; i <= n; i++) {
    prob += binomialProb(n, i, p);
  }
  return prob;
}

const AI_NAMES = [
  'Calculon', 'DeepBlueDice', 'ProbabilityPete', 'BluffMaster-9000', 
  'TheQuant', 'SiliconLiar', 'RiskEngine', 'BayesianBot', 'DiceDaemon'
];

export const aiService = {
  getRandomName: () => AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)],

  decideAction: (
    aiPlayer: Player, 
    allPlayers: Player[], 
    currentBid?: Bid,
    isPalifico: boolean = false
  ): { action: 'bid' | 'dudo' | 'calza'; bid?: { count: number; value: DiceValue } } => {
    
    const totalDice = allPlayers.reduce((sum, p) => sum + p.dice.length, 0);
    const unknownDice = totalDice - aiPlayer.dice.length;
    
    // 1. Dudo/Calza probability check
    if (currentBid) {
      const p = (isPalifico || currentBid.value === 1) ? 1/6 : 1/3;
      const matchingInHand = aiPlayer.dice.filter(d => 
        d === currentBid.value || (!isPalifico && currentBid.value !== 1 && d === 1)
      ).length;
      const neededFromUnknown = Math.max(0, currentBid.count - matchingInHand);
      const prob = neededFromUnknown === 0 ? 1 : probAtLeast(unknownDice, neededFromUnknown, p);

      if (prob < 0.35) return { action: 'dudo' };
      if (!isPalifico && prob === 1 && currentBid.count === matchingInHand && Math.random() > 0.7) return { action: 'calza' };
    }

    // 2. Decide on a bid value based on hand
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    aiPlayer.dice.forEach(d => counts[d]++);
    
    let bestValue: DiceValue = 2;
    let maxEffectiveCount = 0;

    for (let v = 1; v <= 6; v++) {
      const effCount = counts[v] + (isPalifico || v === 1 ? 0 : counts[1]);
      if (effCount > maxEffectiveCount) {
        maxEffectiveCount = effCount;
        bestValue = v as DiceValue;
      }
    }

    if (!currentBid) {
      // STARTING PLAYER
      if (isPalifico) {
        const activePlayers = allPlayers.filter(p => !p.isEliminated);
        const is1v1BothOneDie = activePlayers.length === 2 && activePlayers.every(p => p.dice.length === 1);
        
        if (is1v1BothOneDie) {
          // Special 1v1 rule: Can bid any value. Let's vary it occasionally to test the UI fix.
          const pickAny = Math.random() > 0.5 ? (Math.floor(Math.random() * 5 + 2) as DiceValue) : aiPlayer.dice[0];
          return { action: 'bid', bid: { count: 1, value: pickAny || 2 } };
        }
        // Normal Palifico starter must bid exactly the face value of their only die
        return { action: 'bid', bid: { count: 1, value: aiPlayer.dice[0] || 2 } };
      }
      const startValue = bestValue === 1 ? 2 : bestValue;
      const initialCount = Math.max(1, Math.floor(totalDice / 5));
      return { action: 'bid', bid: { count: initialCount, value: startValue } };
    }

    // CONTINUING PLAYER
    if (isPalifico) {
      // Face is locked. Only increase quantity.
      return { action: 'bid', bid: { count: currentBid.count + 1, value: currentBid.value } };
    }

    // Standard Bidding Logic
    const pForBid = bestValue === 1 ? 1/6 : 1/3;
    const expectedTotal = maxEffectiveCount + (unknownDice * pForBid);

    let nextCount = currentBid.count;
    let nextValue = currentBid.value;

    if (currentBid.value === 1) {
      nextValue = bestValue === 1 ? 2 : bestValue;
      nextCount = currentBid.count * 2 + 1;
    } else if (bestValue === 1) {
      nextValue = 1;
      nextCount = Math.ceil(currentBid.count / 2);
    } else {
      if (bestValue > currentBid.value) {
        nextValue = bestValue;
        nextCount = currentBid.count;
      } else {
        nextValue = bestValue;
        nextCount = currentBid.count + 1;
      }
    }

    if (nextCount > expectedTotal + 1.5 && Math.random() > 0.1) {
      return { action: 'dudo' };
    }

    return { action: 'bid', bid: { count: nextCount, value: nextValue } };
  }
};
