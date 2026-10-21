import {
  PrismaClient,
  Role,
  ProjectStatus,
  MilestoneStatus,
  TaskStatus,
  TaskPriority,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma seeding for ClientPulse...');

  // Development/Demo seed password hash (Password123!)
  const devPasswordHash = await bcrypt.hash('Password123!', 10);

  // Clean existing seed data idempotently
  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Digital Agency',
      slug: 'acme-digital',
    },
  });
  console.log(`Created Organization: ${org.name} (${org.id})`);

  // 2. Client A
  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'Global Retail Customer Success',
      companyName: 'Global Retail Enterprises Inc.',
      email: 'contact@globalretail.example.com',
      phone: '+1-555-0199',
    },
  });
  console.log(`Created Client A: ${client.companyName}`);

  // 3. Client B (for multi-client isolation demonstration)
  const clientB = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'OmniHealth Solutions',
      companyName: 'OmniHealth Inc.',
      email: 'contact@omnihealth.example.com',
      phone: '+1-555-0288',
    },
  });
  console.log(`Created Client B: ${clientB.companyName}`);

  // 4. Users with distinct roles
  const superAdminUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Sarah SuperAdmin',
      email: 'superadmin@acme.example.com',
      passwordHash: devPasswordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Alice Administrator',
      email: 'admin@acme.example.com',
      passwordHash: devPasswordHash,
      role: Role.ADMIN,
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Bob ProjectManager',
      email: 'pm@acme.example.com',
      passwordHash: devPasswordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const leadUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Carol TeamLead',
      email: 'lead@acme.example.com',
      passwordHash: devPasswordHash,
      role: Role.TEAM_LEAD,
    },
  });

  const devUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'David Developer',
      email: 'dev@acme.example.com',
      passwordHash: devPasswordHash,
      role: Role.TEAM_MEMBER,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      name: 'Emma ClientRep',
      email: 'client.rep@globalretail.example.com',
      passwordHash: devPasswordHash,
      role: Role.CLIENT,
    },
  });

  const clientUserB = await prisma.user.create({
    data: {
      organizationId: org.id,
      clientId: clientB.id,
      name: 'Frank HealthRep',
      email: 'client.rep@omnihealth.example.com',
      passwordHash: devPasswordHash,
      role: Role.CLIENT,
    },
  });
  console.log(
    'Created 7 users (Super Admin, Admin, PM, Team Lead, Team Member, Client A Rep, Client B Rep)',
  );

  // 4. Projects
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      name: 'E-Commerce Re-platforming',
      description:
        'Modernizing core checkout flow, catalogue search, and omni-channel customer portal.',
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2027-04-30T00:00:00.000Z'),
    },
  });
  console.log(`Created Project A: ${project.name}`);

  const projectB = await prisma.project.create({
    data: {
      organizationId: org.id,
      clientId: clientB.id,
      name: 'OmniHealth Telemedicine Suite',
      description:
        'Secure HIPAA-compliant teleconsultation and prescription management portal.',
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T00:00:00.000Z'),
    },
  });
  console.log(`Created Project B: ${projectB.name}`);

  // 5. Two Project Members
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: leadUser.id,
      allocationPercentage: 100,
    },
  });

  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: devUser.id,
      allocationPercentage: 80,
    },
  });
  console.log('Created 2 project members');

  // 6. Three Milestones
  const milestone1 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      name: 'Architecture & Schema Design',
      description: 'Domain modeling, data contracts, and environment setup',
      status: MilestoneStatus.COMPLETED,
      dueDate: new Date('2026-10-15T00:00:00.000Z'),
      completedAt: new Date('2026-10-07T00:00:00.000Z'),
    },
  });

  const milestone2 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      name: 'Core API & Service Layer',
      description: 'Core domain services, validation pipelines, and DTOs',
      status: MilestoneStatus.IN_PROGRESS,
      dueDate: new Date('2026-11-15T00:00:00.000Z'),
    },
  });

  const milestone3 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      name: 'Checkout Integration & QA',
      description: 'End-to-end checkout flow, third-party gateway, and tests',
      status: MilestoneStatus.PENDING,
      dueDate: new Date('2026-12-20T00:00:00.000Z'),
    },
  });
  console.log('Created 3 milestones');

  // 7. Five Tasks
  await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: milestone1.id,
      assigneeId: leadUser.id,
      title: 'Design PostgreSQL schema & relational indexes',
      description: 'Define relational models for multi-tenant isolation',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: new Date('2026-10-05T00:00:00.000Z'),
      completedAt: new Date('2026-10-05T00:00:00.000Z'),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: milestone1.id,
      assigneeId: devUser.id,
      title: 'Implement Health & Config Module',
      description: 'Set up global validation pipe, health check, and error filter',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2026-10-07T00:00:00.000Z'),
      completedAt: new Date('2026-10-07T00:00:00.000Z'),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: milestone2.id,
      assigneeId: devUser.id,
      title: 'Build Product Catalog REST endpoints',
      description: 'Pagination, search filtering, and inventory availability',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: new Date('2026-10-25T00:00:00.000Z'),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: milestone2.id,
      assigneeId: leadUser.id,
      title: 'Set up Payment Gateway Webhook handlers',
      description: 'Idempotent webhook ingestion and order status transitions',
      status: TaskStatus.TODO,
      priority: TaskPriority.URGENT,
      dueDate: new Date('2026-11-05T00:00:00.000Z'),
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      milestoneId: milestone3.id,
      assigneeId: devUser.id,
      title: 'End-to-end checkout flow load testing',
      description: 'Simulate high concurrency checkout traffic and assess latency',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2026-12-10T00:00:00.000Z'),
    },
  });
  console.log('Created 5 tasks');

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
