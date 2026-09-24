import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: {
    client: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const orgId = 'org-uuid-1';
  const clientId = 'client-uuid-1';

  beforeEach(async () => {
    prisma = {
      client: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create client under current organization', async () => {
      const dto = {
        name: 'Jane Doe',
        companyName: 'Acme Corp',
        email: 'jane@acme.com',
        phone: '+1-555-0100',
      };

      prisma.client.create.mockResolvedValue({
        id: clientId,
        organizationId: orgId,
        ...dto,
      });

      const result = await service.create(orgId, dto);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', clientId);
      expect(prisma.client.create).toHaveBeenCalledWith({
        data: {
          organizationId: orgId,
          ...dto,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated clients with metadata', async () => {
      prisma.$transaction.mockResolvedValue([
        2,
        [
          { id: 'c1', name: 'Client 1', organizationId: orgId },
          { id: 'c2', name: 'Client 2', organizationId: orgId },
        ],
      ]);

      const result = await service.findAll(orgId, {
        page: 1,
        limit: 10,
        search: 'Client',
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return client if found in current organization', async () => {
      prisma.client.findFirst.mockResolvedValue({
        id: clientId,
        organizationId: orgId,
        name: 'Jane Doe',
        _count: { projects: 1 },
      });

      const result = await service.findOne(orgId, clientId);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', clientId);
    });

    it('should throw NotFoundException if client not in organization', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orgId, 'wrong-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if client has projects', async () => {
      prisma.client.findFirst.mockResolvedValue({
        id: clientId,
        organizationId: orgId,
        _count: { projects: 2 },
      });

      await expect(service.remove(orgId, clientId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should delete client if no projects exist', async () => {
      prisma.client.findFirst.mockResolvedValue({
        id: clientId,
        organizationId: orgId,
        _count: { projects: 0 },
      });
      prisma.client.delete.mockResolvedValue({});

      const result = await service.remove(orgId, clientId);
      expect(result.success).toBe(true);
      expect(prisma.client.delete).toHaveBeenCalledWith({
        where: { id: clientId },
      });
    });
  });
});
