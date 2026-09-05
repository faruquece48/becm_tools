import { createRoot } from "react-dom/client";
import { useState } from "react";
import BillCreate from "../../app/bills/create/page";
import BillPreview from "../../app/bills/preview/page";

function OfflineBills() {
  const [page, setPage] = useState<"create" | "preview">("create");
  return <>
    <nav aria-label="Bill pages" className="mx-auto flex max-w-6xl gap-3 px-8 pt-6">
      {(["create", "preview"] as const).map((target) => (
        <button key={target} type="button" aria-current={page === target ? "page" : undefined}
          className={`rounded-lg border px-5 py-2 text-sm font-medium ${page === target ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}
          onClick={() => setPage(target)}>
          {target === "create" ? "Create Bill" : "Preview"}
        </button>
      ))}
    </nav>
    {page === "create" ? <BillCreate /> : <BillPreview />}
  </>;
}

createRoot(document.getElementById("root")!).render(<OfflineBills />);
