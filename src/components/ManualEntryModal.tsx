"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const emptySubscribe = () => () => {};

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualEntryModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualEntryModalProps) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getTodayDateStr());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startDate = new Date(`${date}T00:00:00`);
    startDate.setHours(startHour, startMin, 0, 0);

    const endDate = new Date(`${date}T00:00:00`);
    endDate.setHours(endHour, endMin, 0, 0);

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    if (endMs <= startMs) {
      setError("End time must be later than start time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || null,
          startTime: startMs,
          endTime: endMs,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to log entry");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-3.5 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md bg-[#fbf9f5] rounded-[20px] sm:rounded-3xl border-[1.5px] border-[#e5e0d8] shadow-2xl p-4 sm:p-6 relative my-auto">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#e5e0d8]">
          <h2 className="text-[17px] font-bold text-[#26201b]">Log Missed Work Session</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#797167] hover:text-[#26201b] p-1 rounded-lg hover:bg-[#ede8df] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3.5 p-3 bg-[#fdf2f2] border border-[#f0c2c2] text-[#b91c1c] text-xs font-medium rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-widest text-[#797167] mb-1.5">
              What were you working on?
            </label>
            <input
              type="text"
              placeholder="e.g. Design review, client call"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10.5 px-3.5 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-widest text-[#797167] mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10.5 px-3.5 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-widest text-[#797167] mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10.5 px-3.5 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-widest text-[#797167] mb-1.5">
                End Time
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-10.5 px-3.5 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13.5px] font-medium text-[#797167] hover:text-[#26201b] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#26201b] hover:bg-[#3d352e] text-white text-[13.5px] font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSubmitting ? "Saving..." : "Save session"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
