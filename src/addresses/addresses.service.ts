import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    const existingCount = await this.prisma.address.count({ where: { userId } });
    const isDefault = dto.isDefault || existingCount === 0;

    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: { ...dto, isDefault, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.getOwned(userId, id);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.address.delete({ where: { id } });
    return { deleted: true, id };
  }

  async getOwned(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });

    if (!address || address.userId !== userId) {
      throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
    }

    return address;
  }
}
