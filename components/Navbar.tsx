'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, TrendingUp, CreditCard, Target, Wallet, ChevronDown, Menu, X, LogOut, CheckSquare, ListTodo, Calendar } from 'lucide-react';
import FamilySelector from './FamilySelector';
import { useFamily } from '@/lib/hooks/useFamily';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('selectedFamilyId') : null
  );
  const { families } = useFamily(selectedFamilyId);

  // Detect current context based on pathname
  const isTasksContext = pathname.startsWith('/tarefas');
  const currentContext = isTasksContext ? 'tasks' : 'finance';

  const financeNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analises', label: 'Análises', icon: TrendingUp },
    { href: '/contas', label: 'Contas', icon: CreditCard },
    { href: '/metas', label: 'Metas', icon: Target },
    { href: '/transacoes', label: 'Transações', icon: Wallet },
  ];

  const tasksNavItems = [
    { href: '/tarefas', label: 'Tarefas', icon: ListTodo },
    { href: '/tarefas/minhas', label: 'Minhas Tarefas', icon: CheckSquare },
    { href: '/tarefas/calendario', label: 'Calendário', icon: Calendar },
  ];

  const navItems = currentContext === 'tasks' ? tasksNavItems : financeNavItems;

  const isActive = (href: string) => {
    if (href === '/transacoes') {
      return pathname === '/entradas' || pathname === '/saidas' || pathname === '/transferencias';
    }
    return pathname === href;
  };

  if (!session) return null;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo & Brand with Context Switcher */}
            <div className="flex items-center gap-3">
              <Link href={currentContext === 'tasks' ? '/tarefas' : '/dashboard'} className="flex items-center gap-2 group">
                {currentContext === 'tasks' ? (
                  <CheckSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                )}
                <span className={`text-xl font-bold text-gray-900 dark:text-white transition-colors ${
                  currentContext === 'tasks'
                    ? 'group-hover:text-purple-600 dark:group-hover:text-purple-400'
                    : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`}>
                  {currentContext === 'tasks' ? 'Tarefas' : 'Financeiro'}
                </span>
              </Link>
              
              {/* Context Switcher Button */}
              <div className="relative group/switcher">
                <button className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                
                {/* Context Switcher Dropdown */}
                <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover/switcher:opacity-100 group-hover/switcher:visible transition-all duration-200">
                  <Link
                    href={'/dashboard' + (selectedFamilyId ? `?family=${selectedFamilyId}` : '')}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      currentContext === 'finance' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Financeiro</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Gestão financeira</p>
                    </div>
                  </Link>
                  <Link
                    href={'/tarefas' + (selectedFamilyId ? `?family=${selectedFamilyId}` : '')}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-b-lg ${
                      currentContext === 'tasks' ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                  >
                    <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Tarefas</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Gestão de tarefas</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href + (selectedFamilyId ? `?family=${selectedFamilyId}` : '')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive(item.href)
                        ? currentContext === 'tasks'
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Side - Family Selector & User */}
            <div className="flex items-center gap-4">
              {/* Family Selector */}
              {families && families.length > 0 && (
                <div className="hidden lg:block">
                  <FamilySelector
                    families={families}
                    selectedFamilyId={selectedFamilyId}
                    onSelectFamily={setSelectedFamilyId}
                    compact={true}
                  />
                </div>
              )}

              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full border-2 border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 hidden sm:block" />
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {session.user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {session.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href + (selectedFamilyId ? `?family=${selectedFamilyId}` : '')}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
                      isActive(item.href)
                        ? currentContext === 'tasks'
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Family Selector in Mobile */}
              {families && families.length > 0 && (
                <div className="pt-2 pb-3 border-t border-gray-200 dark:border-gray-700">
                  <FamilySelector
                    families={families}
                    selectedFamilyId={selectedFamilyId}
                    onSelectFamily={(id) => {
                      setSelectedFamilyId(id);
                      setMobileMenuOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
