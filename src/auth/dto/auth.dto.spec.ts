import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterDto } from './register.dto.js';
import { LoginDto } from './login.dto.js';

const validRegister = {
  email: 'budi@kampus.ac.id',
  username: 'budi',
  password: 'rahasia123',
  name: 'Budi Santoso',
  phone: '081234567890',
  nim: '2026001',
  address: 'Jalan Kenanga 1',
};

const registerErrors = (input: object) =>
  validateSync(plainToInstance(RegisterDto, input));

const loginErrors = (input: object) =>
  validateSync(plainToInstance(LoginDto, input));

const hasErrorOn = (
  errors: ReturnType<typeof registerErrors>,
  property: string,
  constraint?: string,
) =>
  errors.some(
    (e) =>
      e.property === property &&
      (!constraint || (e.constraints && constraint in e.constraints)),
  );

describe('RegisterDto', () => {
  it('lolos bila semua field valid', () => {
    expect(registerErrors(validRegister)).toHaveLength(0);
  });

  it('lolos tanpa field opsional (username, nim, address)', () => {
    const { username: _u, nim: _n, address: _a, ...wajib } = validRegister;
    expect(registerErrors(wajib)).toHaveLength(0);
  });

  it('ditolak bila email bukan format email', () => {
    const errors = registerErrors({ ...validRegister, email: 'bukan-email' });
    expect(hasErrorOn(errors, 'email', 'isEmail')).toBe(true);
  });

  it('ditolak bila password kurang dari 8 karakter', () => {
    const errors = registerErrors({ ...validRegister, password: 'pendek7' });
    expect(hasErrorOn(errors, 'password', 'minLength')).toBe(true);
  });

  it('ditolak bila name kosong', () => {
    const errors = registerErrors({ ...validRegister, name: '' });
    expect(hasErrorOn(errors, 'name', 'isNotEmpty')).toBe(true);
  });

  it('ditolak bila phone tidak diisi', () => {
    const { phone: _p, ...tanpaPhone } = validRegister;
    const errors = registerErrors(tanpaPhone);
    expect(hasErrorOn(errors, 'phone', 'isNotEmpty')).toBe(true);
  });
});

describe('LoginDto', () => {
  it('lolos bila email & password valid', () => {
    expect(
      loginErrors({ email: 'budi@kampus.ac.id', password: 'rahasia123' }),
    ).toHaveLength(0);
  });

  it('ditolak bila email salah format', () => {
    const errors = loginErrors({ email: 'budi', password: 'rahasia123' });
    expect(hasErrorOn(errors, 'email', 'isEmail')).toBe(true);
  });

  it('ditolak bila password kosong', () => {
    const errors = loginErrors({ email: 'budi@kampus.ac.id', password: '' });
    expect(hasErrorOn(errors, 'password', 'isNotEmpty')).toBe(true);
  });
});
