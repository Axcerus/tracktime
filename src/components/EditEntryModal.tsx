"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Trash2 } from "lucide-react";

interface TimeEntryItem {
  id: string;
  description: string | null;
  startTime: number;
  endTime: number | null;
}

interface EditEntryModalProps {
  entry: TimeEntryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditEntryModal({
  entry,
  onClose,
  onSuccess,
}: EditEntryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!entry) return;

    const startDate = new Date(entry.startTime);
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, "0");
    const day = String(startDate.getDate()).padStart(2, "0");
    setDate(`${year}-${month}-${day}`);

    const startH = String(startDate.getHours()).padStart(2, "0");
    const startM = String(startDate.getMinutes()).padStart(2, "0");
    setStartTime(`${startH}:${startM}`);

    if (entry.endTime) {
      const endDate = new Date(entry.endTime);
      const endH = String(endDate.getHours()).padStart(2, "0");
      const endM = String(endDate.getMinutes()).padStart(2, "0");
      setEndTime(`${endH}:${endM}`);
    } else {
      setEndTime("");
    }

    setDescription(entry.description || "");
    setError("");
  }, [entry]);

  if (!entry || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const [startHour, startMin] = startTime.split(":").map(Number);
    const startDate = new Date(`${date}T00:00:00`);
    startDate.setHours(startHour, startMin, 0, 0);
    const startMs = startDate.getTime();

    let endMs: number | null = null;
    if (endTime) {
      const [endHour, endMin] = endTime.split(":").map(Number);
      const endDate = new Date(`${date}T00:00:00`);
      endDate.setHours(endHour, endMin, 0, 0);
      endMs = endDate.getTime();

      if (endMs <= startMs) {
        setError("End time must be after start time.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || null,
          startTime: startMs,
          endTime: endMs,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update entry");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete entry");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-3.5 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md bg-[#fbf9f5] rounded-[20px] sm:rounded-[24px] border-[1.5px] border-[#e5e0d8] shadow-2xl p-4 sm:p-6 relative my-auto">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#e5e0d8]">
          <h2 className="text-[17px] font-bold text-[#26201b]">Edit Work Session</h2>
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
            <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[#797167] mb-1.5">
              Task Note
            </label>
            <input
              type="text"
              placeholder="What were you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-[42px] px-3.5 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[#797167] mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-[42px] px-3.5 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[#797167] mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-[42px] px-3.5 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-[0.1em] text-[#797167] mb-1.5">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                placeholder="--:--"
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-[42px] px-3.5 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#e5e0d8] flex items-center justify-between">
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? "Deleting..." : "Delete"}</span>
            </button>

            <div className="flex items-center space-x-2">
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
                {isSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
