import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMemberDto } from './create-member.dto.js';
import { UpdateMemberDto } from './update-member.dto.js';

const validInput = {
  name: 'Budi Santoso',
  email: 'budi@kampus.ac.id',
  phone: '081234567890',
  nim: '2026001',
  address: 'Jalan Kenanga 1',
};

const createErrors = (input: object) =>
  validateSync(plainToInstance(CreateMemberDto, input));

const updateErrors = (input: object) =>
  validateSync(plainToInstance(UpdateMemberDto, input));

const hasErrorOn = (
  errors: ReturnType<typeof createErrors>,
  property: string,
  constraint?: string,
) =>
  errors.some(
    (e) =>
      e.property === property &&
      (!constraint || (e.constraints && constraint in e.constraints)),
  );

describe('CreateMemberDto', () => {
  it('lolos bila semua field valid', () => {
    expect(createErrors(validInput)).toHaveLength(0);
  });

  it('lolos tanpa field opsional (nim, address, userId)', () => {
    const { nim: _n, address: _a, userId: _u, ...wajib } = validInput;
    expect(createErrors(wajib)).toHaveLength(0);
  });

  it('ditolak bila name kosong', () => {
    const errors = createErrors({ ...validInput, name: '' });
    expect(hasErrorOn(errors, 'name', 'isNotEmpty')).toBe(true);
  });

  it('ditolak bila email bukan format email', () => {
    const errors = createErrors({ ...validInput, email: 'bukan-email' });
    expect(hasErrorOn(errors, 'email', 'isEmail')).toBe(true);
  });

  it('ditolak bila phone kosong', () => {
    const { phone: _p, ...tanpaPhone } = validInput;
    const errors = createErrors(tanpaPhone);
    expect(hasErrorOn(errors, 'phone', 'isNotEmpty')).toBe(true);
  });
});

describe('UpdateMemberDto', () => {
  it('lolos bila objek kosong (semua field opsional)', () => {
    expect(updateErrors({})).toHaveLength(0);
  });

  it('lolos bila hanya sebagian field diisi', () => {
    expect(updateErrors({ name: 'Nama Baru' })).toHaveLength(0);
  });

  it('tetap menolak nilai yang salah walau hanya satu field', () => {
    const errors = updateErrors({ email: 'bukan-email' });
    expect(hasErrorOn(errors, 'email', 'isEmail')).toBe(true);
  });
});
