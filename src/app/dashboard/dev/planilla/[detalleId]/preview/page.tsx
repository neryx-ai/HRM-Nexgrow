import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Code2, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getColillaPreview } from "@/actions/colilla-preview.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PreviewData {
  html: string;
  empleadoNombre: string;
  empleadoCedula: string;
  planillaId: string;
  periodo: string;
  tipo: string;
  estado: string;
}

export default async function ColillaPreviewPage({
  params,
}: {
  params: Promise<{ detalleId: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const { detalleId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    notFound();
  }

  const userRole =
    (session.user as { role?: string })?.role || "empleado";
  if (!["admin", "rrhh"].includes(userRole)) {
    notFound();
  }

  const result = await getColillaPreview(detalleId);

  if (!result.success || !result.data) {
    return (
      <div className="p-2 md:pr-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {result.message || "No se pudo generar el preview"}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href={`/dashboard/payroll`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver a planillas
          </Link>
        </Button>
      </div>
    );
  }

  const data = result.data as PreviewData;

  return (
    <div className="p-2 md:pr-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/payroll/${data.planillaId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                Preview colilla — {data.empleadoNombre}
              </h2>
              <Badge variant="outline" className="font-mono">
                {data.empleadoCedula}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.tipo === "mensual" ? "Planilla mensual" : "Planilla quincenal"}
              {" · "}
              {data.periodo}
              {" · "}
              Estado: {data.estado}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 dark:text-amber-200">
          <strong>Modo desarrollo.</strong> Esta vista muestra el HTML del email
          que se enviará al empleado. La ruta{" "}
          <code>/dashboard/dev/planilla/[id]/preview</code> devuelve 404 en
          producción.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-md bg-stone-100 dark:bg-stone-900 p-4 sm:p-8 overflow-hidden">
          <div className="mx-auto max-w-[640px]">
            <iframe
              title="Preview del email de colilla"
              srcDoc={data.html}
              sandbox=""
              className="w-full bg-white rounded-md shadow-sm border"
              style={{ height: "1100px" }}
            />
          </div>
        </div>

        <details className="rounded-md border bg-card text-card-foreground lg:w-[420px] self-start">
          <summary className="cursor-pointer select-none px-4 py-3 font-medium text-sm flex items-center gap-2 hover:bg-muted/40 rounded-md">
            <Code2 className="h-4 w-4" />
            Ver código fuente HTML
          </summary>
          <pre className="text-xs overflow-auto max-h-[1100px] p-4 border-t bg-muted/30 whitespace-pre-wrap break-all">
            {data.html}
          </pre>
        </details>
      </div>
    </div>
  );
}
