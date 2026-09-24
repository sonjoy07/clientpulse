import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { ListClientQueryDto } from './dto/list-client-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: {
        organizationId,
        name: dto.name,
        companyName: dto.companyName,
        email: dto.email,
        phone: dto.phone,
      },
    });

    return {
      success: true,
      data: client,
    };
  }

  async findAll(
    organizationId: string,
    query: ListClientQueryDto,
  ): Promise<PaginatedResponse<unknown>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = {
      organizationId,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return {
      success: true,
      data: client,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateClientDto) {
    const existing = await this.prisma.client.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Client not found');
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async remove(organizationId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (client._count.projects > 0) {
      throw new ConflictException(
        `Cannot delete client with ${client._count.projects} associated project(s). Reassign or delete projects first.`,
      );
    }

    await this.prisma.client.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Client deleted successfully',
    };
  }
}
