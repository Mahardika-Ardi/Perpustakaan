import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLoanDto } from './create-loan.dto.js';
import { ReturnLoanDto } from './return-loan.dto.js';

const hasErrorOn = (
  errors: ReturnType<typeof validateSync>,
  property: string,
  constraint?: string,
) =>
  errors.some(
    (e) =>
      e.property === property &&
      (!constraint || (e.constraints && constraint in e.constraints)),
  );

describe('CreateLoanDto', () => {
  it('lolos bila memberId & bookId valid', () => {
    const errors = validateSync(
      plainToInstance(CreateLoanDto, { memberId: 'm1', bookId: 'b1' }),
    );
    expect(errors).toHaveLength(0);
  });

  it('ditolak bila memberId kosong', () => {
    const errors = validateSync(
      plainToInstance(CreateLoanDto, { memberId: '', bookId: 'b1' }),
    );
    expect(hasErrorOn(errors, 'memberId', 'isNotEmpty')).toBe(true);
  });

  it('ditolak bila bookId kosong', () => {
    const errors = validateSync(
      plainToInstance(CreateLoanDto, { memberId: 'm1', bookId: '' }),
    );
    expect(hasErrorOn(errors, 'bookId', 'isNotEmpty')).toBe(true);
  });
});

describe('ReturnLoanDto', () => {
  it('lolos bila loanId valid', () => {
    const errors = validateSync(
      plainToInstance(ReturnLoanDto, { loanId: 'l1' }),
    );
    expect(errors).toHaveLength(0);
  });

  it('ditolak bila loanId kosong', () => {
    const errors = validateSync(plainToInstance(ReturnLoanDto, { loanId: '' }));
    expect(hasErrorOn(errors, 'loanId', 'isNotEmpty')).toBe(true);
  });
});
