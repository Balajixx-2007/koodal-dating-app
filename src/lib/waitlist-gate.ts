/**
 * Waitlist Gatekeeper and Claim Window Calculations
 * Enforces the non-negotiable rule:
 * "A signed-in member who has not been admitted sees only the waitlist status page."
 * Enforces 7-day claim window with automatic expiry.
 */

export interface WaitlistClaimDetails {
  isAdmitted: boolean;
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  remainingDays: number;
  remainingHours: number;
  deadlineIso: string | null;
  claimDeadline: string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calculates remaining time in the 7-day claim window after batch admission.
 */
export function getClaimWindowDetails(
  statusOrAdmittedAt?: string | null,
  maybeAdmittedAt?: string | null
): WaitlistClaimDetails {
  let status = statusOrAdmittedAt;
  let admittedAt = maybeAdmittedAt;

  if (statusOrAdmittedAt && (statusOrAdmittedAt.includes('T') || statusOrAdmittedAt.includes('-')) && !maybeAdmittedAt) {
    status = 'admitted';
    admittedAt = statusOrAdmittedAt;
  }

  if (status !== 'admitted' && status !== 'expired') {
    return {
      isAdmitted: false,
      isExpired: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      remainingDays: 0,
      remainingHours: 0,
      deadlineIso: null,
      claimDeadline: null
    };
  }

  if (status === 'expired' || !admittedAt) {
    return {
      isAdmitted: status === 'admitted',
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      remainingDays: 0,
      remainingHours: 0,
      deadlineIso: null,
      claimDeadline: null
    };
  }

  const admittedTime = new Date(admittedAt).getTime();
  const deadlineTime = admittedTime + SEVEN_DAYS_MS;
  const now = Date.now();
  const diffMs = deadlineTime - now;

  if (diffMs <= 0) {
    const deadlineStr = new Date(deadlineTime).toISOString();
    return {
      isAdmitted: true,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      remainingDays: 0,
      remainingHours: 0,
      deadlineIso: deadlineStr,
      claimDeadline: deadlineStr
    };
  }

  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const deadlineStr = new Date(deadlineTime).toISOString();

  return {
    isAdmitted: true,
    isExpired: false,
    daysRemaining,
    hoursRemaining,
    remainingDays: daysRemaining,
    remainingHours: hoursRemaining,
    deadlineIso: deadlineStr,
    claimDeadline: deadlineStr
  };
}

/**
 * Route access decision engine.
 * Decides whether a user has full access to dating member features (Discover, Matches, Chat, Profile)
 * or must be restricted to the waitlist status page.
 */
export function canAccessMemberRoutes(
  user: { id: string; email?: string; role?: string } | null,
  waitlistEntry: { id: string; status: 'waiting' | 'admitted' | 'expired' } | null
): boolean {
  // Visitor (not signed in) is handled by landing/login routes
  if (!user) {
    return false;
  }

  // Administrators bypass waitlist restrictions
  if (user.role === 'admin') {
    return true;
  }

  // Non-admitted members are restricted to waitlist status
  if (!waitlistEntry) {
    return false;
  }

  return waitlistEntry.status === 'admitted';
}
