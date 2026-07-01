"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, Shield, ShieldCheck, X, Check } from "lucide-react";

interface RolePermissions {
  dashboard: boolean;
  upload: boolean;
  chart: boolean;
  share: boolean;
  subscription: boolean;
  settings: boolean;
}

interface Role {
  id: string;
  name: string;
  label: string;
  permissions: RolePermissions;
  isSystem: boolean;
  createdAt: string;
}

const MENU_ITEMS: { key: keyof RolePermissions; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "upload", label: "Stack Bitcoin" },
  { key: "chart", label: "Chart" },
  { key: "share", label: "Share Portfolio" },
  { key: "subscription", label: "Subscription" },
  { key: "settings", label: "Settings" },
];

const DEFAULT_PERMISSIONS: RolePermissions = {
  dashboard: true,
  upload: true,
  chart: true,
  share: true,
  subscription: true,
  settings: true,
};

function PermissionToggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
        enabled ? "bg-purple-600" : "bg-accent"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function RoleModal({
  role,
  onClose,
  onSave,
}: {
  role: Role | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = role !== null;
  const [label, setLabel] = useState(role?.label ?? "");
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<RolePermissions>(
    role?.permissions ?? { ...DEFAULT_PERMISSIONS }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        const res = await fetch(`/api/admin/roles/${role.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, permissions }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Failed to update");
          return;
        }
      } else {
        const res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, label, permissions }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Failed to create");
          return;
        }
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Role" : "Create New Role"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!isEdit && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Role Name (ชื่อระบบ)</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                placeholder="เช่น VIEWER, ANALYST"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-muted-foreground mt-1">ตัวพิมพ์ใหญ่, ไม่มีช่องว่าง (ใช้ _ แทน)</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Label (ชื่อแสดงผล)</label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="เช่น ผู้ดูอย่างเดียว"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-3">เมนูที่เข้าถึงได้</label>
            <div className="space-y-3">
              {MENU_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <PermissionToggle
                    enabled={permissions[item.key]}
                    onChange={(v) =>
                      setPermissions((prev) => ({ ...prev, [item.key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
            {isEdit && role?.isSystem && (
              <p className="text-xs text-muted-foreground mt-3">
                System role — แก้ไขชื่อและ permissions ได้ แต่ลบไม่ได้
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-foreground text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-foreground text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEdit ? "Save Changes" : "Create Role"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  async function deleteRole(role: Role) {
    if (!confirm(`ลบ role "${role.label}" ออก?`)) return;
    setDeleting(role.id);
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
      if (res.ok) {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to delete");
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {modal.open && (
        <RoleModal
          role={modal.role}
          onClose={() => setModal({ open: false, role: null })}
          onSave={() => {
            setModal({ open: false, role: null });
            fetchRoles();
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground text-sm mt-1">สร้างและกำหนดสิทธิ์การเข้าถึงเมนูสำหรับแต่ละ role</p>
        </div>
        <button
          onClick={() => setModal({ open: true, role: null })}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-foreground text-sm rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          สร้าง Role ใหม่
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {role.isSystem ? (
                    <ShieldCheck className="h-5 w-5 text-purple-400 flex-shrink-0" />
                  ) : (
                    <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{role.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {role.name}
                      </span>
                      {role.isSystem && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-600/20 text-purple-400">
                          System
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setModal({ open: true, role })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Edit role"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => deleteRole(role)}
                      disabled={deleting === role.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
                      title="Delete role"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="mt-4 flex flex-wrap gap-2">
                {MENU_ITEMS.map((item) => (
                  <span
                    key={item.key}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      role.permissions[item.key]
                        ? "bg-green-600/15 text-green-400 border border-green-600/30"
                        : "bg-muted text-muted-foreground border border-border line-through"
                    }`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {roles.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              ยังไม่มี role — กดปุ่ม &quot;สร้าง Role ใหม่&quot; ด้านบน
            </div>
          )}
        </div>
      )}
    </div>
  );
}
