"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle,
  KeyRound,
  Mail,
  MoreHorizontal,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  listUsers,
  updateUserRole,
  updateUserEmail,
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UsuariosTable({ usuarios: initial }: { usuarios: Usuario[] }) {
  const [usuarios, setUsuarios] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [editingEmail, setEditingEmail] = useState<Usuario | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  const [resettingPasswordFor, setResettingPasswordFor] = useState<Usuario | null>(null);
  const [resetting, setResetting] = useState(false);

  const usuariosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => {
      const roleLabel =
        u.role === "admin" ? "admin" : u.role === "rrhh" ? "rrhh" : "empleado";
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleLabel.includes(q)
      );
    });
  }, [usuarios, search]);

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
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, banned: true, banReason: "Bloqueado por administrador" } : u,
          ),
        );
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
        setUsuarios((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, banned: false, banReason: null } : u)),
        );
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al desbloquear");
    } finally {
      setLoading(false);
    }
  }

  function openEditEmail(u: Usuario) {
    setEditingEmail(u);
    setNewEmail(u.email);
    setEmailError(null);
  }

  function closeEditEmail() {
    if (savingEmail) return;
    setEditingEmail(null);
    setNewEmail("");
    setEmailError(null);
  }

  async function handleSaveEmail() {
    if (!editingEmail) return;
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      setEmailError("El correo es obligatorio.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("Formato de correo inválido.");
      return;
    }
    if (trimmed === editingEmail.email.toLowerCase()) {
      setEmailError("El nuevo correo es igual al actual.");
      return;
    }
    setEmailError(null);
    setSavingEmail(true);
    try {
      const result = await updateUserEmail({ userId: editingEmail.id, email: trimmed });
      if (result.success) {
        const updated = (result.data as { email?: string })?.email ?? trimmed;
        toast.success(result.message);
        setUsuarios((prev) =>
          prev.map((u) => (u.id === editingEmail.id ? { ...u, email: updated } : u)),
        );
        setEditingEmail(null);
        setNewEmail("");
      } else {
        setEmailError(result.message);
      }
    } catch {
      setEmailError("Error al actualizar el correo.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleConfirmResetPassword() {
    if (!resettingPasswordFor) return;
    setResetting(true);
    try {
      const result = await resetUserPassword(resettingPasswordFor.id);
      if (result.success) {
        toast.success(result.message);
        setResettingPasswordFor(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al restablecer contraseña");
    } finally {
      setResetting(false);
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
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Usuarios del sistema</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, email o rol…"
                  className="h-8 w-64 pl-8 pr-8"
                  aria-label="Buscar usuarios"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <Button variant="ghost" size="sm" onClick={refresh} aria-label="Recargar usuarios">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usuarios.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No hay usuarios registrados.
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No se encontraron usuarios que coincidan con{" "}
              <span className="font-medium text-foreground">&quot;{search}&quot;</span>.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right w-12">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosFiltrados.map((u) => (
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
                          <SelectValue>{roleBadge(u.role)}</SelectValue>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={loading}
                            aria-label={`Acciones de ${u.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => openEditEmail(u)}>
                            <Mail className="h-4 w-4" />
                            Editar correo
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setResettingPasswordFor(u)}>
                            <KeyRound className="h-4 w-4" />
                            Restablecer contraseña
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.banned ? (
                            <DropdownMenuItem onSelect={() => handleUnban(u.id)}>
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              Desbloquear
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => handleBan(u.id)}
                              variant="destructive"
                            >
                              <Ban className="h-4 w-4" />
                              Bloquear
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editingEmail !== null}
        onOpenChange={(open) => {
          if (!open) closeEditEmail();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar correo electrónico</DialogTitle>
            <DialogDescription>
              {editingEmail ? (
                <>
                  Cambiá el correo de <strong>{editingEmail.name}</strong>. El usuario deberá
                  re-iniciar sesión con el nuevo correo. Las sesiones activas serán revocadas.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="user-email">Nuevo correo electrónico</FieldLabel>
            <Input
              id="user-email"
              type="email"
              autoComplete="off"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              disabled={savingEmail}
              aria-invalid={emailError ? true : undefined}
              placeholder="usuario@empresa.cr"
            />
            {emailError ? <FieldError>{emailError}</FieldError> : null}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={savingEmail}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveEmail} disabled={savingEmail}>
              {savingEmail ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={resettingPasswordFor !== null}
        onOpenChange={(open) => {
          if (!open && !resetting) setResettingPasswordFor(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restablecer contraseña</AlertDialogTitle>
            <AlertDialogDescription>
              {resettingPasswordFor ? (
                <>
                  Se generará una nueva contraseña temporal para{" "}
                  <strong>{resettingPasswordFor.name}</strong> (
                  {resettingPasswordFor.email}) y se le enviará por correo. Las sesiones
                  activas del usuario serán cerradas.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmResetPassword} disabled={resetting}>
              {resetting ? "Enviando…" : "Restablecer y enviar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
