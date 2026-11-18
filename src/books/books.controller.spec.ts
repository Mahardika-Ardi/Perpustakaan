import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';

describe('BooksController', () => {
  let controller: BooksController;

  const serviceMock = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  // @UseGuards(JwtAuthGuard) di controller membuat Nest menginstansiasi
  // guard — JwtService harus tersedia walau tidak dipakai di test ini.
  const jwtServiceMock = { verify: vi.fn(), signAsync: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        { provide: BooksService, useValue: serviceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    controller = module.get(BooksController);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(controller).toBeDefined();
  });

  it('findAll meneruskan ke service tanpa parameter', async () => {
    const data = [{ id: 'buku-1' }];
    serviceMock.findAll.mockResolvedValue(data);

    await expect(controller.findAll()).resolves.toEqual(data);
    expect(serviceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('findOne meneruskan id ke service', async () => {
    const book = { id: 'buku-1' };
    serviceMock.findOne.mockResolvedValue(book);

    await expect(controller.findOne('buku-1')).resolves.toEqual(book);
    expect(serviceMock.findOne).toHaveBeenCalledWith('buku-1');
  });

  it('create meneruskan DTO ke service', async () => {
    const dto = { title: 'Judul' } as never;
    const created = { id: 'buku-1', ...dto };
    serviceMock.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toEqual(created);
    expect(serviceMock.create).toHaveBeenCalledWith(dto);
  });

  it('update meneruskan id + DTO ke service', async () => {
    const dto = { title: 'Baru' } as never;
    serviceMock.update.mockResolvedValue({ id: 'buku-1', ...dto });

    await expect(controller.update('buku-1', dto)).resolves.toEqual({
      id: 'buku-1',
      ...dto,
    });
    expect(serviceMock.update).toHaveBeenCalledWith('buku-1', dto);
  });

  it('remove meneruskan id dan tidak mengembalikan body (204)', async () => {
    serviceMock.remove.mockResolvedValue(undefined);

    await expect(controller.remove('buku-1')).resolves.toBeUndefined();
    expect(serviceMock.remove).toHaveBeenCalledWith('buku-1');
  });

  describe('metadata @Roles (aturan akses)', () => {
    const reflector = new Reflector();

    it('mutasi POST/PATCH/DELETE wajib role PETUGAS', () => {
      expect(
        reflector.get(ROLES_KEY, BooksController.prototype.create),
      ).toEqual(['PETUGAS']);
      expect(
        reflector.get(ROLES_KEY, BooksController.prototype.update),
      ).toEqual(['PETUGAS']);
      expect(
        reflector.get(ROLES_KEY, BooksController.prototype.remove),
      ).toEqual(['PETUGAS']);
    });

    it('baca GET tidak punya @Roles (cukup sudah login)', () => {
      expect(
        reflector.get(ROLES_KEY, BooksController.prototype.findAll),
      ).toBeUndefined();
      expect(
        reflector.get(ROLES_KEY, BooksController.prototype.findOne),
      ).toBeUndefined();
    });
  });
});
