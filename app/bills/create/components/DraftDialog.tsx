"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { listDrafts, deleteDraft, type DraftMeta } from "@/lib/storage/draft";

interface Props {
  mode: "save" | "load";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (name: string) => void;
  onLoad?: (name: string) => void;
}

export default function DraftDialog({
  mode,
  open,
  onOpenChange,
  onSave,
  onLoad,
}: Props) {
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<DraftMeta[]>(() => listDrafts());

  const refresh = () => setDrafts(listDrafts());

  const handleDelete = (draftName: string) => {
    deleteDraft(draftName);
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "save" ? "Save Draft" : "Load Draft"}
          </DialogTitle>
        </DialogHeader>

        {mode === "save" && (
          <div className="space-y-3">
            <Input
              placeholder="e.g. Semester-2024-Bill-01"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              type="button"
              disabled={!name.trim()}
              onClick={() => {
                onSave?.(name.trim());
                setName("");
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {drafts.length === 0 && (
            <p className="text-sm text-gray-500">No saved drafts yet.</p>
          )}
          {drafts.map((d) => (
            <div
              key={d.name}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(d.savedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                {onLoad && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onLoad(d.name);
                      onOpenChange(false);
                    }}
                  >
                    Load
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(d.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}