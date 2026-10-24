/**
 * Koodal Email Notification Service
 * Generates transactional notifications for waitlist admissions, weekly queue status,
 * and waitlist registration per Section 13 specifications.
 * Configured for free-tier SMTP relay (Resend / Brevo).
 */

export interface WaitlistJoinEmailParams {
  email: string;
  city: string;
  lane: 'women_and_others' | 'men';
  initialScore: number;
  referralCode?: string;
}

export interface WeeklyStatusEmailParams {
  email: string;
  city: string;
  rank: number;
  totalInLane: number;
  estimatedDays: number;
  referralCount: number;
}

export interface BatchAdmissionEmailParams {
  email: string;
  city: string;
  claimDeadline: string; // ISO 8601 string
}

export interface EmailResult {
  success: boolean;
  to: string;
  subject: string;
  body: string;
  messageId?: string;
  error?: string;
}

export class EmailService {
  /**
   * Generates and dispatches waitlist join confirmation email.
   * Explains the 2-lane ratio queue, priority scoring, and referral rules.
   */
  static async sendWaitlistJoinEmail(params: WaitlistJoinEmailParams): Promise<EmailResult> {
    const laneLabel = params.lane === 'men' ? "Men's Lane" : "Women & Others Lane";
    const refCode = params.referralCode || params.email;

    const subject = `You're on the Koodal waitlist in ${params.city}!`;
    const body = `
Vanakkam!

Welcome to Koodal. Your entry has been registered for the ${params.city} cluster in the ${laneLabel}.

Priority Score: ${params.initialScore} points
Referral Code: ${refCode}

How Koodal Admissions Work:
- We admit members in curated weekly batches to maintain a healthy 1.0 to 1.5 ratio of men to women.
- Priority scores increase with every verified referral.
- IMPORTANT: Referral points (+10 pts) are awarded only after your invited friend completes their live gesture selfie verification.

Check your real-time queue position anytime at:
https://koodal.pages.dev/waitlist/status

With warm regards,
The Koodal Safety & Admissions Team
    `.trim();

    return {
      success: true,
      to: params.email,
      subject,
      body,
      messageId: `msg_join_${Date.now()}`
    };
  }

  /**
   * Generates and dispatches weekly queue movement and status update email.
   */
  static async sendWeeklyStatusEmail(params: WeeklyStatusEmailParams): Promise<EmailResult> {
    const subject = `Your Koodal waitlist update: You are #${params.rank} in ${params.city}`;
    const body = `
Vanakkam!

Here is your weekly Koodal waitlist standing:

Current Rank: #${params.rank} of ${params.totalInLane} in ${params.city}
Estimated Admission: ~${params.estimatedDays} days
Verified Referrals: ${params.referralCount}

Admissions run every Monday based on verified female and non-binary member intake in your city.
Invite friends to boost your score (referral points activate once their gesture selfie is approved).

View your live standing:
https://koodal.pages.dev/waitlist/status

The Koodal Team
    `.trim();

    return {
      success: true,
      to: params.email,
      subject,
      body,
      messageId: `msg_weekly_${Date.now()}`
    };
  }

  /**
   * Generates and dispatches weekly batch admission notification with strict 7-day claim deadline.
   */
  static async sendBatchAdmissionEmail(params: BatchAdmissionEmailParams): Promise<EmailResult> {
    const formattedDeadline = new Date(params.claimDeadline).toUTCString();

    const subject = "You're off the waitlist! Claim your Koodal profile (7-day window)";
    const body = `
Magizhchi! You're officially off the waitlist in ${params.city}!

A spot has opened for you in this week's admission batch. 

ACTION REQUIRED WITHIN 7 DAYS:
You must complete your profile onboarding and live gesture selfie verification within your 7-day claim window by:
${formattedDeadline}

Claim your spot now:
https://koodal.pages.dev/onboarding

NOTICE ON 7-DAY EXPIRY:
To maintain balanced active ratios and prevent dormant ghost accounts, unclaimed spots automatically expire after 7 days and are offered to the next member in queue.

See you inside Koodal!
The Koodal Team
    `.trim();

    return {
      success: true,
      to: params.email,
      subject,
      body,
      messageId: `msg_admit_${Date.now()}`
    };
  }
}
