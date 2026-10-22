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
 * men to admit = max(0, round(multiplier * (active_women_now + women_to_admit) - active_men_now))
 */
export function calculateBatchAdmission(input: BatchSimulationInput): BatchSimulationResult {
  const {
    activeWomenNow,
    activeMenNow,
    womenToAdmit,
    availableMenInQueue,
    multiplier = 1.5
  } = input;

  const ratioBefore = Number((activeMenNow / Math.max(1, activeWomenNow)).toFixed(2));

  // If current ratio is already critically imbalanced (> 2.0), pause men admissions entirely
  const admissionPausedForMen = ratioBefore > 2.0 && womenToAdmit === 0;

  const projectedWomenAfter = activeWomenNow + Math.max(0, womenToAdmit);

  // Formula per Section 13:
  let computedMenToAdmit = 0;
  if (!admissionPausedForMen) {
    computedMenToAdmit = Math.max(
      0,
      Math.round(multiplier * projectedWomenAfter - activeMenNow)
    );
  }

  // Cap by available men in the queue
  const actualMenAdmitted = Math.min(computedMenToAdmit, Math.max(0, availableMenInQueue));
  const projectedMenAfter = activeMenNow + actualMenAdmitted;
  const ratioAfter = Number((projectedMenAfter / Math.max(1, projectedWomenAfter)).toFixed(2));

  const isRatioAfterHealthy = ratioAfter >= 1.0 && ratioAfter <= 1.5;

  return {
    activeWomenBefore: activeWomenNow,
    activeMenBefore: activeMenNow,
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

  // Verified referrals (+10 pts each)
  score += Math.max(0, facts.verifiedReferralCount) * 10;

  // Time on waitlist (+1 pt per day, up to 20 pts)
  score += Math.min(20, Math.max(1, facts.daysOnList));

  return score;
}
