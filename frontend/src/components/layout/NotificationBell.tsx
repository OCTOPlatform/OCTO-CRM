'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, formatDateIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { NotificationItem } from '@/types';
import {
  Bell,
  Zap,
  UserCheck,
  AlertTriangle,
  Info,
  CheckCheck,
  ExternalLink,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';

export default function NotificationBell() {
  const { currentWorkspace, user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const res = await api.listNotifications(currentWorkspace.id, 20);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll notifications every 10 seconds for real-time awareness
    const timer = setInterval(() => {
      loadNotifications();
    }, 10000);
    return () => clearInterval(timer);
  }, [currentWorkspace?.id, user?.id]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (!currentWorkspace) return;
    try {
      await api.markAllNotificationsRead(currentWorkspace.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!currentWorkspace) return;

    // Mark as read in background if unread
    if (!notif.is_read) {
      api.markNotificationRead(currentWorkspace.id, notif.id).catch(console.error);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    // If notification has conversation_id, redirect to that conversation in inbox
    if (notif.data?.conversation_id) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('octo:select_conversation', { detail: notif.data.conversation_id })
        );
      }
      router.push(`/inbox?conversation_id=${notif.data.conversation_id}`);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    return formatDateIndo(dateStr).slice(0, 10);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className={`relative p-2 rounded-xl border transition cursor-pointer ${
          isOpen
            ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-2xs'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
        }`}
        title="Notifikasi & Peringatan Tim"
        aria-label="Notifikasi"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">Notifikasi Masuk</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-25" />
                Belum ada notifikasi baru.
              </div>
            ) : (
              notifications.map((n) => {
                const isEscalation = n.type === 'conversation_escalated';
                const isAssignment = n.type === 'conversation_assigned';
                const isTakeover = n.type === 'conversation_takeover';
                const isSLA = n.type === 'sla_breached';

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                      !n.is_read
                        ? 'bg-cyan-50/40 hover:bg-cyan-50/70 border-l-3 border-l-[#00AFC4]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isEscalation
                          ? 'bg-purple-100 text-purple-700'
                          : isAssignment
                          ? 'bg-cyan-100 text-cyan-700'
                          : isTakeover
                          ? 'bg-amber-100 text-amber-700'
                          : isSLA
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isEscalation ? (
                        <Zap className="w-4 h-4" />
                      ) : isAssignment ? (
                        <UserCheck className="w-4 h-4" />
                      ) : isTakeover ? (
                        <ArrowRightLeft className="w-4 h-4" />
                      ) : isSLA ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatTimeAgo(n.created_at)}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      {n.data?.conversation_id && (
                        <span className="text-[10px] text-[#00AFC4] font-semibold flex items-center gap-1 mt-1">
                          <span>Buka obrolan</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Unread indicator dot */}
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#00AFC4] shrink-0 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
