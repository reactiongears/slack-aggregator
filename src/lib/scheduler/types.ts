export type ScheduleType = "once" | "daily" | "days_of_week";

export interface ScheduledMessage {
  id: string;
  workspaceId: string;
  channelId: string;
  channelName: string;
  text: string;
  scheduleType: ScheduleType;
  time: string; // HH:MM in local time
  daysOfWeek: number[] | null; // 0=Sun, 1=Mon, ..., 6=Sat
  nextRun: number; // Unix timestamp ms
  endTime: number | null; // Unix timestamp ms, null = never end
  enabled: boolean;
  lastSent: number | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateScheduleRequest {
  workspaceId: string;
  channelId: string;
  channelName: string;
  text: string;
  scheduleType: ScheduleType;
  time: string; // HH:MM
  daysOfWeek?: number[];
  endTime?: number | null;
}

export interface UpdateScheduleRequest {
  text?: string;
  scheduleType?: ScheduleType;
  time?: string;
  daysOfWeek?: number[];
  endTime?: number | null;
  enabled?: boolean;
}
