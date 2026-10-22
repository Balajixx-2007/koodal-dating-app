import { describe, it, expect } from 'vitest';
import { 
  calculateBatchAdmission, 
  evaluateRatio, 
  calculatePriorityScore 
} from '../lib/waitlistFormula';

describe('Phase 2 Checkpoint: Section 13 Ratio Control & Admission Formula', () => {

  // Case 1: Standard Balanced Batch from Section 13 Specification
  it('Case 1: correctly calculates balanced admission from Section 13 example (40 women, 50 men, 10 admitted)', () => {
    const result = calculateBatchAdmission({
      activeWomenNow: 40,
      activeMenNow: 50,
      womenToAdmit: 10,
      availableMenInQueue: 100,
      multiplier: 1.5
    });

    // 1.5 * (40 + 10) - 50 = 75 - 50 = 25 men
    expect(result.computedMenToAdmit).toBe(25);
    expect(result.actualMenAdmitted).toBe(25);
    expect(result.projectedWomenAfter).toBe(50);
    expect(result.projectedMenAfter).toBe(75);
    expect(result.ratioAfter).toBe(1.5);
    expect(result.isRatioAfterHealthy).toBe(true);
  });

  // Case 2: Zero Active Members (Cold-start launch in fresh city cluster)
  it('Case 2: handles cold-start city launch with zero active members', () => {
    const result = calculateBatchAdmission({
      activeWomenNow: 0,
      activeMenNow: 0,
      womenToAdmit: 10,
      availableMenInQueue: 50,
      multiplier: 1.5
    });

    // 1.5 * (0 + 10) - 0 = 15 men
    expect(result.computedMenToAdmit).toBe(15);
    expect(result.actualMenAdmitted).toBe(15);
    expect(result.projectedWomenAfter).toBe(10);
    expect(result.projectedMenAfter).toBe(15);
    expect(result.ratioAfter).toBe(1.5);
    expect(result.isRatioAfterHealthy).toBe(true);
  });

  // Case 3: Ratio Already Above Target (Severe Imbalance > 2.0 pause)
  it('Case 3: pauses men admissions when ratio is already above target (20 women, 50 men)', () => {
    const result = calculateBatchAdmission({
      activeWomenNow: 20,
      activeMenNow: 50, // Ratio is 2.5:1 (Critical > 2.0)
      womenToAdmit: 5,
      availableMenInQueue: 50,
      multiplier: 1.5
    });

    // 1.5 * (20 + 5) - 50 = 37.5 - 50 = -12.5 -> max(0, -12.5) = 0
    expect(result.computedMenToAdmit).toBe(0);
    expect(result.actualMenAdmitted).toBe(0);
    expect(result.projectedWomenAfter).toBe(25);
    expect(result.projectedMenAfter).toBe(50); // Men stay at 50
    expect(result.ratioAfter).toBe(2.0); // Recovering towards healthy range
  });

  // Case 4: Zero Women Admitted in Current Cycle
  it('Case 4: caps men admissions when zero women are admitted in a cycle', () => {
    const result = calculateBatchAdmission({
      activeWomenNow: 40,
      activeMenNow: 50,
      womenToAdmit: 0,
      availableMenInQueue: 30,
      multiplier: 1.5
    });

    // 1.5 * 40 - 50 = 60 - 50 = 10 men
    expect(result.computedMenToAdmit).toBe(10);
    expect(result.actualMenAdmitted).toBe(10);
    expect(result.projectedWomenAfter).toBe(40);
    expect(result.projectedMenAfter).toBe(60);
    expect(result.ratioAfter).toBe(1.5);
  });

  // Case 5: Exact 1.5 Ratio Existing
  it('Case 5: preserves exact 1.5 ratio when pool already meets target (40 women, 60 men)', () => {
    const result = calculateBatchAdmission({
      activeWomenNow: 40,
      activeMenNow: 60, // Exact 1.5 ratio
      womenToAdmit: 10,
      availableMenInQueue: 50,
      multiplier: 1.5
    });

    // 1.5 * (40 + 10) - 60 = 75 - 60 = 15 men
    expect(result.computedMenToAdmit).toBe(15);
    expect(result.actualMenAdmitted).toBe(15);
    expect(result.projectedWomenAfter).toBe(50);
    expect(result.projectedMenAfter).toBe(75);
    expect(result.ratioAfter).toBe(1.5);
    expect(result.isRatioAfterHealthy).toBe(true);
  });

  // Case 6: Tight 1.0 Balance Mode (1:1 Target)
  it('Case 6: supports 1.0 multiplier for tight 1:1 balance', () => {
    const result = calculateBatchAdmission({
      activeWomenNow: 40,
      activeMenNow: 40,
      womenToAdmit: 10,
      availableMenInQueue: 30,
      multiplier: 1.0 // 1:1 strict parity
    });

    // 1.0 * (40 + 10) - 40 = 50 - 40 = 10 men
    expect(result.computedMenToAdmit).toBe(10);
    expect(result.actualMenAdmitted).toBe(10);
    expect(result.ratioAfter).toBe(1.0);
    expect(result.isRatioAfterHealthy).toBe(true);
  });

  // Case 7: Queue Depletion (Available men fewer than computed allowance)
  it('Case 7: safely caps admitted men when queue has fewer candidates than allowance', () => {
    const result = calculateBatchAdmission({
      activeWomenNow: 40,
      activeMenNow: 50,
      womenToAdmit: 10,
      availableMenInQueue: 8, // Allowance is 25, but only 8 men waiting!
      multiplier: 1.5
    });

    expect(result.computedMenToAdmit).toBe(25);
    expect(result.actualMenAdmitted).toBe(8); // Capped by queue availability
    expect(result.projectedMenAfter).toBe(58);
    expect(result.ratioAfter).toBe(1.16);
    expect(result.isRatioAfterHealthy).toBe(true);
  });

  // Case 8: Priority Scoring Formula & Verified Facts
  it('Case 8: accurately calculates priority score from verified facts with day cap', () => {
    // Member A: Full verification in Chennai + 2 referrals + 12 days
    const scoreA = calculatePriorityScore({
      city: 'Chennai (Besant Nagar)',
      hasSelfieApproved: true,
      hasProfileComplete: true,
      verifiedReferralCount: 2,
      daysOnList: 12
    });
    // 20 (city) + 30 (selfie) + 20 (profile) + 20 (2 referrals) + 12 (days) = 102
    expect(scoreA).toBe(102);

    // Member B: Bangalore, no selfie yet, 25 days on list (capped at 20)
    const scoreB = calculatePriorityScore({
      city: 'Bangalore',
      hasSelfieApproved: false,
      hasProfileComplete: true,
      verifiedReferralCount: 0,
      daysOnList: 25 // Should cap at 20
    });
    // 20 (city) + 0 (selfie) + 20 (profile) + 0 (referrals) + 20 (days cap) = 60
    expect(scoreB).toBe(60);

    // Member C: Non-launch city, no verification
    const scoreC = calculatePriorityScore({
      city: 'Coimbatore',
      hasSelfieApproved: false,
      hasProfileComplete: false,
      verifiedReferralCount: 0,
      daysOnList: 1
    });
    // 0 (non-launch) + 0 + 0 + 0 + 1 (day) = 1
    expect(scoreC).toBe(1);
  });

  // Ratio Thresholds Verification
  it('evaluates ratio health according to Section 13 alert levels', () => {
    expect(evaluateRatio(40, 50).isHealthy).toBe(true); // 1.25 -> Healthy
    expect(evaluateRatio(40, 70).isWarning).toBe(true); // 1.75 -> Warning: admit fewer men
    expect(evaluateRatio(40, 90).isCritical).toBe(true); // 2.25 -> Critical: pause men admissions
  });
});
