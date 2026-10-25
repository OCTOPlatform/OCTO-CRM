'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Building2,
  Kanban,
  ListTodo,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Briefcase,
  MessageSquare,
  LifeBuoy,
  ShieldCheck,
  Bot,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, currentWorkspace, workspaces, switchWorkspace, logout, activeRole } = useAuth();
  const [showWsMenu, setShowWsMenu] = useState(false);

  // Compute navigation dynamically based on active role
  const getNavItems = (): NavGroup[] => {
    // 1. Home
    const homeItems: NavItem[] = [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Today / My Tasks', href: '/today', icon: CheckSquare },
    ];

    // 2. Relationships (Contacts & Companies)
    const relationItems: NavItem[] = [
      { label: 'Contacts', href: '/contacts', icon: Users },
      { label: 'Companies', href: '/companies', icon: Building2 },
    ];

    // 3. Omnichannel & Chat / Support
    const chatItems: NavItem[] = [];
    const isOwner = currentWorkspace?.role === 'owner' || activeRole === 'owner';
    const isSalesDept = (activeRole === 'sales' || currentWorkspace?.department === 'sales') && !isOwner;
    const isSupportDept = (activeRole === 'support' || currentWorkspace?.department === 'support') && !isOwner;

    if (isSalesDept) {
      chatItems.push({ label: 'Live Chat (Pre-Sales)', href: '/inbox', icon: MessageSquare, badge: 'Sales WA' });
      // Pre-Sales berfokus pada pipeline prospek & penjualan, tiket bantuan CS dihilangkan
    } else if (isSupportDept) {
      chatItems.push({ label: 'Live Chat (After-Sales)', href: '/inbox', icon: MessageSquare, badge: 'CS Hotline' });
      chatItems.push({ label: 'Tiket Bantuan (CS)', href: '/tickets', icon: LifeBuoy, badge: 'Helpdesk' });
    } else {
      chatItems.push({ label: 'Live Chat & Inbox', href: '/inbox', icon: MessageSquare, badge: 'Omni' });
      chatItems.push({ label: 'Tiket Bantuan (CS)', href: '/tickets', icon: LifeBuoy, badge: 'After-Sales' });
    }

    // 4. Sales & Pipeline
    const pipelineItems: NavItem[] = [];
    if (isSupportDept) {
      pipelineItems.push({ label: 'Deals Pipeline', href: '/pipeline', icon: Kanban, badge: 'Won Only' });
    } else {
      pipelineItems.push({ label: 'Deals Pipeline', href: '/pipeline', icon: Kanban });
    }

    // 5. Operations (Tasks & Reports)
    const opItems: NavItem[] = [
      { label: 'All Tasks', href: '/tasks', icon: ListTodo },
      {
        label: isSalesDept ? 'Laporan Penjualan' : isSupportDept ? 'Laporan Tiket & SLA' : 'Reports & Funnel',
        href: '/reports',
        icon: BarChart3,
      },
    ];

    const groups: NavGroup[] = [
      { group: 'Home', items: homeItems },
      { group: 'Relationships', items: relationItems },
      {
        group: activeRole === 'support' ? 'After-Sales Support' : activeRole === 'sales' ? 'Pre-Sales Chat' : 'Omnichannel & Support',
        items: chatItems,
      },
      { group: 'Sales & Pipeline', items: pipelineItems },
      { group: 'Operations', items: opItems },
    ];

    // 6. Administration (Owner & Admin / Supervisor / Lead)
    const canAccessSettings =
      activeRole === 'owner' ||
      activeRole === 'admin' ||
      activeRole === 'supervisor' ||
      currentWorkspace?.role === 'owner' ||
      currentWorkspace?.role === 'admin' ||
      currentWorkspace?.role === 'supervisor' ||
      Boolean(user?.is_superadmin);

    if (canAccessSettings) {
      groups.push({
        group: 'Administration',
        items: [
          { label: 'Settings & Team', href: '/settings', icon: Settings },
          { label: 'Template Chatbot WA', href: '/settings?tab=chatbot', icon: Bot, badge: 'WhatsApp' },
        ],
      });
    }

    // 7. OCTO Master Platform (Only egichandrapratama@gmail.com)
    if (user?.is_superadmin && user?.email?.toLowerCase() === 'egichandrapratama@gmail.com') {
      groups.push({
        group: 'OCTO Master Platform',
        items: [
          {
            label: 'Kelola Perusahaan (Tenants)',
            href: '/master/tenants',
            icon: ShieldCheck,
            badge: 'Whitelist',
          },
        ],
      });
    }

    return groups;
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-[#142740] text-white flex flex-col h-screen select-none border-r border-[#1e395e] shadow-xl shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1e395e]">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="OCTO CRM Logo"
              width={40}
              height={40}
              className="w-10 h-10 object-contain drop-shadow"
              priority
            />
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-wide text-white flex items-center gap-1.5 group-hover:text-cyan-200 transition-colors">
              OCTO <span className="text-[#00AFC4]">CRM</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Know Your Customers
            </div>
          </div>
        </Link>

        {/* Workspace Switcher */}
        <div className="relative mt-4">
          <button
            onClick={() => setShowWsMenu(!showWsMenu)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#1e395e]/80 hover:bg-[#1e395e] rounded-lg text-left text-xs transition border border-white/10"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Briefcase className="w-3.5 h-3.5 text-[#00AFC4] shrink-0" />
              <div className="truncate">
                <div className="font-medium text-slate-100 truncate">
                  {currentWorkspace?.name || 'Workspace'}
                </div>
                <div className="text-[10px] text-slate-400 capitalize">
                  Role: {currentWorkspace?.role || 'Member'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {showWsMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a3252] border border-[#2a4870] rounded-lg shadow-2xl py-1 z-50 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Workspaces
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws);
                    setShowWsMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#234269] transition ${
                    ws.id === currentWorkspace?.id ? 'text-[#00AFC4] font-semibold bg-[#234269]/50' : 'text-slate-200'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00AFC4]"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navItems.map((group, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {group.group}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#00AFC4] text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-[#1e395e]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {(item as any).badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00AFC4]/20 text-[#00AFC4] border border-[#00AFC4]/30">
                        {(item as any).badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User profile & Logout */}
      <div className="p-3 border-t border-[#1e395e] bg-[#102035]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-[#00AFC4]/20 border border-[#00AFC4] flex items-center justify-center text-xs font-bold text-[#00AFC4] shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'User'}</div>
            <div className="text-[10px] text-[#00AFC4] font-bold truncate">
              {(activeRole === 'admin' || activeRole === 'supervisor' || currentWorkspace?.role === 'admin' || currentWorkspace?.role === 'supervisor')
                ? currentWorkspace?.department === 'support'
                  ? '🎖️ Lead CS'
                  : currentWorkspace?.department === 'sales'
                  ? '🎖️ Lead Sales'
                  : '🎖️ Admin Lead'
                : activeRole === 'owner'
                ? '👑 Owner'
                : activeRole === 'sales'
                ? '💼 Tim Sales'
                : '🎧 Tim CS'}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Keluar / Logout"
          className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
