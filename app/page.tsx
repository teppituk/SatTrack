"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Upload, BarChart2, Share2, Zap } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold">StackSats</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Link
              href="/login"
              className="text-foreground hover:text-foreground transition-colors"
            >
              {t("home.login")}
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-foreground px-4 py-2 rounded-lg transition-colors"
            >
              {t("home.getStarted")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-24 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {t("home.heroTitle")}
            </h1>
            <p className="text-xl text-muted-foreground mb-10">
              {t("home.heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-foreground px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
              >
                {t("home.startFree")}
              </Link>
              <Link
                href="/login"
                className="border border-border hover:border-border text-foreground px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
              >
                {t("home.signIn")}
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              {t("home.featuresTitle")}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Upload className="h-8 w-8 text-blue-400" />}
                title={t("home.feature1Title")}
                description={t("home.feature1Desc")}
              />
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8 text-green-400" />}
                title={t("home.feature2Title")}
                description={t("home.feature2Desc")}
              />
              <FeatureCard
                icon={<BarChart2 className="h-8 w-8 text-purple-400" />}
                title={t("home.feature3Title")}
                description={t("home.feature3Desc")}
              />
              <FeatureCard
                icon={<Share2 className="h-8 w-8 text-yellow-400" />}
                title={t("home.feature4Title")}
                description={t("home.feature4Desc")}
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-orange-400" />}
                title={t("home.feature5Title")}
                description={t("home.feature5Desc")}
              />
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8 text-cyan-400" />}
                title={t("home.feature6Title")}
                description={t("home.feature6Desc")}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">{t("home.ctaTitle")}</h2>
            <p className="text-muted-foreground mb-8">
              {t("home.ctaSubtitle")}
            </p>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-foreground px-10 py-4 rounded-xl font-semibold text-lg transition-colors inline-block"
            >
              {t("home.ctaButton")}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center text-muted-foreground text-sm">
        <p>{t("home.footer")}</p>
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
    <div className="bg-muted rounded-xl p-6 border border-border hover:border-border transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
