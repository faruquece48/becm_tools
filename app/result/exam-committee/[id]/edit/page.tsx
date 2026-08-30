import ExamCommitteeForm from "@/components/ExamCommitteeForm";

export default async function EditExamCommitteePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExamCommitteeForm mode="edit" recordId={id} />;
}