/**
 * ==============================================================================
 * Koodal Platform: Section 13 Ratio Control & Admission Formula
 * ==============================================================================
 *
 * Core Principle: Keep the active pool balanced in every launch cluster,
 * so women are not overwhelmed with spam likes and men get real conversations.
 * Healthy target range: 1.0 to 1.5 men per woman.
 */

export interface RatioStatus {
  activeWomen: number;
  activeMen: number;
  ratio: number;
  isHealthy: boolean;
  isWarning: boolean;
  isCritical: boolean;
  actionRequired: 'none' | 'admit_fewer_men' | 'pause_men_admissions';
}

export interface BatchSimulationInput {
  activeWomenNow: number;
  activeMenNow: number;
  womenToAdmit: number;
  availableMenInQueue: number;
  unclaimedWomenInWindow?: number;
  unclaimedMenInWindow?: number;
  multiplier?: number; // Default 1.5; can use 1.0 for tighter balance
}

export interface BatchSimulationResult {
  activeWomenBefore: number;
  activeMenBefore: number;
  ratioBefore: number;
  womenAdmitted: number;
  computedMenToAdmit: number;
  actualMenAdmitted: number;
  projectedWomenAfter: number;
  projectedMenAfter: number;
  ratioAfter: number;
  isRatioAfterHealthy: boolean;
  admissionPausedForMen: boolean;
}

/**
 * Evaluates current active gender ratio for a cluster
 */
export function evaluateRatio(activeWomen: number, activeMen: number): RatioStatus {
  const safeWomen = Math.max(1, activeWomen);
  const ratio = Number((activeMen / safeWomen).toFixed(2));

  const isHealthy = ratio >= 1.0 && ratio <= 1.5;
  const isWarning = ratio > 1.5 && ratio <= 2.0;
  const isCritical = ratio > 2.0;

  let actionRequired: 'none' | 'admit_fewer_men' | 'pause_men_admissions' = 'none';
  if (isCritical) {
    actionRequired = 'pause_men_admissions';
  } else if (isWarning) {
    actionRequired = 'admit_fewer_men';
  }

  return {
    activeWomen,
    activeMen,
    ratio,
    isHealthy,
    isWarning,
    isCritical,
    actionRequired
  };
}

/**
 * Calculates Section 13 admission formula:
 * men to admit = max(0, floor(multiplier * (effective_active_women + women_to_admit) - effective_active_men))
 * Item 1: Uses floor() to strictly avoid rounding up and exceeding 1.5.
 * Item 3: Counts admitted-but-unclaimed members as active until claim window expires.
 */
export function calculateBatchAdmission(input: BatchSimulationInput): BatchSimulationResult {
  const {
    activeWomenNow,
    activeMenNow,
    womenToAdmit,
    availableMenInQueue,
    unclaimedWomenInWindow = 0,
    unclaimedMenInWindow = 0,
    multiplier = 1.5
  } = input;

  // Count admitted-but-unclaimed members in 7-day window as active
  const effectiveWomenBefore = activeWomenNow + unclaimedWomenInWindow;
  const effectiveMenBefore = activeMenNow + unclaimedMenInWindow;

  const ratioBefore = Number((effectiveMenBefore / Math.max(1, effectiveWomenBefore)).toFixed(2));

  // If current ratio is already critically imbalanced (> 2.0), pause men admissions entirely
  const admissionPausedForMen = ratioBefore > 2.0 && womenToAdmit === 0;

  const projectedWomenAfter = effectiveWomenBefore + Math.max(0, womenToAdmit);

  // Formula per Section 13 with floor():
  let computedMenToAdmit = 0;
  if (!admissionPausedForMen) {
    computedMenToAdmit = Math.max(
      0,
      Math.floor(multiplier * projectedWomenAfter - effectiveMenBefore)
    );
  }

  // Cap by available men in the queue
  const actualMenAdmitted = Math.min(computedMenToAdmit, Math.max(0, availableMenInQueue));
  const projectedMenAfter = effectiveMenBefore + actualMenAdmitted;
  const ratioAfter = Number((projectedMenAfter / Math.max(1, projectedWomenAfter)).toFixed(2));

  const isRatioAfterHealthy = ratioAfter >= 1.0 && ratioAfter <= 1.5;

  return {
    activeWomenBefore: effectiveWomenBefore,
    activeMenBefore: effectiveMenBefore,
    ratioBefore,
    womenAdmitted: womenToAdmit,
    computedMenToAdmit,
    actualMenAdmitted,
    projectedWomenAfter,
    projectedMenAfter,
    ratioAfter,
    isRatioAfterHealthy,
    admissionPausedForMen
  };
}

/**
 * Calculates priority score from verified facts (Section 13)
 * Item 2: Capped referral points (max +10 total) and score strictly capped at 100 maximum.
 */
export function calculatePriorityScore(facts: {
  city: string;
  hasSelfieApproved: boolean;
  hasProfileComplete: boolean;
  verifiedReferralCount: number;
  daysOnList: number;
}): number {
  let score = 0;

  const isLaunchCity =
    facts.city.toLowerCase().includes('chennai') ||
    facts.city.toLowerCase().includes('bangalore') ||
    facts.city.toLowerCase().includes('bengaluru');

  // Launch cluster density focus (+20 pts)
  if (isLaunchCity) score += 20;

  // Hand-reviewed selfie approved (+30 pts)
  if (facts.hasSelfieApproved) score += 30;

  // Profile complete: 3+ photos & bio prompts (+20 pts)
  if (facts.hasProfileComplete) score += 20;

  // Verified referrals: max +10 points total
  score += Math.min(10, Math.max(0, facts.verifiedReferralCount) * 10);

  // Time on waitlist (+1 pt per day, up to 20 pts)
  score += Math.min(20, Math.max(1, facts.daysOnList));

  // Item 2: Score strictly capped at 100 maximum
  return Math.min(100, score);
}
