import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { LoansController } from './loans.controller.js';
import { LoansService } from './loans.service.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';

describe('LoansController', () => {
  let controller: LoansController;

  const loanId = 'loan-id-1';
  const memberId = 'member-id-1';
  const bookId = 'book-id-1';

  const serviceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    returnLoan: vi.fn(),
    markLost: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
  };

  // @UseGuards(JwtAuthGuard) membuat Nest menginstansiasi guard —
  // JwtService harus tersedia walau tidak dipakai di test ini.
  const jwtServiceMock = { verify: vi.fn(), signAsync: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [
        { provide: LoansService, useValue: serviceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    controller = module.get(LoansController);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(controller).toBeDefined();
  });

  it('findAll meneruskan ke service tanpa parameter', async () => {
    const data = [{ id: loanId }];
    serviceMock.findAll.mockResolvedValue(data);

    await expect(controller.findAll()).resolves.toEqual(data);
    expect(serviceMock.findAll).toHaveBeenCalledWith(false);
  });

  it('findAll meneruskan deleted=true ke service (daftar sampah)', async () => {
    serviceMock.findAll.mockResolvedValue([]);

    await controller.findAll('true');
    expect(serviceMock.findAll).toHaveBeenCalledWith(true);
  });

  it('findOne meneruskan id ke service', async () => {
    const loan = { id: loanId };
    serviceMock.findOne.mockResolvedValue(loan);

    await expect(controller.findOne(loanId)).resolves.toEqual(loan);
    expect(serviceMock.findOne).toHaveBeenCalledWith(loanId);
  });

  it('create meneruskan DTO ke service', async () => {
    const dto = { memberId, bookId } as never;
    const created = { id: loanId, ...dto };
    serviceMock.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toEqual(created);
    expect(serviceMock.create).toHaveBeenCalledWith(dto);
  });

  it('returnLoan meneruskan id (dari param) ke service', async () => {
    const dto = { loanId } as never;
    const returned = { id: loanId, status: 'DIKEMBALIKAN' };
    serviceMock.returnLoan.mockResolvedValue(returned);

    await expect(controller.returnLoan(loanId, dto)).resolves.toEqual(returned);
    expect(serviceMock.returnLoan).toHaveBeenCalledWith({ loanId });
  });

  it('markLost meneruskan id ke service', async () => {
    const lost = { id: loanId, status: 'HILANG' };
    serviceMock.markLost.mockResolvedValue(lost);

    await expect(controller.markLost(loanId)).resolves.toEqual(lost);
    expect(serviceMock.markLost).toHaveBeenCalledWith(loanId);
  });

  it('remove meneruskan id dan tidak mengembalikan body (204)', async () => {
    serviceMock.remove.mockResolvedValue(undefined);

    await expect(controller.remove(loanId)).resolves.toBeUndefined();
    expect(serviceMock.remove).toHaveBeenCalledWith(loanId);
  });

  it('restore meneruskan id ke service', async () => {
    const restored = { id: loanId, deletedAt: null };
    serviceMock.restore.mockResolvedValue(restored);

    await expect(controller.restore(loanId)).resolves.toEqual(restored);
    expect(serviceMock.restore).toHaveBeenCalledWith(loanId);
  });

  describe('metadata @Roles (aturan akses)', () => {
    const reflector = new Reflector();

    it('mutasi POST/PATCH/DELETE wajib role PETUGAS', () => {
      expect(
        reflector.get(ROLES_KEY, LoansController.prototype.create),
      ).toEqual(['PETUGAS']);
      expect(
        reflector.get(ROLES_KEY, LoansController.prototype.returnLoan),
      ).toEqual(['PETUGAS']);
      expect(
        reflector.get(ROLES_KEY, LoansController.prototype.markLost),
      ).toEqual(['PETUGAS']);
      expect(
        reflector.get(ROLES_KEY, LoansController.prototype.remove),
      ).toEqual(['PETUGAS']);
      expect(
        reflector.get(ROLES_KEY, LoansController.prototype.restore),
      ).toEqual(['PETUGAS']);
    });

    it('baca GET tidak punya @Roles (cukup sudah login)', () => {
      expect(
        reflector.get(ROLES_KEY, LoansController.prototype.findAll),
      ).toBeUndefined();
      expect(
        reflector.get(ROLES_KEY, LoansController.prototype.findOne),
      ).toBeUndefined();
    });
  });
});
