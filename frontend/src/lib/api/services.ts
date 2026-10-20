import { apiClient } from './client';
import {
  AuthenticatedUser,
  LoginResponse,
  ApiResponse,
  PaginatedResponse,
  Client,
  Project,
  DeliverySummary,
  ProjectHealthResult,
  ProjectRisk,
  ProjectMember,
  Task,
  Milestone,
  ProjectBudget,
  BudgetSummary,
  CostEntry,
  UserResourceProfile,
  ResourceOverviewSummary,
  AIReport,
  ClientPortalDashboard,
  PortfolioSummary,
  QueueMetrics,
  SystemHealthResponse,
} from '@/types';

// ==========================================
// 1. Authentication API
// ==========================================
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => apiClient<AuthenticatedUser>('/auth/me'),

  logout: (refreshToken: string) =>
    apiClient<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

// ==========================================
// 2. Clients API
// ==========================================
export const clientsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient<PaginatedResponse<Client>>('/clients', { params }),

  get: (id: string) => apiClient<ApiResponse<Client>>(`/clients/${id}`),

  create: (data: { name: string; companyName?: string; email: string; phone?: string }) =>
    apiClient<ApiResponse<Client>>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{ name: string; companyName: string; email: string; phone: string }>) =>
    apiClient<ApiResponse<Client>>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/clients/${id}`, {
      method: 'DELETE',
    }),
};

// ==========================================
// 3. Projects API
// ==========================================
export const projectsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string; clientId?: string }) =>
    apiClient<PaginatedResponse<Project>>('/projects', { params }),

  get: (id: string) => apiClient<ApiResponse<Project>>(`/projects/${id}`),

  create: (data: {
    clientId: string;
    name: string;
    description?: string;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
  }) =>
    apiClient<ApiResponse<Project>>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      status: string;
      startDate: string | null;
      endDate: string | null;
    }>,
  ) =>
    apiClient<ApiResponse<Project>>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  getDeliverySummary: (id: string) =>
    apiClient<ApiResponse<DeliverySummary>>(`/projects/${id}/delivery-summary`),

  getHealth: (id: string) =>
    apiClient<ApiResponse<ProjectHealthResult>>(`/projects/${id}/health`),

  getRisks: (id: string) =>
    apiClient<ApiResponse<ProjectRisk[]>>(`/projects/${id}/risks`),

  getResources: (id: string) =>
    apiClient<ApiResponse<any>>(`/projects/${id}/resources`),

  getPortfolioSummary: () =>
    apiClient<ApiResponse<PortfolioSummary>>('/projects/portfolio-summary'),
};

// ==========================================
// 4. Project Members API
// ==========================================
export const projectMembersApi = {
  list: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient<PaginatedResponse<ProjectMember>>(`/projects/${projectId}/members`, { params }),

  add: (projectId: string, data: { userId: string; allocationPercentage?: number; projectRole?: string }) =>
    apiClient<ApiResponse<ProjectMember>>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (projectId: string, memberId: string, data: { allocationPercentage?: number; projectRole?: string }) =>
    apiClient<ApiResponse<ProjectMember>>(`/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (projectId: string, memberId: string) =>
    apiClient<{ success: boolean; message: string }>(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    }),
};

// ==========================================
// 5. Tasks API
// ==========================================
export const tasksApi = {
  list: (projectId: string, params?: { page?: number; limit?: number; status?: string; milestoneId?: string; assigneeId?: string }) =>
    apiClient<PaginatedResponse<Task>>(`/projects/${projectId}/tasks`, { params }),

  get: (projectId: string, taskId: string) =>
    apiClient<ApiResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`),

  create: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      milestoneId?: string;
      assigneeId?: string;
      dueDate?: string;
    },
  ) =>
    apiClient<ApiResponse<Task>>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    projectId: string,
    taskId: string,
    data: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
      milestoneId: string | null;
      assigneeId: string | null;
      dueDate: string | null;
    }>,
  ) =>
    apiClient<ApiResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (projectId: string, taskId: string) =>
    apiClient<{ success: boolean; message: string }>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  listAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    milestoneId?: string;
    assigneeId?: string;
    projectId?: string;
    search?: string;
    dueDate?: string;
  }) => apiClient<PaginatedResponse<Task>>('/tasks', { params }),

  listMy: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    projectId?: string;
    search?: string;
  }) => apiClient<PaginatedResponse<Task>>('/tasks/my', { params }),

  updateDirect: (
    taskId: string,
    data: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
      milestoneId: string | null;
      assigneeId: string | null;
      dueDate: string | null;
    }>,
  ) =>
    apiClient<ApiResponse<Task>>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ==========================================
// 6. Milestones API
// ==========================================
export const milestonesApi = {
  list: (projectId: string, params?: { page?: number; limit?: number; status?: string }) =>
    apiClient<PaginatedResponse<Milestone>>(`/projects/${projectId}/milestones`, { params }),

  get: (projectId: string, milestoneId: string) =>
    apiClient<ApiResponse<Milestone>>(`/projects/${projectId}/milestones/${milestoneId}`),

  create: (
    projectId: string,
    data: { name: string; description?: string; status?: string; dueDate: string },
  ) =>
    apiClient<ApiResponse<Milestone>>(`/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    projectId: string,
    milestoneId: string,
    data: Partial<{ name: string; description: string; status: string; dueDate: string }>,
  ) =>
    apiClient<ApiResponse<Milestone>>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (projectId: string, milestoneId: string) =>
    apiClient<{ success: boolean; message: string }>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: 'DELETE',
    }),
};

