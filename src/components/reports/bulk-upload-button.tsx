"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type UploadStatus =
  | { type: "idle"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const initialStatus: UploadStatus = { type: "idle", message: "" };

export function BulkUploadButton() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>(initialStatus);
  const [isUploading, setIsUploading] = useState(false);

  const handleButtonClick = () => {
    setStatus(initialStatus);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setStatus(initialStatus);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/workouts/import", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          type: "error",
          message: payload?.error ?? "Failed to import workouts.",
        });
        return;
      }

      setStatus({
        type: "success",
        message:
          payload?.message ??
          `Imported ${payload?.inserted ?? 0} workout${payload?.inserted === 1 ? "" : "s"}.`,
      });
      router.refresh();
    } catch (error) {
      console.error("Bulk upload failed", error);
      setStatus({
        type: "error",
        message: "Unexpected error while uploading file.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-end">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        className="rounded-[5px]"
        onClick={handleButtonClick}
        disabled={isUploading}
      >
        {isUploading ? "Uploading..." : "Bulk upload CSV"}
      </Button>
      {status.message && (
        <p
          className={`mt-1 text-xs ${
            status.type === "error" ? "text-red-600" : "text-green-600"
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
