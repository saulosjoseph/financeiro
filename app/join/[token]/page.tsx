'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface ShareLinkInfo {
  familyName: string;
  role: string;
  expiresAt: string;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [linkInfo, setLinkInfo] = useState<ShareLinkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const token = params.token as string;

  useEffect(() => {
    const fetchLinkInfo = async () => {
      try {
        const response = await fetch(`/api/families/share-link/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Link inválido');
          setIsLoading(false);
          return;
        }

        setLinkInfo(data);
        setIsLoading(false);
      } catch (err) {
        setError('Erro ao carregar informações do convite');
        setIsLoading(false);
      }
    };

    if (token) {
      fetchLinkInfo();
    }
  }, [token]);

  const handleJoin = async () => {
    if (!session) {
      signIn('google');
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`/api/families/share-link/${token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao entrar na família');
        setIsJoining(false);
        return;
      }

      // Redirecionar para a página principal
      router.push('/');
    } catch (err) {
      setError('Erro ao entrar na família');
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-300">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            Erro
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            Convite para Família
          </h1>
        </div>

        {linkInfo && (
          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Você foi convidado para:
              </p>
              <p className="text-2xl font-bold text-black dark:text-white">
                {linkInfo.familyName}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Função:</span>
                <span className="text-sm font-medium text-black dark:text-white capitalize">
                  {linkInfo.role === 'admin' ? 'Administrador' : 'Membro'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Expira em:</span>
                <span className="text-sm font-medium text-black dark:text-white">
                  {new Date(linkInfo.expiresAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {status === 'loading' ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : !session ? (
              <div className="space-y-3">
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Faça login para aceitar o convite
                </p>
                <button
                  onClick={handleJoin}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Entrar com Google
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Logado como: <strong>{session.user?.email}</strong>
                  </p>
                </div>
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium text-lg"
                >
                  {isJoining ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Entrando...
                    </span>
                  ) : (
                    '✓ Aceitar Convite e Entrar'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ← Voltar para início
          </button>
        </div>
      </div>
    </div>
  );
}
