export const BUSINESS_RULES = {
  CANCELLATION_MIN_HOURS: 24,
  REMINDER_WINDOWS_HOURS: [30, 4],
  DEPOSIT_REQUIRED: true,
  DEPOSIT_TYPE: 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED'
  DEPOSIT_PERCENTAGE: 50,
  SERVICE_PRICE: 40000,
  SESSION_DURATION_MINUTES: 30, // Session duration in minutes
  BOOKING_WINDOW_DAYS: 30, // How far in advance to show availability
  WORKING_HOURS: {
    // Days: 0 (Sun) - 6 (Sat)
    // Mon, Tue, Fri: 13-20
    1: { start: 13, end: 20 },
    2: { start: 13, end: 20 },
    5: { start: 13, end: 20 },
    // Wed, Thu: 8-14
    3: { start: 8, end: 14 },
    4: { start: 8, end: 14 },
    // Others are closed (undefined)
  } as Record<number, { start: number; end: number }>,
} as const;
