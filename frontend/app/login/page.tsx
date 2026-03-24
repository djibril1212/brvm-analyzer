"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Github, AlertCircle } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <TrendingUp className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">BRVM Analyzer</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Accès privé
            </p>
          </div>
        </div>

        {error === "AccessDenied" && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Accès refusé. Ce compte n&apos;est pas autorisé.
          </div>
        )}

        <Button
          onClick={() => signIn("github", { callbackUrl })}
          className="w-full gap-3"
          size="lg"
        >
          <Github className="w-5 h-5" />
          Continuer avec GitHub
        </Button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
