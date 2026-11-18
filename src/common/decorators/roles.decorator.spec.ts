import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client.js';
import { ROLES_KEY, Roles } from './roles.decorator.js';

describe('@Roles decorator', () => {
  const reflector = new Reflector();

  it('menulis metadata ROLES_KEY pada method yang ditandai', () => {
    class ContohController {
      @Roles(Role.PETUGAS)
      mutasi() {}
    }

    expect(reflector.get(ROLES_KEY, ContohController.prototype.mutasi)).toEqual(
      ['PETUGAS'],
    );
  });

  it('mendukung lebih dari satu role sekaligus', () => {
    class ContohController {
      @Roles(Role.PETUGAS, Role.ANGGOTA)
      aksi() {}
    }

    expect(reflector.get(ROLES_KEY, ContohController.prototype.aksi)).toEqual([
      'PETUGAS',
      'ANGGOTA',
    ]);
  });

  it('method tanpa @Roles tidak meninggalkan metadata', () => {
    class ContohController {
      baca() {}
    }

    expect(
      reflector.get(ROLES_KEY, ContohController.prototype.baca),
    ).toBeUndefined();
  });
});
