import { describe, expect, it } from 'vitest';

import { formatLearnerGrade } from '@/lib/school/grade-display';

describe('formatLearnerGrade', () => {
  it('prefixes bare numeric grades', () => {
    expect(formatLearnerGrade('5')).toBe('Grade 5');
    expect(formatLearnerGrade(' 12 ')).toBe('Grade 12');
  });

  it('leaves grades that already include the word Grade', () => {
    expect(formatLearnerGrade('Grade 5')).toBe('Grade 5');
    expect(formatLearnerGrade('grade 1')).toBe('grade 1');
  });

  it('passes through other labels', () => {
    expect(formatLearnerGrade('R')).toBe('R');
  });
});
