"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listUsers,
  updateUserRole,
  banUser,
  unbanUser,
  resetUserPassword,
} from "@/actions/user.actions";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean | null;
  banReason: string | null;
  emailVerified: boolean | null;
  createdAt: Date;
}

export function UsuariosTable({ usuarios: initial }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const result = await listUsers();
    if (result.success) {
      const data = result.data as { users: Usuario[] };
      setUsuarios(data.users);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    setLoading(true);
    try {
      const result = await updateUserRole(userId, role);
      if (result.success) {
        toast.success(result.message);
        setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al cambiar rol");
    } finally {
      setLoading(false);
    }
  }

  async function handleBan(userId: string) {
    setLoading(true);
    try {
      const result = await banUser(userId, "Bloqueado por administrador");
      if (result.success) {
        toast.success(result.message);
        setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: true, banReason: "Bloqueado por administrador" } : u)));
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al bloquear");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnban(userId: string) {
    setLoading(true);
    try {
      const result = await unbanUser(userId);
      if (result.success) {
        toast.success(result.message);
        setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: false, banReason: null } : u)));
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al desbloquear");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(userId: string) {
    setLoading(true);
    try {
      const result = await resetUserPassword(userId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al restablecer contraseña");
    } finally {
      setLoading(false);
    }
  }

  const roleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      rrhh: "secondary",
      empleado: "outline",
    };
    return (
      <Badge variant={variants[role] || "outline"}>
        {role === "admin" ? "Admin" : role === "rrhh" ? "RRHH" : "Empleado"}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Usuarios del sistema</span>
          <Button variant="ghost" size="sm" onClick={refresh} aria-label="Recargar usuarios">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {usuarios.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No hay usuarios registrados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-32 h-8" aria-label={`Rol de ${u.name}`}>
                        <SelectValue>
                          {roleBadge(u.role)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="rrhh">RRHH</SelectItem>
                        <SelectItem value="empleado">Empleado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.banned ? (
                      <Badge variant="destructive">Bloqueado</Badge>
                    ) : (
                      <Badge variant="default">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {u.banned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnban(u.id)}
                          disabled={loading}
                          aria-label={`Desbloquear ${u.name}`}
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBan(u.id)}
                          disabled={loading}
                          aria-label={`Bloquear ${u.name}`}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(u.id)}
                        disabled={loading}
                        aria-label={`Restablecer contraseña de ${u.name}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
