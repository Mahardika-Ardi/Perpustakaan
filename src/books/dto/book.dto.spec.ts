import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateBookDto } from './create-book.dto.js';
import { UpdateBookDto } from './update-book.dto.js';

const validInput = {
  title: 'Pemrograman Web',
  author: 'Budi Santoso',
  isbn: '978-602-001-001',
  publisher: 'Informatika Press',
  year: 2024,
  value: 150000,
  stock: 3,
};

const createErrors = (input: object) =>
  validateSync(plainToInstance(CreateBookDto, input));

const updateErrors = (input: object) =>
  validateSync(plainToInstance(UpdateBookDto, input));

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

describe('CreateBookDto', () => {
  it('lolos bila semua field valid', () => {
    expect(createErrors(validInput)).toHaveLength(0);
  });

  it('lolos tanpa stock (opsional, default dari schema)', () => {
    const { stock: _stock, ...tanpaStock } = validInput;
    expect(createErrors(tanpaStock)).toHaveLength(0);
  });

  it('ditolak bila title kosong', () => {
    const errors = createErrors({ ...validInput, title: '' });
    expect(hasErrorOn(errors, 'title', 'isNotEmpty')).toBe(true);
  });

  it('ditolak bila author kosong', () => {
    const errors = createErrors({ ...validInput, author: '' });
    expect(hasErrorOn(errors, 'author', 'isNotEmpty')).toBe(true);
  });

  it('ditolak bila isbn kosong', () => {
    const errors = createErrors({ ...validInput, isbn: '' });
    expect(hasErrorOn(errors, 'isbn', 'isNotEmpty')).toBe(true);
  });

  it('ditolak bila year bukan angka', () => {
    const errors = createErrors({ ...validInput, year: 'duaribu' });
    expect(hasErrorOn(errors, 'year', 'isInt')).toBe(true);
  });

  it('ditolak bila year melebihi batas (2100)', () => {
    const errors = createErrors({ ...validInput, year: 2500 });
    expect(hasErrorOn(errors, 'year', 'max')).toBe(true);
  });

  it('ditolak bila value negatif', () => {
    const errors = createErrors({ ...validInput, value: -1000 });
    expect(hasErrorOn(errors, 'value', 'min')).toBe(true);
  });

  it('ditolak bila stock negatif', () => {
    const errors = createErrors({ ...validInput, stock: -1 });
    expect(hasErrorOn(errors, 'stock', 'min')).toBe(true);
  });
});

describe('UpdateBookDto', () => {
  it('lolos bila objek kosong (semua field opsional)', () => {
    expect(updateErrors({})).toHaveLength(0);
  });

  it('lolos bila hanya sebagian field diisi', () => {
    expect(updateErrors({ title: 'Judul Baru' })).toHaveLength(0);
  });

  it('tetap menolak nilai yang salah walau hanya satu field', () => {
    const errors = updateErrors({ year: 'duaribu' });
    expect(hasErrorOn(errors, 'year', 'isInt')).toBe(true);
  });
});
