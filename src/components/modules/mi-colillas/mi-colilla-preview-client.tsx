"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DownloadAction = (
  detalleId: string,
) => Promise<{
  success: boolean;
  message: string;
  data?: unknown;
}>;

export function MiColillaPreviewClient({
  detalleId,
  downloadAction,
}: {
  detalleId: string;
  downloadAction: DownloadAction;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const result = await downloadAction(detalleId);
      if (result.success && result.data) {
        const d = result.data as {
          base64: string;
          filename: string;
          contentType: string;
        };
        const binary = atob(d.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: d.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = d.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF descargado");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al descargar PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleDownload} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Descargar PDF
    </Button>
  );
}