import { describe, expect, it } from 'vitest';

import { selectContextSchema } from '@/lib/validations/auth';

describe('selectContextSchema', () => {
  it('accepts parent/super_admin with null school and omitted next', () => {
    expect(
      selectContextSchema.safeParse({ role: 'parent', schoolId: null, next: null }).success,
    ).toBe(true);
    expect(selectContextSchema.safeParse({ role: 'super_admin', schoolId: null }).success).toBe(
      true,
    );
  });

  it('accepts school-bound roles with a uuid schoolId', () => {
    const schoolId = '11111111-1111-4111-8111-111111111111';
    expect(
      selectContextSchema.safeParse({ role: 'school_admin', schoolId, next: '/school/learners' })
        .success,
    ).toBe(true);
  });
});
