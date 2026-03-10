"use client";

import { useState } from "react";
import { useChannels } from "@/hooks/useChannels";
import { ScheduleType, CreateScheduleRequest } from "@/lib/scheduler/types";

interface Workspace {
  id: string;
  name: string;
  color: string;
}

interface ScheduleFormProps {
  workspaces: Workspace[];
  onSubmit: (req: CreateScheduleRequest) => Promise<void>;
  onCancel: () => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleForm({ workspaces, onSubmit, onCancel }: ScheduleFormProps) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [channelId, setChannelId] = useState("");
  const [text, setText] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("once");
  const [time, setTime] = useState("09:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [hasEndTime, setHasEndTime] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { channels, isLoading: channelsLoading } = useChannels(workspaceId || null);

  const selectedChannel = channels.find((ch) => ch.id === channelId);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !channelId || !text.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        workspaceId,
        channelId,
        channelName: selectedChannel?.name ?? channelId,
        text: text.trim(),
        scheduleType,
        time,
        daysOfWeek: scheduleType === "days_of_week" ? daysOfWeek : undefined,
        endTime: hasEndTime && endDate ? new Date(endDate + "T23:59:59").getTime() : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200">New Scheduled Message</h3>

      {/* Workspace */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Workspace</label>
        <select
          value={workspaceId}
          onChange={(e) => { setWorkspaceId(e.target.value); setChannelId(""); }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
      </div>

      {/* Channel */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Channel</label>
        <select
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          disabled={channelsLoading}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600 disabled:opacity-50"
        >
          <option value="">{channelsLoading ? "Loading channels..." : "Select a channel"}</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.isIm ? `DM: ${ch.name}` : ch.isPrivate ? `🔒 ${ch.name}` : `# ${ch.name}`}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Message</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600 resize-none"
        />
      </div>

      {/* Schedule Type */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Frequency</label>
        <div className="flex gap-2">
          {(["once", "daily", "days_of_week"] as ScheduleType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setScheduleType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                scheduleType === type
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {type === "once" ? "One Time" : type === "daily" ? "Daily" : "Certain Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Days of Week */}
      {scheduleType === "days_of_week" && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Days</label>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-9 h-8 rounded text-xs font-medium transition-colors ${
                  daysOfWeek.includes(i)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Time</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
        />
      </div>

      {/* End Time */}
      {scheduleType !== "once" && (
        <div>
          <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <input
              type="checkbox"
              checked={hasEndTime}
              onChange={(e) => setHasEndTime(e.target.checked)}
              className="rounded bg-gray-800 border-gray-700"
            />
            End date
          </label>
          {hasEndTime && (
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || !channelId || !text.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Scheduling..." : "Schedule Message"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
