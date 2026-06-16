"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  plan: string;
  lastSeenAt: string | null;
  createdAt: string;
  _count: { transactions: number };
}

interface Role {
  id: string;
  name: string;
  label: string;
  isSystem: boolean;
}

function OnlineBadge({ lastSeenAt }: { lastSeenAt: string | null }) {
  const isOnline = lastSeenAt != null && Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? "bg-green-400" : "bg-gray-600"}`} />
      <span className={`text-xs ${isOnline ? "text-green-400" : "text-gray-500"}`}>
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        setFetchError(data.error ?? `Error ${res.status}`);
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((d) => { if (d.roles) setRoles(d.roles); })
      .catch(() => {});
  }, []);

  async function updateUser(id: string, data: { role?: string; isActive?: boolean }) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed to update user");
      }
    } finally {
      setUpdating(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-gray-400 text-sm mt-1">
          {total} user{total !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
          >
            Search
          </button>
          {(search || searchInput) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Roles</option>
            {roles.map((r) => (
              <option key={r.name} value={r.name}>{r.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-400">
          ⚠️ โหลดข้อมูลไม่สำเร็จ: {fetchError}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Online</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-left px-5 py-3">Transactions</th>
                <th className="text-left px-5 py-3">Joined</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === session?.user?.id;
                  const isUpdating = updating === user.id;

                  return (
                    <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                      <td className="px-5 py-3 text-white">
                        <span className="truncate max-w-[200px] block">{user.email}</span>
                        {isSelf && (
                          <span className="text-xs text-purple-400">(you)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-300">{user.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <OnlineBadge lastSeenAt={user.lastSeenAt} />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={user.role}
                          disabled={isUpdating || isSelf}
                          onChange={(e) => updateUser(user.id, { role: e.target.value })}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {roles.length > 0 ? (
                            roles.map((r) => (
                              <option key={r.name} value={r.name}>{r.label}</option>
                            ))
                          ) : (
                            <option value={user.role}>{user.role}</option>
                          )}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          disabled={isUpdating || isSelf}
                          onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            user.isActive
                              ? "bg-green-600/20 text-green-400 hover:bg-green-600/40"
                              : "bg-red-600/20 text-red-400 hover:bg-red-600/40"
                          }`}
                        >
                          {isUpdating ? "..." : user.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300 capitalize">
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-center">
                        {user._count.transactions}
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            disabled={isUpdating || isSelf}
                            onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                            className={`text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              user.isActive
                                ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                                : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                            }`}
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded bg-gray-800 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
