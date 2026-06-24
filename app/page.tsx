"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Upload, BarChart2, Share2, Zap } from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold">StackSat</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-24 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Track Your Crypto Trades with AI
            </h1>
            <p className="text-xl text-gray-400 mb-10">
              Upload slips from Bitkub, Binance TH, and Binance. Our AI
              automatically reads and tracks your transactions, portfolio value,
              and P&L — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
              >
                Start Tracking Free
              </Link>
              <Link
                href="/login"
                className="border border-gray-700 hover:border-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything You Need
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Upload className="h-8 w-8 text-blue-400" />}
                title="AI Slip OCR"
                description="Upload JPG, PNG, or PDF slips from any Thai exchange. Claude AI reads and extracts all transaction data automatically."
              />
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8 text-green-400" />}
                title="Portfolio Dashboard"
                description="Track your portfolio value in THB or USD. See unrealized P&L, cost basis, and allocation breakdown per coin."
              />
              <FeatureCard
                icon={<BarChart2 className="h-8 w-8 text-purple-400" />}
                title="Buy/Sell Charts"
                description="Visualize your trades on TradingView charts. See exactly when you bought and sold with price context."
              />
              <FeatureCard
                icon={<Share2 className="h-8 w-8 text-yellow-400" />}
                title="Share Portfolio"
                description="Generate private share links to show your portfolio to others. Control what data is visible and set expiry dates."
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-orange-400" />}
                title="Lightning Payments"
                description="Subscribe using Bitcoin Lightning Network via BTCPay Server for instant, low-fee payments."
              />
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8 text-cyan-400" />}
                title="Multi-Exchange"
                description="Supports Bitkub, Binance TH, and Binance international. All your trades in one unified view."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to track smarter?</h2>
            <p className="text-gray-400 mb-8">
              Join thousands of Thai crypto traders who track their portfolio
              with StackSat.
            </p>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-colors inline-block"
            >
              Create Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4 text-center text-gray-500 text-sm">
        <p>© 2024 StackSat. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
