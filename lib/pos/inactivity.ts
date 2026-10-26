/** Default POS auto-lock after idle time (SECURITY.md). School-level config can replace this later. */
export const POS_INACTIVITY_MS = 10 * 60 * 1000;

export const POS_ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;
