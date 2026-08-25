"use client";

import { Button } from "@/components/ui/button";
import {
  Save,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import type { Designation } from "./types";

interface ToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
  onValidate: () => void;
}

export default function Toolbar({
  onSave,
  onLoad,
  onExport,
  onImport,
  onClear,
  onValidate,
}: ToolbarProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 mb-6">
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button type="button" variant="secondary" onClick={onLoad}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Load Draft
        </Button>
        <Button type="button" variant="secondary" onClick={onExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
        <Button type="button" variant="secondary" onClick={onImport}>
          <Upload className="mr-2 h-4 w-4" />
          Import Data
        </Button>
        <Button type="button" variant="destructive" onClick={onClear}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Form
        </Button>
        <Button
          type="button"
          className="bg-green-600 hover:bg-green-700"
          onClick={onValidate}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Validate Data
        </Button>
      </div>
    </div>
  );
}

export interface StudentDuty {
  name: string;
  designation: Designation;
  students: number | "";
}

export interface CourseAdviser {
  name: string;
  designation: Designation;
  students: number | "";
}
