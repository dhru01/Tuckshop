export type GuardianChild = {
  learnerId: string;
  firstName: string;
  lastName: string;
  grade: string;
  schoolId: string;
  schoolName: string;
  linkStatus: string;
  canManageControls: boolean;
  walletId: string | null;
  balanceCents: number;
  walletStatus: string | null;
  cardId: string | null;
  cardStatus: string | null;
  dailyLimitCents: number | null;
  weeklyLimitCents: number | null;
};

export type ParentActivityItem =
  | {
      kind: 'purchase';
      id: string;
      learnerId: string;
      learnerName: string;
      amountCents: number;
      createdAt: string;
      label: string;
    }
  | {
      kind: 'top_up';
      id: string;
      learnerId: string;
      learnerName: string;
      amountCents: number;
      createdAt: string;
      status: string;
      label: string;
    };
