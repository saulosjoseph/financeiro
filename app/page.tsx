'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { 
  Wallet, 
  Target, 
  CheckSquare, 
  Users, 
  BarChart3, 
  RefreshCw,
  Shield,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-blue-100 dark:bg-blue-950 p-4">
            <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Familiar
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
          A plataforma completa de gestão familiar. Organize finanças, tarefas, metas e muito mais em colaboração com toda a família.
        </p>
        <button
          onClick={() => signIn('google')}
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
        >
          Começar Agora
          <ArrowRight className="h-5 w-5" />
        </button>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Tudo que sua família precisa em um só lugar
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Collaborative Family */}
          <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow">
            <div className="rounded-full bg-orange-100 dark:bg-orange-950 p-3 w-fit mb-4">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gestão Familiar</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Centralize a organização familiar. Convide membros, colabore em tempo real e mantenha todos alinhados.
            </p>
          </div>

          {/* Financial Management */}
          <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow">
            <div className="rounded-full bg-blue-100 dark:bg-blue-950 p-3 w-fit mb-4">
              <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Controle Financeiro</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Gerencie entradas, saídas e transferências. Acompanhe o orçamento familiar com transparência total.
            </p>
          </div>

          {/* Tasks */}
          <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow">
            <div className="rounded-full bg-purple-100 dark:bg-purple-950 p-3 w-fit mb-4">
              <CheckSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Tarefas Compartilhadas</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Organize tarefas do dia a dia, distribua responsabilidades e acompanhe o progresso de cada membro.
            </p>
          </div>

          {/* Goals */}
          <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow">
            <div className="rounded-full bg-green-100 dark:bg-green-950 p-3 w-fit mb-4">
              <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Metas Familiares</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Defina objetivos conjuntos e acompanhe o progresso. Realize sonhos em família com planejamento inteligente.
            </p>
          </div>

          {/* Analytics */}
          <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow">
            <div className="rounded-full bg-cyan-100 dark:bg-cyan-950 p-3 w-fit mb-4">
              <BarChart3 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Relatórios Inteligentes</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Visualize padrões, identifique oportunidades e tome decisões baseadas em dados reais da sua família.
            </p>
          </div>

          {/* Recurring */}
          <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow">
            <div className="rounded-full bg-pink-100 dark:bg-pink-950 p-3 w-fit mb-4">
              <RefreshCw className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Automação Inteligente</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Configure rotinas recorrentes, automatize registros e economize tempo com processos inteligentes.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-12 text-center text-white">
          <Shield className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            Una sua família em uma única plataforma
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Seguro, colaborativo e fácil de usar. Organize finanças, tarefas e metas. Comece em segundos com sua conta Google.
          </p>
          <button
            onClick={() => signIn('google')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-zinc-100 transition-colors shadow-lg"
          >
            Acessar com Google
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-zinc-500 dark:text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
        <p>© 2026 Familiar. Plataforma completa de gestão familiar.</p>
      </footer>
    </div>
  );
}
