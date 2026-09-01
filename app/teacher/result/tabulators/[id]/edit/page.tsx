import { use } from "react";
import TabulatorForm from "@/components/TabulatorForm";

export default function EditTabulatorPage({ params }: PageProps<"/teacher/result/tabulators/[id]/edit">) {
  const { id } = use(params);
  return <TabulatorForm mode="edit" recordId={id} />;
}