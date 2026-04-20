"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toggleEmpleadoEstado } from "@/actions/empleado.actions";

interface ToggleEmpleadoEstadoButtonProps {
  empleadoId: string;
  estado: string;
  nombre: string;
}

export function ToggleEmpleadoEstadoButton({
  empleadoId,
  estado,
  nombre,
}: ToggleEmpleadoEstadoButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggle() {
    setIsToggling(true);
    const res = await toggleEmpleadoEstado(empleadoId);
    if (res.success) {
      toast("Estado actualizado", {
        description: res.message,
        position: "top-right",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast("Error al cambiar estado", {
        description: res.message,
        position: "top-right",
      });
    }
    setIsToggling(false);
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Power
          className={`size-4 ${
            estado === "activo" ? "text-emerald-600" : "text-muted-foreground"
          }`}
        />
        {estado === "activo" ? "Desactivar" : "Activar"}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {estado === "activo"
                ? "Desactivar Empleado"
                : "Activar Empleado"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {estado === "activo"
                ? `¿Estás seguro de desactivar a "${nombre}"?`
                : `¿Estás seguro de activar a "${nombre}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              disabled={isToggling}
              variant={estado === "activo" ? "destructive" : "default"}
            >
              {isToggling ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
