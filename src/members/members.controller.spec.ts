import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';

describe('MembersController', () => {
  let controller: MembersController;

  const serviceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  // @UseGuards(JwtAuthGuard) membuat Nest menginstansiasi guard —
  // JwtService harus tersedia walau tidak dipakai di test ini.
  const jwtServiceMock = { verify: vi.fn(), signAsync: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        { provide: MembersService, useValue: serviceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    controller = module.get(MembersController);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(controller).toBeDefined();
  });

  it('findAll meneruskan ke service tanpa parameter', async () => {
    const data = [{ id: 'member-1' }];
    serviceMock.findAll.mockResolvedValue(data);

    await expect(controller.findAll()).resolves.toEqual(data);
    expect(serviceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('findOne meneruskan id ke service', async () => {
    const member = { id: 'member-1' };
    serviceMock.findOne.mockResolvedValue(member);

    await expect(controller.findOne('member-1')).resolves.toEqual(member);
    expect(serviceMock.findOne).toHaveBeenCalledWith('member-1');
  });

  it('create meneruskan DTO ke service', async () => {
    const dto = { name: 'Budi' } as never;
    const created = { id: 'member-1', ...dto };
    serviceMock.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toEqual(created);
    expect(serviceMock.create).toHaveBeenCalledWith(dto);
  });

  it('update meneruskan id + DTO ke service', async () => {
    const dto = { name: 'Baru' } as never;
    serviceMock.update.mockResolvedValue({ id: 'member-1', ...dto });

    await expect(controller.update('member-1', dto)).resolves.toEqual({
      id: 'member-1',
      ...dto,
    });
    expect(serviceMock.update).toHaveBeenCalledWith('member-1', dto);
  });

  it('remove meneruskan id dan tidak mengembalikan body (204)', async () => {
    serviceMock.remove.mockResolvedValue(undefined);

    await expect(controller.remove('member-1')).resolves.toBeUndefined();
    expect(serviceMock.remove).toHaveBeenCalledWith('member-1');
  });

  describe('metadata @Roles (aturan akses)', () => {
    const reflector = new Reflector();

    it('mutasi POST/PATCH/DELETE wajib role PETUGAS', () => {
      expect(
        reflector.get(ROLES_KEY, MembersController.prototype.create),
      ).toEqual(['PETUGAS']);
      expect(
        reflector.get(ROLES_KEY, MembersController.prototype.update),
      ).toEqual(['PETUGAS']);
      expect(
        reflector.get(ROLES_KEY, MembersController.prototype.remove),
      ).toEqual(['PETUGAS']);
    });

    it('baca GET tidak punya @Roles (cukup sudah login)', () => {
      expect(
        reflector.get(ROLES_KEY, MembersController.prototype.findAll),
      ).toBeUndefined();
      expect(
        reflector.get(ROLES_KEY, MembersController.prototype.findOne),
      ).toBeUndefined();
    });
  });
});
