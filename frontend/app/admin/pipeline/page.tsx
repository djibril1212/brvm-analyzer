import { FlaskConical } from "lucide-react";
import { PipelineRunner } from "@/components/admin/PipelineRunner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipeline — BRVM Daily Analyzer",
  description: "Relancer l'analyse sur un BOC historique.",
};

export default function AdminPipelinePage() {
  return (
    <div className="px-4 sm:px-6 py-5 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <FlaskConical className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
            Pipeline d&apos;analyse
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Relancez l&apos;analyse sur n&apos;importe quelle séance historique BRVM.
          </p>
        </div>
      </div>

      <PipelineRunner />
    </div>
  );
}
