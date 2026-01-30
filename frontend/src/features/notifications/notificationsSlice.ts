import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

export interface Alert {
  id: string;
  level: "CRITICAL" | "INFO";
  message: string;
  vessel_id: string;
  vessel_name: string;
  timestamp: string;
  read: boolean;
}

interface NotificationsState {
  alerts: Alert[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  alerts: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addAlert: (state, action: PayloadAction<Omit<Alert, "id" | "read">>) => {
      const newAlert: Alert = {
        ...action.payload,
        id: `${Date.now()}-${Math.random()}`,
        read: false,
      };

      // Add to beginning of array (newest first)
      state.alerts.unshift(newAlert);

      // Increment unread count
      state.unreadCount += 1;

      // Keep only last 50 alerts
      if (state.alerts.length > 50) {
        state.alerts = state.alerts.slice(0, 50);
      }
    },

    markAsRead: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find((a) => a.id === action.payload);
      if (alert && !alert.read) {
        alert.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    markAllAsRead: (state) => {
      state.alerts.forEach((alert) => {
        alert.read = true;
      });
      state.unreadCount = 0;
    },

    clearAlerts: (state) => {
      state.alerts = [];
      state.unreadCount = 0;
    },

    removeAlert: (state, action: PayloadAction<string>) => {
      const index = state.alerts.findIndex((a) => a.id === action.payload);
      if (index !== -1) {
        if (!state.alerts[index].read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.alerts.splice(index, 1);
      }
    },
  },
});

export const { addAlert, markAsRead, markAllAsRead, clearAlerts, removeAlert } =
  notificationsSlice.actions;

export const selectAlerts = (state: RootState) => state.notifications.alerts;
export const selectUnreadCount = (state: RootState) =>
  state.notifications.unreadCount;

export default notificationsSlice.reducer;