import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Smartphone,
  BarChart3,
  Bell,
  Calendar,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const supabase = await createClient();
  let appName = 'Gestão Financeira';
  try {
    const { data } = await supabase.rpc('get_system_settings').single();
    appName = (data as any)?.company_name || 'Gestão Financeira';
  } catch {}
  return {
    title: `${appName} - Gestão Financeira Inteligente via WhatsApp`,
    description: `Controle suas finanças pessoais e empresariais de forma simples e inteligente com o ${appName}.`,
  };
}

const features = [
  {
    icon: MessageCircle,
    title: "Registro via WhatsApp",
    description:
      "Envie suas despesas e receitas por mensagem, foto, áudio ou PDF. Nossa IA categoriza tudo automaticamente.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Completo",
    description:
      "Visualize suas finanças em tempo real com gráficos interativos, relatórios detalhados e indicadores de desempenho.",
  },
  {
    icon: Calendar,
    title: "Compromissos e Lembretes",
    description:
      "Gerencie seus compromissos com sincronização automática ao Google Agenda. Nunca perca um prazo.",
  },
  {
    icon: Bell,
    title: "Notificações Inteligentes",
    description:
      "Receba alertas sobre contas a vencer, metas atingidas e resumos financeiros diretamente no WhatsApp.",
  },
  {
    icon: Users,
    title: "Gestão PF e PJ",
    description:
      "Separe suas finanças pessoais e empresariais em um único lugar, com visões e relatórios independentes.",
  },
  {
    icon: Shield,
    title: "Segurança Total",
    description:
      "Seus dados protegidos com criptografia de ponta. Controle de acesso por usuário e permissões granulares.",
  },
];

const highlights = [
  "Categorização automática com IA",
  "Controle de contas a pagar e receber",
  "Relatórios e gráficos em tempo real",
  "Metas financeiras personalizadas",
  "Integração com Google Agenda",
  "Multi-usuário com permissões",
  "Modo PF e PJ separados",
  "Notificações via WhatsApp",
];

export default async function HomePage() {
  const supabase = await createClient();
  let appName = 'Gestão Financeira';
  let primaryColor = '#22C55E';
  try {
    const { data } = await supabase.rpc('get_system_settings').single();
    appName = (data as any)?.company_name || 'Gestão Financeira';
    primaryColor = (data as any)?.primary_color || '#22C55E';
  } catch {}

  return (
    <>
    <style>{`
      .home-primary { color: ${primaryColor}; }
      .home-primary-bg { background-color: ${primaryColor}; }
      .home-primary-bg:hover { background-color: ${primaryColor}; filter: brightness(0.9); }
      .home-primary-border { border-color: ${primaryColor}33; }
      .home-primary-bg-subtle { background-color: ${primaryColor}1a; }
      .home-primary-shadow { box-shadow: 0 10px 15px -3px ${primaryColor}33; }
      .home-primary-shadow:hover { box-shadow: 0 10px 15px -3px ${primaryColor}4d; }
      .home-gradient-text { background: linear-gradient(to right, ${primaryColor}, ${primaryColor}cc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .home-gradient-top { background: linear-gradient(to bottom, ${primaryColor}0d, transparent, transparent); }
      .home-icon-bg { background-color: ${primaryColor}1a; }
      .home-icon-bg-hover:hover { background-color: ${primaryColor}26; }
      .home-icon { color: ${primaryColor}; }
    `}</style>
    <div className="min-h-screen bg-[#060A13] text-white">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-sidebar.png"
                alt={appName}
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-white">
                {appName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="px-5 py-2.5 home-primary-bg text-white text-sm font-medium rounded-lg transition-colors"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 home-gradient-top" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 home-primary-bg-subtle home-primary-border rounded-full home-primary text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Gestão financeira pelo WhatsApp
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Suas finanças no{" "}
              <span className="home-gradient-text">
                controle total
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Registre receitas e despesas pelo WhatsApp, acompanhe tudo em um
              dashboard completo e tome decisões financeiras mais inteligentes
              — para você e sua empresa.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/cadastro"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 home-primary-bg home-primary-shadow text-white font-semibold rounded-xl transition-all"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
              Ferramentas poderosas para simplificar sua gestão financeira
              pessoal e empresarial.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all"
              >
                <div className="w-12 h-12 home-icon-bg home-icon-bg-hover rounded-xl flex items-center justify-center mb-4 transition-colors">
                  <feature.icon className="w-6 h-6 home-icon" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 sm:py-28 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Simplifique sua vida financeira
              </h2>
              <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                Chega de planilhas complicadas e anotações perdidas. Com o
                {appName}, você registra tudo pelo WhatsApp e acompanha suas
                finanças em um painel moderno e intuitivo.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 home-icon flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] home-primary-bg-subtle rounded-3xl border border-white/5 flex items-center justify-center">
                <div className="text-center p-8">
                  <Smartphone className="w-16 h-16 home-icon mx-auto mb-4 opacity-50" />
                  <p className="text-zinc-500 text-sm">
                    Envie uma mensagem no WhatsApp e pronto — sua despesa já
                    está registrada e categorizada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Pronto para transformar sua gestão financeira?
          </h2>
          <p className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto">
            Comece agora e tenha o controle total das suas finanças pessoais e
            empresariais na palma da mão.
          </p>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 px-10 py-4 home-primary-bg home-primary-shadow text-white font-semibold rounded-xl transition-all text-lg"
          >
            Criar Minha Conta Grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-sidebar.png"
                alt={appName}
                width={28}
                height={28}
                className="rounded-lg"
              />
              <span className="text-sm font-semibold text-zinc-400">
                {appName}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <Link
                href="/politica-de-privacidade"
                className="hover:text-zinc-300 transition-colors"
              >
                Política de Privacidade
              </Link>
              <Link
                href="/termos-de-uso"
                className="hover:text-zinc-300 transition-colors"
              >
                Termos de Uso
              </Link>
            </div>
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} {appName}. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
