import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FinesController } from './fines.controller.js';
import { FinesService } from './fines.service.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';

describe('FinesController', () => {
  let controller: FinesController;

  const fineId = 'fine-id-1';

  const serviceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    pay: vi.fn(),
  };

  const jwtServiceMock = { verify: vi.fn(), signAsync: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinesController],
      providers: [
        { provide: FinesService, useValue: serviceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    controller = module.get(FinesController);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(controller).toBeDefined();
  });

  it('findAll meneruskan ke service tanpa parameter', async () => {
    const data = [{ id: fineId }];
    serviceMock.findAll.mockResolvedValue(data);

    await expect(controller.findAll()).resolves.toEqual(data);
    expect(serviceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('findOne meneruskan id ke service', async () => {
    const fine = { id: fineId };
    serviceMock.findOne.mockResolvedValue(fine);

    await expect(controller.findOne(fineId)).resolves.toEqual(fine);
    expect(serviceMock.findOne).toHaveBeenCalledWith(fineId);
  });

  it('pay meneruskan id ke service', async () => {
    const dto = {} as never;
    const paid = { id: fineId, status: 'LUNAS' };
    serviceMock.pay.mockResolvedValue(paid);

    await expect(controller.pay(fineId, dto)).resolves.toEqual(paid);
    expect(serviceMock.pay).toHaveBeenCalledWith(fineId);
  });

  describe('metadata @Roles (aturan akses)', () => {
    const reflector = new Reflector();

    it('PATCH /fines/:id/pay wajib role PETUGAS', () => {
      expect(reflector.get(ROLES_KEY, FinesController.prototype.pay)).toEqual([
        'PETUGAS',
      ]);
    });

    it('baca GET tidak punya @Roles (cukup sudah login)', () => {
      expect(
        reflector.get(ROLES_KEY, FinesController.prototype.findAll),
      ).toBeUndefined();
      expect(
        reflector.get(ROLES_KEY, FinesController.prototype.findOne),
      ).toBeUndefined();
    });
  });
});