// ==========================================
// 7. Budgets & Costs API
// ==========================================
export const budgetsApi = {
  get: (projectId: string) =>
    apiClient<ApiResponse<ProjectBudget>>(`/projects/${projectId}/budget`),

  create: (projectId: string, data: { totalBudget: number; currency?: string; notes?: string }) =>
    apiClient<ApiResponse<ProjectBudget>>(`/projects/${projectId}/budget`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (projectId: string, data: Partial<{ totalBudget: number; currency: string; notes: string }>) =>
    apiClient<ApiResponse<ProjectBudget>>(`/projects/${projectId}/budget`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getSummary: (projectId: string) =>
    apiClient<ApiResponse<BudgetSummary>>(`/projects/${projectId}/budget/summary`),

  getBreakdown: (projectId: string) =>
    apiClient<ApiResponse<Array<{ category: string; amount: number; percentage: number }>>>(
      `/projects/${projectId}/budget/breakdown`,
    ),

  getMonthly: (projectId: string) =>
    apiClient<ApiResponse<Array<{ month: string; amount: number }>>>(
      `/projects/${projectId}/budget/monthly`,
    ),

  listCosts: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient<PaginatedResponse<CostEntry>>(`/projects/${projectId}/budget/costs`, { params }),

  addCost: (
    projectId: string,
    data: { amount: number; category: string; description?: string; incurredAt?: string },
  ) =>
    apiClient<ApiResponse<CostEntry>>(`/projects/${projectId}/budget/costs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCost: (
    projectId: string,
    costEntryId: string,
    data: Partial<{ amount: number; category: string; description: string; incurredAt: string }>,
  ) =>
    apiClient<ApiResponse<CostEntry>>(`/projects/${projectId}/budget/costs/${costEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  removeCost: (projectId: string, costEntryId: string) =>
    apiClient<{ success: boolean; message: string }>(
      `/projects/${projectId}/budget/costs/${costEntryId}`,
      { method: 'DELETE' },
    ),
};

// ==========================================
// 8. Resources API (Internal)
// ==========================================
export const resourcesApi = {
  getOverview: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    apiClient<{
      success: boolean;
      data: UserResourceProfile[];
      meta: any;
      summary: any;
    }>('/resources/overview', { params }),

  getAvailable: () =>
    apiClient<ApiResponse<any[]>>('/resources/available'),

  getOverallocated: () =>
    apiClient<ApiResponse<any[]>>('/resources/overallocated'),

  getUtilization: () =>
    apiClient<ApiResponse<any>>('/resources/utilization'),

  getDistribution: () =>
    apiClient<ApiResponse<any>>('/resources/distribution'),

  getRanking: () =>
    apiClient<ApiResponse<any[]>>('/resources/projects/ranking'),

  getUserProfile: (userId: string) =>
    apiClient<ApiResponse<UserResourceProfile>>(`/resources/users/${userId}`),
};

// ==========================================
// 9. AI Reports API
// ==========================================
export const aiReportsApi = {
  generate: (projectId: string, data: { periodStart?: string; periodEnd?: string }) =>
    apiClient<ApiResponse<AIReport>>(`/projects/${projectId}/ai-reports`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient<PaginatedResponse<AIReport>>(`/projects/${projectId}/ai-reports`, { params }),

  get: (projectId: string, reportId: string) =>
    apiClient<ApiResponse<AIReport>>(`/projects/${projectId}/ai-reports/${reportId}`),
};

// ==========================================
// 10. Client Portal API (Role: CLIENT)
// ==========================================
export const clientPortalApi = {
  getDashboard: () =>
    apiClient<ApiResponse<ClientPortalDashboard>>('/client-portal/dashboard'),

  getProjects: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiClient<PaginatedResponse<any>>('/client-portal/projects', { params }),

  getProject: (projectId: string) =>
    apiClient<ApiResponse<any>>(`/client-portal/projects/${projectId}`),

  getProgress: (projectId: string) =>
    apiClient<ApiResponse<any>>(`/client-portal/projects/${projectId}/progress`),

  getMilestones: (projectId: string) =>
    apiClient<ApiResponse<any[]>>(`/client-portal/projects/${projectId}/milestones`),

  getStatus: (projectId: string) =>
    apiClient<ApiResponse<any>>(`/client-portal/projects/${projectId}/status`),

  getReports: (projectId: string, params?: { page?: number; limit?: number }) =>
    apiClient<PaginatedResponse<any>>(`/client-portal/projects/${projectId}/reports`, { params }),

  getReportById: (projectId: string, reportId: string) =>
    apiClient<ApiResponse<any>>(`/client-portal/projects/${projectId}/reports/${reportId}`),
};

// ==========================================
// 11. System Administration API (Role: SUPER_ADMIN, ADMIN)
// ==========================================
export const systemApi = {
  getHealth: () =>
    apiClient<SystemHealthResponse>('/health'),

  getQueueMetrics: () =>
    apiClient<ApiResponse<QueueMetrics>>('/admin/queues/ai-reports'),
};
