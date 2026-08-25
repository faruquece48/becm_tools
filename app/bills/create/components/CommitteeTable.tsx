"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { CommitteeMember } from "./types";

const committeeDesignations = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
] as const;

interface Props {
  committees: CommitteeMember[];
  setCommittees: (data: CommitteeMember[]) => void;
}

export default function CommitteeTable({ committees, setCommittees }: Props) {
  const addMember = () => {
    setCommittees([
      ...committees,
      {
        name: "",
        designation: "",
        department: "Dept. of BECM, RUET",
        role: "Member",
      },
    ]);
  };

  const removeMember = (index: number) => {
    setCommittees(committees.filter((_, i) => i !== index));
  };

  const updateMember = (
    index: number,
    field: keyof CommitteeMember,
    value: string
  ) => {
    const updated = [...committees];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setCommittees(updated);
  };

  return (
    <div className="rounded-xl border p-6 space-y-6">
      <h2 className="text-xl font-bold">2. Examination Committee</h2>
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Sl.</TableHead>
            <TableHead className="w-[28%]">Teacher Name</TableHead>
            <TableHead className="w-[18%]">Designation</TableHead>
            <TableHead className="w-[20%]">Department</TableHead>
            <TableHead className="w-[18%]">Role</TableHead>
            <TableHead className="w-16 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {committees.map((member, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <Input
                  placeholder="Teacher Name"
                  value={member.name}
                  onChange={(e) => updateMember(index, "name", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={member.designation.replace(/ & Head$/, "")}
                  onValueChange={(value) => {
                    if (value !== null) {
                      updateMember(
                        index,
                        "designation",
                        index === 0 ? `${value} & Head` : value
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {committeeDesignations.map((designation) => (
                      <SelectItem key={designation} value={designation}>
                        {designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Department"
                  value={member.department}
                  onChange={(e) =>
                    updateMember(index, "department", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <Select
                  value={member.role}
                  onValueChange={(value) => value !== null && updateMember(index, "role", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chairman">Chairman</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="External Member">
                      External Member
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeMember(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button onClick={addMember}>
        <Plus className="mr-2 h-4 w-4" />
        Add Member
      </Button>
    </div>
  );
}
