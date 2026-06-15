"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  ArrowUpDown,
  TrendingUp,
  UserPlus,
  Activity,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  totalTransactions: number;
  totalVolumeTHB: number;
  newUsersThisMonth: number;
  transactionsThisMonth: number;
}

interface RecentUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  totalValue: number;
  currency: string;
  txDate: string;
  user: { email: string };
  coin: { symbol: string }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">{label}</p>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersRes, txRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/users?limit=5&page=1"),
          fetch("/api/admin/transactions?limit=5"),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (usersRes.ok) {
          const data = await usersRes.json();
          setRecentUsers(data.users ?? []);
        }
        if (txRes.ok) {
          const data = await txRes.json();
          setRecentTx(data.transactions ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const formatTHB = (value: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-gray-400 text-sm mt-1">System-wide statistics and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          sub={`${stats?.adminCount ?? 0} admins`}
          color="bg-blue-600/20 text-blue-400"
        />
        <StatCard
          icon={UserCheck}
          label="Active Users"
          value={stats?.activeUsers ?? 0}
          sub={`${((stats?.activeUsers ?? 0) / Math.max(stats?.totalUsers ?? 1, 1) * 100).toFixed(0)}% of total`}
          color="bg-green-600/20 text-green-400"
        />
        <StatCard
          icon={ArrowUpDown}
          label="Total Transactions"
          value={stats?.totalTransactions ?? 0}
          sub={`${stats?.transactionsThisMonth ?? 0} this month`}
          color="bg-purple-600/20 text-purple-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Volume (THB)"
          value={formatTHB(stats?.totalVolumeTHB ?? 0)}
          color="bg-yellow-600/20 text-yellow-400"
        />
        <StatCard
          icon={UserPlus}
          label="New Users This Month"
          value={stats?.newUsersThisMonth ?? 0}
          color="bg-cyan-600/20 text-cyan-400"
        />
        <StatCard
          icon={Activity}
          label="Transactions This Month"
          value={stats?.transactionsThisMonth ?? 0}
          color="bg-orange-600/20 text-orange-400"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-base font-semibold text-white">Recent Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                      <td className="px-5 py-3 text-white truncate max-w-[180px]">{u.email}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.role === "ADMIN"
                              ? "bg-purple-600/20 text-purple-400"
                              : "bg-blue-600/20 text-blue-400"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.isActive
                              ? "bg-green-600/20 text-green-400"
                              : "bg-red-600/20 text-red-400"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-base font-semibold text-white">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left px-5 py-3">User</th>
                  <th className="text-left px-5 py-3">Coin</th>
                  <th className="text-left px-5 py-3">Type</th>
                  <th className="text-left px-5 py-3">Value</th>
                  <th className="text-left px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  recentTx.map((tx) => (
                    <tr key={tx.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                      <td className="px-5 py-3 text-white truncate max-w-[140px]">
                        {tx.user?.email ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-300">{tx.coin?.symbol ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.type === "BUY"
                              ? "bg-green-600/20 text-green-400"
                              : "bg-red-600/20 text-red-400"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-300">
                        {tx.totalValue.toLocaleString()} {tx.currency}
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(tx.txDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
