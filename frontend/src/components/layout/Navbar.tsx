'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Plus, Search, Sparkles } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  title?: string;
  subtitle?: string;
  onQuickAddContact?: () => void;
  onQuickAddDeal?: () => void;
  onQuickAddTask?: () => void;
}

export default function Navbar({
  title = 'Workspace',
  subtitle,
  onQuickAddContact,
  onQuickAddDeal,
  onQuickAddTask,
}: NavbarProps) {
  const { currentWorkspace, user, activeRole } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h1 className="text-xl font-bold text-[#142740]">{title}</h1>
        {subtitle && <p className="text-xs text-[#586779]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Role Profile Badge (Otomatis berdasarkan akun & divisi yang login) */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50 text-xs font-medium">
          {activeRole === 'owner' ? (
            <span className="text-purple-700 flex items-center gap-1.5 font-bold">
              <span>👑</span>
              <span>Owner / Admin</span>
            </span>
          ) : activeRole === 'admin' || activeRole === 'supervisor' || currentWorkspace?.role === 'admin' || currentWorkspace?.role === 'supervisor' ? (
            <span className="text-amber-700 flex items-center gap-1.5 font-bold">
              <span>🎖️</span>
              <span>
                {currentWorkspace?.department === 'support'
                  ? 'Admin / Lead CS (After-Sales)'
                  : currentWorkspace?.department === 'sales'
                  ? 'Admin / Lead Sales (Pre-Sales)'
                  : 'Admin (Lead / Supervisor)'}
              </span>
            </span>
          ) : activeRole === 'support' ? (
            <span className="text-purple-600 flex items-center gap-1.5 font-bold">
              <span>🎧</span>
              <span>Tim CS (After-Sales)</span>
            </span>
          ) : (
            <span className="text-[#00AFC4] flex items-center gap-1.5 font-bold">
              <span>💼</span>
              <span>Tim Sales (Pre-Sales)</span>
            </span>
          )}
        </div>

        {/* Quick action shortcuts */}
        {onQuickAddContact && (
          <button
            onClick={onQuickAddContact}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#142740] bg-[#E8F8FA] hover:bg-[#d6f4f7] rounded-lg transition border border-[#00AFC4]/30"
          >
            <Plus className="w-3.5 h-3.5 text-[#00AFC4]" />
            <span>Kontak</span>
          </button>
        )}

        {onQuickAddDeal && (
          <button
            onClick={onQuickAddDeal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#00AFC4] hover:bg-[#0096a8] rounded-lg transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Deal</span>
          </button>
        )}

        {onQuickAddTask && (
          <button
            onClick={onQuickAddTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Tugas</span>
          </button>
        )}

        {/* In-App Notifications Bell (Supervisi, Eskalasi & Penugasan) */}
        <NotificationBell />

        <div className="h-5 w-px bg-slate-200 mx-1"></div>

        {/* Workspace Tag */}
        <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 bg-slate-100 text-[#586779] rounded-md font-medium border border-slate-200/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{currentWorkspace?.currency || 'IDR'}</span>
        </div>
      </div>
    </header>
  );
}
