import { apiClient } from "../client";
import type {
  AlertDto,
  NotificationDto,
  PaginatedResponse,
} from "../types";

export const alertsApi = {
  // Alerts
  listAlerts: async (params?: { projectId?: string; severity?: string; status?: string }): Promise<AlertDto[]> => {
    return apiClient.get<AlertDto[]>("/alerts", { params });
  },

  getAlertById: async (id: string): Promise<AlertDto> => {
    return apiClient.get<AlertDto>(`/alerts/${id}`);
  },

  acknowledgeAlert: async (id: string): Promise<AlertDto> => {
    return apiClient.patch<AlertDto>(`/alerts/${id}/acknowledge`);
  },

  resolveAlert: async (id: string, resolutionNotes?: string): Promise<AlertDto> => {
    return apiClient.patch<AlertDto>(`/alerts/${id}/resolve`, { resolutionNotes });
  },

  dismissAlert: async (id: string, reason?: string): Promise<AlertDto> => {
    return apiClient.patch<AlertDto>(`/alerts/${id}/dismiss`, { reason });
  },

  // Notifications
  listNotifications: async (params?: { isRead?: boolean }): Promise<NotificationDto[]> => {
    return apiClient.get<NotificationDto[]>("/notifications", { params });
  },

  getUnreadCount: async (): Promise<{ count: number; unreadCount: number }> => {
    const res = await apiClient.get<{ count?: number; unreadCount?: number }>("/notifications/unread-count");
    const num = res.unreadCount ?? res.count ?? 0;
    return { count: num, unreadCount: num };
  },

  markRead: async (id: string): Promise<NotificationDto> => {
    return apiClient.patch<NotificationDto>(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    return apiClient.post("/notifications/mark-all-read");
  },
};
