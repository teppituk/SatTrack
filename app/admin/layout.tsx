import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AdminNav } from "@/components/admin-nav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard?error=unauthorized")
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <AdminNav />
      <main className="ml-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
