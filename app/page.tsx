'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface FamilyMember {
  id: string;
  role: string;
  user: User;
}

interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
  _count: {
    incomes: number;
  };
}

interface Tag {
  id: string;
  name: string;
  color: string;
  familyId: string;
}

interface IncomeTag {
  id: string;
  tag: Tag;
}

interface Income {
  id: string;
  amount: string;
  description: string | null;
  source: string | null;
  date: string;
  user: User;
  tags: IncomeTag[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data: session, status } = useSession();
  const { data: families, mutate: mutateFamilies } = useSWR<Family[]>('/api/families', fetcher);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const { data: incomes, mutate: mutateIncomes } = useSWR<Income[]>(
    selectedFamily ? `/api/families/${selectedFamily}/incomes` : null,
    fetcher
  );
  const { data: tags, mutate: mutateTags } = useSWR<Tag[]>(
    selectedFamily ? `/api/families/${selectedFamily}/tags` : null,
    fetcher
  );

  // Estados para criar família
  const [familyName, setFamilyName] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);

  // Estados para adicionar renda
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddingIncome, setIsAddingIncome] = useState(false);

  // Estados para adicionar membro
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Estados para criar tag
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#6B7280');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);

  // Estados para links compartilháveis
  const [showShareLinks, setShowShareLinks] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const { data: shareLinks, mutate: mutateShareLinks } = useSWR<any[]>(
    selectedFamily ? `/api/families/${selectedFamily}/share-link` : null,
    fetcher
  );

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    setIsCreatingFamily(true);

    try {
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      });

      if (response.ok) {
        setFamilyName('');
        mutateFamilies();
      } else {
        alert('Erro ao criar família');
      }
    } catch (error) {
      alert('Erro ao criar família');
    } finally {
      setIsCreatingFamily(false);
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedFamily) return;
    setIsAddingIncome(true);

    try {
      const response = await fetch(`/api/families/${selectedFamily}/incomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          source,
          tagIds: selectedTags,
        }),
      });

      if (response.ok) {
        setAmount('');
        setDescription('');
        setSource('');
        setSelectedTags([]);
        mutateIncomes();
        mutateFamilies();
      } else {
        alert('Erro ao adicionar renda');
      }
    } catch (error) {
      alert('Erro ao adicionar renda');
    } finally {
      setIsAddingIncome(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim() || !selectedFamily) return;
    setIsAddingMember(true);

    try {
      const response = await fetch(`/api/families/${selectedFamily}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail }),
      });

      if (response.ok) {
        setMemberEmail('');
        setShowAddMember(false);
        mutateFamilies();
        alert('Membro adicionado com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao adicionar membro');
      }
    } catch (error) {
      alert('Erro ao adicionar membro');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleCreateTag = async () => {
    if (!tagName.trim() || !selectedFamily) return;
    setIsCreatingTag(true);

    try {
      const response = await fetch(`/api/families/${selectedFamily}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      });

      if (response.ok) {
        setTagName('');
        setTagColor('#6B7280');
        setShowCreateTag(false);
        mutateTags();
        alert('Tag criada com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao criar tag');
      }
    } catch (error) {
      alert('Erro ao criar tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleGenerateShareLink = async () => {
    if (!selectedFamily) return;
    setIsGeneratingLink(true);

    try {
      const response = await fetch(`/api/families/${selectedFamily}/share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member', expiresInDays: 7 }),
      });

      if (response.ok) {
        const data = await response.json();
        mutateShareLinks();
        // Copiar automaticamente para área de transferência
        if (navigator.clipboard && data.shareUrl) {
          await navigator.clipboard.writeText(data.shareUrl);
          alert('Link gerado e copiado para área de transferência!\n\n' + data.shareUrl);
        } else {
          alert('Link gerado:\n\n' + data.shareUrl);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao gerar link');
      }
    } catch (error) {
      alert('Erro ao gerar link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleDeleteShareLink = async (linkId: string) => {
    if (!selectedFamily) return;
    if (!confirm('Tem certeza que deseja invalidar este link?')) return;

    try {
      const response = await fetch(
        `/api/families/${selectedFamily}/share-link?linkId=${linkId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        mutateShareLinks();
        alert('Link invalidado com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao invalidar link');
      }
    } catch (error) {
      alert('Erro ao invalidar link');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert('Link copiado para área de transferência!');
      } else {
        alert('Copie o link:\n\n' + text);
      }
    } catch (error) {
      alert('Copie o link:\n\n' + text);
    }
  };

  const getTotalIncome = () => {
    if (!incomes || !Array.isArray(incomes)) return 0;
    return incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
  };

  const currentFamily = Array.isArray(families) ? families.find(f => f.id === selectedFamily) : undefined;
  const isAdmin = currentFamily?.members.find(m => m.user.id === session?.user?.id)?.role === 'admin';

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
            🚀 Financeiro App
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Faça login para continuar
          </p>
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col py-4 sm:py-16 px-4 sm:px-8 bg-white dark:bg-black mx-auto">
        <div className="flex flex-col gap-4 sm:gap-6 w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
              💰 Financeiro Familiar
            </h1>
            <div className="flex items-center gap-3 sm:gap-4">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full"
                />
              )}
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm font-medium text-black dark:text-white">
                  {session.user?.name}
                </p>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>

          {/* Criar Família */}
          <form onSubmit={handleCreateFamily} className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg">
            <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50 mb-3">Criar Nova Família</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nome da família"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="flex-1 px-3 py-2 text-sm sm:text-base border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />
              <button
                type="submit"
                disabled={isCreatingFamily}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
              >
                {isCreatingFamily ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </form>

          {/* Lista de Famílias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {Array.isArray(families) && families.map((family) => (
              <button
                key={family.id}
                onClick={() => setSelectedFamily(family.id)}
                className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedFamily === family.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <h3 className="font-semibold text-base sm:text-lg text-black dark:text-white">{family.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {family.members.length} membro(s)
                </p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {family._count.incomes} renda(s)
                </p>
              </button>
            ))}
            {(!families || !Array.isArray(families) || families.length === 0) && (
              <p className="text-gray-500 dark:text-gray-400 col-span-3 text-center py-8">
                Nenhuma família criada ainda
              </p>
            )}
          </div>

          {/* Detalhes da Família Selecionada */}
          {selectedFamily && currentFamily && (
            <div className="border-t pt-4 sm:pt-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-black dark:text-white">
                  {currentFamily.name}
                </h2>
                {isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowAddMember(!showAddMember)}
                      className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
                    >
                      {showAddMember ? 'Cancelar' : '+ Adicionar Membro'}
                    </button>
                    <button
                      onClick={() => setShowShareLinks(!showShareLinks)}
                      className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                      🔗 Links Compartilháveis
                    </button>
                  </div>
                )}
              </div>

              {/* Formulário Adicionar Membro */}
              {showAddMember && (
                <form onSubmit={handleAddMember} className="bg-green-50 dark:bg-green-950 p-3 sm:p-4 rounded-lg">
                  <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50 mb-3">
                    Adicionar Membro por Email
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 text-sm sm:text-base border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isAddingMember}
                      className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 whitespace-nowrap"
                    >
                      {isAddingMember ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              )}

              {/* Links Compartilháveis */}
              {showShareLinks && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50">
                      Links Compartilháveis
                    </h3>
                    <button
                      onClick={handleGenerateShareLink}
                      disabled={isGeneratingLink}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
                    >
                      {isGeneratingLink ? 'Gerando...' : '+ Gerar Novo Link'}
                    </button>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Links de uso único que qualquer pessoa autenticada pode usar para entrar na família. 
                    Válidos por 7 dias.
                  </p>

                  {/* Lista de links ativos */}
                  {Array.isArray(shareLinks) && shareLinks.length > 0 ? (
                    <div className="space-y-2">
                      {shareLinks.map((link) => {
                        const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${link.token}`;
                        return (
                          <div
                            key={link.id}
                            className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-800"
                          >
                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded truncate">
                                  {shareUrl}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Expira em: {new Date(link.expiresAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => copyToClipboard(shareUrl)}
                                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                                >
                                  📋 Copiar
                                </button>
                                <button
                                  onClick={() => handleDeleteShareLink(link.id)}
                                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 whitespace-nowrap"
                                >
                                  🗑️ Deletar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                      Nenhum link ativo. Clique em "Gerar Novo Link" para criar um.
                    </p>
                  )}
                </div>
              )}

              {/* Membros */}
              <div>
                <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50 mb-3">Membros</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {currentFamily.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-900 rounded"
                    >
                      {member.user.image && (
                        <img
                          src={member.user.image}
                          alt={member.user.name || ''}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base text-black dark:text-white truncate">
                          {member.user.name || 'Sem nome'}
                          {member.role === 'admin' && (
                            <span className="ml-1 sm:ml-2 text-xs bg-blue-600 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adicionar Renda */}
              <form onSubmit={handleAddIncome} className="bg-purple-50 dark:bg-purple-950 p-3 sm:p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50">Adicionar Renda</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateTag(!showCreateTag)}
                    className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {showCreateTag ? 'Cancelar' : '+ Nova Tag'}
                  </button>
                </div>

                {/* Formulário criar tag */}
                {showCreateTag && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-purple-200 dark:border-purple-800">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Nome da tag"
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs sm:text-sm border rounded bg-white dark:bg-gray-700 text-black dark:text-white"
                      />
                      <input
                        type="color"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                        className="w-16 h-8 border rounded cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        disabled={isCreatingTag || !tagName.trim()}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 whitespace-nowrap"
                      >
                        {isCreatingTag ? 'Criando...' : 'Criar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Seletor de tags */}
                {Array.isArray(tags) && tags.length > 0 && (
                  <div>
                    <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                      Tags (opcional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border-2 transition-all ${
                            selectedTags.includes(tag.id)
                              ? 'border-current shadow-md scale-105'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: tag.color,
                            color: '#fff',
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor (R$)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="px-3 py-2 text-sm sm:text-base border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Origem (ex: Salário)"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="px-3 py-2 text-sm sm:text-base border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm sm:text-base border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isAddingIncome}
                  className="w-full px-4 py-2 text-sm sm:text-base bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {isAddingIncome ? 'Adicionando...' : 'Adicionar Renda'}
                </button>
              </form>

              {/* Renda Total */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 sm:p-6 rounded-lg text-white">
                <p className="text-xs sm:text-sm opacity-90">Renda Familiar Total</p>
                <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">
                  R$ {getTotalIncome().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Lista de Rendas */}
              <div>
                <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50 mb-3">Rendas Registradas</h3>
                <div className="space-y-2 sm:space-y-3">
                  {Array.isArray(incomes) && incomes.map((income) => (
                    <div
                      key={income.id}
                      className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {income.user.image && (
                              <img
                                src={income.user.image}
                                alt={income.user.name || ''}
                                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base sm:text-lg text-black dark:text-white">
                                R$ {parseFloat(income.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                                {income.user.name} • {income.source || 'Sem origem'}
                              </p>
                              {/* Tags da renda */}
                              {income.tags && income.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {income.tags.map((incomeTag) => (
                                    <span
                                      key={incomeTag.id}
                                      className="px-2 py-0.5 text-xs rounded-full text-white"
                                      style={{ backgroundColor: incomeTag.tag.color }}
                                    >
                                      {incomeTag.tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {income.description && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 ml-10 sm:ml-12">
                              {income.description}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 ml-10 sm:ml-0 whitespace-nowrap">
                          {new Date(income.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!incomes || !Array.isArray(incomes) || incomes.length === 0) && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      Nenhuma renda registrada ainda
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
