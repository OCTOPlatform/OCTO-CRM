'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth, formatCurrencyIDR, formatDateIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import {
  Conversation,
  ChatMessage,
  Contact,
  Pipeline,
  Deal,
  WorkspaceChannel,
  TicketPriority,
  AISummarizeResponse,
  AISuggestionResponse,
  BroadcastCampaign,
  CreateBroadcastRequest,
  WorkspaceMember,
  MonitoringStats,
  AgentWorkload,
  InboxAuditEvent,
} from '@/types';
import Link from 'next/link';
import MonitoringDashboardView from '@/components/inbox/MonitoringDashboardView';
import AuditTrailView from '@/components/inbox/AuditTrailView';
import {
  TakeoverModal,
  EscalateModal,
  AccessLogModal,
  GovernancePolicyModal,
} from '@/components/inbox/GovernanceModals';
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  User,
  Building,
  CheckCheck,
  Clock,
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  LifeBuoy,
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  ExternalLink,
  Sparkles,
  Info,
  Radio,
  QrCode,
  Check,
  Copy,
  RefreshCw,
  Paperclip,
  FileText,
  FileSpreadsheet,
  Download,
  X,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  Megaphone,
  Zap,
  Bot,
  ThumbsUp,
  AlertOctagon,
  Lightbulb,
  ShieldCheck,
  AlertTriangle,
  Users,
  Activity,
  Lock,
  Unlock,
  UserCheck,
  ChevronDown,
  Shield,
  HelpCircle,
} from 'lucide-react';

export default function InboxPage() {
  const { currentWorkspace, user, activeRole } = useAuth();
  const isSupervisorOrAdmin = activeRole === 'admin' || activeRole === 'supervisor' || activeRole === 'owner' || Boolean(user?.is_superadmin);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<'all' | 'sales' | 'support'>('all');
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = useState('');

  // Team Inbox Monitoring & Access Governance States
  const [viewMode, setViewMode] = useState<'inbox' | 'monitoring' | 'audit'>('inbox');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned' | 'exceptions'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Monitoring Stats & Audit Trail
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats | null>(null);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);
  const [auditTrail, setAuditTrail] = useState<InboxAuditEvent[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  // Takeover Modal
  const [showTakeoverModal, setShowTakeoverModal] = useState(false);
  const [takeoverReason, setTakeoverReason] = useState('Supervisi penanganan komplain klien');
  const [takingOver, setTakingOver] = useState(false);

  // Escalate Modal
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateToId, setEscalateToId] = useState('');
  const [escalateReason, setEscalateReason] = useState('Kasus membutuhkan bantuan supervisor / eskalasi SLA');
  const [escalatePriority, setEscalatePriority] = useState<'high' | 'urgent'>('urgent');
  const [escalating, setEscalating] = useState(false);

  // Access On Demand Modal & Tracking
  const [showAccessLogModal, setShowAccessLogModal] = useState(false);
  const [accessLogReason, setAccessLogReason] = useState('Penyelidikan komplain & QA review layanan');
  const [loggingAccess, setLoggingAccess] = useState(false);
  const [loggedConvs, setLoggedConvs] = useState<Record<string, boolean>>({});

  // Governance Transparency Modal
  const [showGovernanceModal, setShowGovernanceModal] = useState(false);

  // In-App Toast Alert (Real-time Eskalasi & Penugasan)
  const [toastAlert, setToastAlert] = useState<{
    title: string;
    message: string;
    conversationId?: string;
  } | null>(null);

  // Contact details & Pipelines for Deal conversion
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactDeals, setContactDeals] = useState<Deal[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [workspaceChannels, setWorkspaceChannels] = useState<WorkspaceChannel[]>([]);

  // WhatsApp Business Number & Setup Info Modal
  const [businessNumber, setBusinessNumber] = useState('');
  const [sessionName, setSessionName] = useState('default');
  const [channelStatus, setChannelStatus] = useState('connected');
  const [wahaUrl, setWahaUrl] = useState('http://localhost:3005');
  const [isEditingChannel, setIsEditingChannel] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [savingChannel, setSavingChannel] = useState(false);
  const [showConnectionInfo, setShowConnectionInfo] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [qrRefreshKey, setQrRefreshKey] = useState(Date.now());
  const [qrLoading, setQrLoading] = useState(true);
  const [qrHasError, setQrHasError] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
  const apiHostUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

  const getAttachmentFullUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${apiHostUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };
  const [wahaStatus, setWahaStatus] = useState<string>('checking');
  const [connectedPhone, setConnectedPhone] = useState<string>('');
  const [connectedName, setConnectedName] = useState<string>('');
  const [restartingSession, setRestartingSession] = useState(false);
  const [syncingHistory, setSyncingHistory] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const prevWahaStatusRef = useRef<string>('checking');

  // Convert to Deal Modal (Pre-Sales)
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState<number>(15000000);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [converting, setConverting] = useState(false);

  // Convert to Ticket Modal (After-Sales Support Helpdesk)
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketCategory, setTicketCategory] = useState('complaint');
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('medium');
  const [ticketDept, setTicketDept] = useState('support');
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Pilar 5: AI Sales & CS Copilot
  const [aiSummary, setAiSummary] = useState<AISummarizeResponse | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionResponse | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Pilar 2: WhatsApp Broadcast
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastCampaigns, setBroadcastCampaigns] = useState<BroadcastCampaign[]>([]);
  const [broadcastName, setBroadcastName] = useState('Promo Spesial OCTO Bulan Ini');
  const [broadcastMessage, setBroadcastMessage] = useState(
    'Halo {{first_name}} dari {{company}}! Kami ada promo diskon khusus 20% untuk solusi CRM & WhatsApp Omnichannel. Hubungi kami untuk klaim promo Anda ya!'
  );
  const [broadcastDept, setBroadcastDept] = useState<'sales' | 'support'>('sales');
  const [broadcastTab, setBroadcastTab] = useState<'create' | 'history'>('create');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConvIdRef = useRef<string | null>(selectedConvId);

  const handleSummarizeChat = async () => {
    if (!currentWorkspace || !selectedConvId) return;
    try {
      setSummarizing(true);
      const res = await api.summarizeChat(currentWorkspace.id, selectedConvId);
      setAiSummary(res);
    } catch (e: any) {
      alert(e.message || 'Gagal meringkas obrolan dengan AI');
    } finally {
      setSummarizing(false);
    }
  };

  const handleFetchSmartReplies = async () => {
    if (!currentWorkspace || !selectedConvId) return;
    try {
      setLoadingSuggestions(true);
      const res = await api.suggestReplies(currentWorkspace.id, selectedConvId);
      setAiSuggestions(res);
    } catch (e: any) {
      console.error('Failed to get AI suggestions:', e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleOpenBroadcastModal = async () => {
    setShowBroadcastModal(true);
    if (!currentWorkspace) return;
    try {
      const list = await api.listBroadcasts(currentWorkspace.id);
      setBroadcastCampaigns(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !broadcastMessage.trim()) return;
    try {
      setSendingBroadcast(true);
      await api.createBroadcast(currentWorkspace.id, {
        name: broadcastName,
        message_template: broadcastMessage,
        department: broadcastDept,
        send_now: true,
      });
      alert('Broadcast WhatsApp berhasil dikirimkan ke target!');
      const updatedList = await api.listBroadcasts(currentWorkspace.id);
      setBroadcastCampaigns(updatedList);
      setBroadcastTab('history');
    } catch (e: any) {
      alert(e.message || 'Gagal mengirim broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const playIncomingSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.28);
    } catch {
      // AudioContext autoplay rules or unsupported
    }
  };

  // Canned Responses / Quick Reply Templates
  const cannedResponses = [
    {
      title: '👋 Sapaan CS (Ambil Alih)',
      text: 'Halo! Saya dari tim Customer Support OCTO yang mengambil alih percakapan ini. Saya siap membantu kendala Anda secara langsung. Boleh diceritakan apa yang sedang dihadapi?',
    },
    {
      title: '📸 Minta Screenshot Kendala',
      text: 'Terima kasih telah melaporkan hal ini. Agar tim After-Sales kami dapat segera menyelesaikan kendala ini dengan tepat, apakah bisa dibantu mengirimkan tangkapan layar (screenshot) pesan error yang muncul?',
    },
    {
      title: '🛠️ Solusi Investigasi & Tiket',
      text: 'Mohon maaf atas ketidaknyamanannya. Laporan kendala Anda sudah kami jadikan tiket bantuan prioritas dan saat ini sedang ditangani oleh tim teknis kami.',
    },
    {
      title: '📄 Kirim Penawaran & Pricelist',
      text: 'Halo! Terima kasih atas pertanyaannya. Kami memiliki beberapa paket fleksibel yang disesuaikan dengan skala bisnis Anda. Boleh kami kirimkan Official Quotation lengkap beserta promo bulan ini?',
    },
    {
      title: '📅 Jadwalkan Demo Online',
      text: 'Kami sangat senang mendemokan langsung fitur OCTO CRM & WhatsApp Multi-Agent. Apakah Anda bersedia untuk sesi demo singkat 15 menit via Google Meet besok?',
    },
    {
      title: '✨ Penutup Hangat CS',
      text: 'Sama-sama! Senang sekali bisa membantu Anda. Jika ada hal lain yang perlu ditanyakan seputar layanan kami, jangan ragu untuk kembali menghubungi kami kapan saja. Semoga hari Anda menyenangkan!',
    },
  ];

  const loadConversations = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [convs, pipes, chList, memberList, stats] = await Promise.all([
        api.listConversations(currentWorkspace.id, {
          channel: channelFilter === 'all' ? undefined : channelFilter,
          channel_id: selectedChannelId === 'all' ? undefined : selectedChannelId,
          department: deptFilter === 'all' ? undefined : deptFilter,
          status: statusFilter,
          query: searchQuery || undefined,
        }),
        api.listPipelines(currentWorkspace.id),
        api.listChannels(currentWorkspace.id),
        api.listMembers(currentWorkspace.id).catch(() => []),
        api.getInboxMonitoringStats(currentWorkspace.id, deptFilter).catch(() => null),
      ]);
      setConversations(convs);
      setPipelines(pipes);
      setWorkspaceChannels(chList || []);
      setMembers(memberList || []);
      if (stats) setMonitoringStats(stats);
      if (memberList && memberList.length > 0 && !escalateToId) {
        const supOrOwner = memberList.find((m) => m.role === 'owner' || m.role === 'supervisor' || m.role === 'admin');
        if (supOrOwner) setEscalateToId(supOrOwner.user_id);
      }

      if (pipes.length > 0 && pipes[0].stages && pipes[0].stages.length > 0) {
        setSelectedStageId(pipes[0].stages[0].id);
      }

      // Auto-select first conversation if none selected or current selected is not in filtered list
      if (convs.length > 0) {
        if (!selectedConvId || !convs.some((c) => c.id === selectedConvId)) {
          setSelectedConvId(convs[0].id);
        }
      } else {
        setSelectedConvId(null);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoringStats = async () => {
    if (!currentWorkspace) return;
    try {
      setLoadingMonitoring(true);
      const stats = await api.getInboxMonitoringStats(currentWorkspace.id, deptFilter);
      setMonitoringStats(stats);
    } catch (e) {
      console.error('Failed to load monitoring stats:', e);
    } finally {
      setLoadingMonitoring(false);
    }
  };

  const loadAuditTrail = async () => {
    if (!currentWorkspace) return;
    try {
      setLoadingAudit(true);
      const trail = await api.getInboxAuditTrail(currentWorkspace.id, 50);
      setAuditTrail(trail);
    } catch (e) {
      console.error('Failed to load audit trail:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleTakeover = async () => {
    if (!currentWorkspace || !selectedConvId || !takeoverReason.trim()) return;
    try {
      setTakingOver(true);
      await api.takeoverConversation(currentWorkspace.id, selectedConvId, takeoverReason);
      setShowTakeoverModal(false);
      await loadConversations();
      loadMonitoringStats();
      loadAuditTrail();
    } catch (e: any) {
      alert(e.message || 'Gagal mengambil alih percakapan');
    } finally {
      setTakingOver(false);
    }
  };

  const handleEscalate = async () => {
    if (!currentWorkspace || !selectedConvId || !escalateToId || !escalateReason.trim()) {
      alert('Pilih supervisor/owner tujuan dan tuliskan alasan eskalasi');
      return;
    }
    try {
      setEscalating(true);
      await api.escalateConversation(currentWorkspace.id, selectedConvId, {
        escalate_to_id: escalateToId,
        reason: escalateReason,
        priority: escalatePriority,
      });
      setShowEscalateModal(false);
      await loadConversations();
      loadMonitoringStats();
      loadAuditTrail();
    } catch (e: any) {
      alert(e.message || 'Gagal mengekskalasi percakapan');
    } finally {
      setEscalating(false);
    }
  };

  const handleLogAccess = async () => {
    if (!currentWorkspace || !selectedConvId || !accessLogReason.trim()) return;
    try {
      setLoggingAccess(true);
      await api.logConversationAccess(currentWorkspace.id, selectedConvId, {
        reason: accessLogReason,
        purpose: 'Supervisi / Audit Kepatuhan',
      });
      setLoggedConvs((prev) => ({ ...prev, [selectedConvId]: true }));
      setShowAccessLogModal(false);
      loadAuditTrail();
    } catch (e: any) {
      alert(e.message || 'Gagal mencatat log akses');
    } finally {
      setLoggingAccess(false);
    }
  };

  const handleQuickAssign = async (convId: string, memberId?: string) => {
    if (!currentWorkspace) return;
    try {
      await api.updateConversationAssignment(currentWorkspace.id, convId, memberId);
      await loadConversations();
      loadMonitoringStats();
      loadAuditTrail();
    } catch (e: any) {
      alert(e.message || 'Gagal mengubah penugasan');
    }
  };

  const handlePriorityChange = async (convId: string, priority: string) => {
    if (!currentWorkspace) return;
    try {
      await api.updateConversationPriority(currentWorkspace.id, convId, priority);
      await loadConversations();
      loadMonitoringStats();
    } catch (e: any) {
      alert(e.message || 'Gagal mengubah prioritas');
    }
  };

  useEffect(() => {
    const handleCustomSelect = (e: any) => {
      if (e.detail) {
        setSelectedConvId(e.detail);
        setViewMode('inbox');
      }
    };
    window.addEventListener('octo:select_conversation', handleCustomSelect);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const convParam = params.get('conversation_id');
      if (convParam) {
        setSelectedConvId(convParam);
        setViewMode('inbox');
      }
    }

    return () => {
      window.removeEventListener('octo:select_conversation', handleCustomSelect);
    };
  }, []);

  useEffect(() => {
    loadConversations();
  }, [currentWorkspace, channelFilter, selectedChannelId, deptFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (activeRole === 'sales') {
      setDeptFilter('sales');
    } else if (activeRole === 'support') {
      setDeptFilter('support');
    } else {
      setDeptFilter('all');
    }
  }, [activeRole]);

  const loadWhatsAppStatus = async (overrideSession?: string) => {
    if (!currentWorkspace) return;
    try {
      const sess = overrideSession || sessionName;
      const res = await api.getWhatsAppStatus(currentWorkspace.id, undefined, sess);
      if (res?.status) {
        setWahaStatus(res.status);
        if (res.phone) {
          setConnectedPhone(res.phone);
          setBusinessNumber(res.phone);
          setChannelStatus('connected');
        } else if (res.status === 'WORKING') {
          setChannelStatus('connected');
        } else {
          setConnectedPhone('');
          setChannelStatus('disconnected');
        }
        if (res.push_name) setConnectedName(res.push_name);
      }
    } catch (e) {
      console.error('Failed to get whatsapp status:', e);
      setWahaStatus('offline');
    }
  };

  const loadWhatsAppConfig = async () => {
    if (!currentWorkspace) return;
    try {
      const cfg = await api.getWhatsAppConfig(currentWorkspace.id);
      if (cfg) {
        setBusinessNumber(cfg.business_number || '');
        setNewPhoneNumber(cfg.business_number || '');
        setSessionName(cfg.session_name || 'default');
        setChannelStatus(cfg.status || 'disconnected');
        if (cfg.waha_url) setWahaUrl(cfg.waha_url);
        loadWhatsAppStatus(cfg.session_name);
      }
    } catch (e) {
      console.error('Failed to load whatsapp config:', e);
    }
  };

  useEffect(() => {
    loadWhatsAppConfig();
  }, [currentWorkspace, user?.id]);

  // Real-time status polling when QR / Connection modal is open
  useEffect(() => {
    if (!showConnectionInfo) return;
    loadWhatsAppStatus();
    const timer = setInterval(() => {
      loadWhatsAppStatus();
    }, 2000);
    return () => clearInterval(timer);
  }, [showConnectionInfo]);

  // Keep QR code fresh (every 15s) while waiting to be scanned
  useEffect(() => {
    if (!showConnectionInfo || wahaStatus === 'WORKING') return;
    const qrTimer = setInterval(() => {
      setQrRefreshKey(Date.now());
    }, 15000);
    return () => clearInterval(qrTimer);
  }, [showConnectionInfo, wahaStatus]);

  const handleRestartSession = async () => {
    if (!currentWorkspace) return;
    try {
      setRestartingSession(true);
      setQrLoading(true);
      setQrHasError(false);
      await api.restartWhatsAppSession(currentWorkspace.id, undefined, sessionName);
      setQrRefreshKey(Date.now());
      setTimeout(() => loadWhatsAppStatus(sessionName), 1200);
    } catch (e: any) {
      alert(e.message || 'Gagal memproses sesi WhatsApp');
    } finally {
      setRestartingSession(false);
    }
  };

  const handleSyncHistory = async (showNotification = true) => {
    if (!currentWorkspace) return;
    try {
      setSyncingHistory(true);
      setSyncStatusMsg('Sedang menarik riwayat percakapan dari WhatsApp...');
      const res = await api.syncWhatsAppHistory(currentWorkspace.id, 50, undefined, sessionName);
      setSyncStatusMsg(res.message);
      await loadConversations();
      if (showNotification) {
        alert(res.message);
      }
    } catch (e: any) {
      console.error('Failed to sync WhatsApp history:', e);
      if (showNotification) {
        alert(e.message || 'Gagal menyinkronkan riwayat WhatsApp');
      }
    } finally {
      setSyncingHistory(false);
    }
  };

  // Auto-sync history when WhatsApp QR code is successfully scanned and transitions to WORKING
  useEffect(() => {
    if (
      prevWahaStatusRef.current !== 'WORKING' &&
      wahaStatus === 'WORKING' &&
      prevWahaStatusRef.current !== 'checking' &&
      currentWorkspace
    ) {
      handleSyncHistory(false);
    }
    prevWahaStatusRef.current = wahaStatus;
  }, [wahaStatus, currentWorkspace]);

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !newPhoneNumber.trim()) return;
    try {
      setSavingChannel(true);
      const res = await api.updateWhatsAppConfig(currentWorkspace.id, {
        phone_number: newPhoneNumber.trim(),
        session_name: sessionName || 'default',
      });
      setBusinessNumber(res.phone_number);
      setIsEditingChannel(false);
      alert('Nomor WhatsApp CS perusahaan berhasil disimpan!');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan nomor WhatsApp');
    } finally {
      setSavingChannel(false);
    }
  };

  // Load Messages for selected conversation
  const loadMessages = async (convId: string) => {
    if (!currentWorkspace) return;
    try {
      setLoadingMessages(true);
      const [msgList, convData] = await Promise.all([
        api.listMessages(currentWorkspace.id, convId),
        api.getConversation(currentWorkspace.id, convId),
      ]);
      setMessages(msgList);

      // Load contact info & deals if available
      if (convData.contact_id) {
        const [c, dList] = await Promise.all([
          api.getContact(currentWorkspace.id, convData.contact_id),
          api.listDeals(currentWorkspace.id, { contact_id: convData.contact_id }),
        ]);
        setSelectedContact(c);
        setContactDeals(dList);
      } else {
        setSelectedContact(null);
        setContactDeals([]);
      }

      // Reset AI states & fetch smart reply suggestions for active conversation
      setAiSummary(null);
      api.suggestReplies(currentWorkspace.id, convId).then((res) => setAiSuggestions(res)).catch(() => {});

      // Update unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoadingMessages(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
    }
  }, [selectedConvId]);

  // Real-time EventSource listener + polling fallback
  useEffect(() => {
    if (!currentWorkspace) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('octo_token') : null;
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    const sseUrl = `${apiUrl}/workspaces/${currentWorkspace.id}/inbox/events?token=${token}`;

    let eventSource: EventSource | null = null;
    let isMounted = true;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('message', (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_message' && payload.message) {
            const newMsg = payload.message as ChatMessage;
            const targetConvId = payload.conversation_id;

            // If incoming message belongs to active chat, append immediately
            if (targetConvId === selectedConvIdRef.current) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              if (newMsg.sender_type === 'customer') {
                playIncomingSound();
              }
            } else {
              if (newMsg.sender_type === 'customer') {
                playIncomingSound();
              }
            }

            // Update conversation list
            setConversations((prev) => {
              const exists = prev.some((c) => c.id === targetConvId);
              if (!exists) {
                // If this is a completely new conversation room, reload list
                loadConversations();
                return prev;
              }
              return prev
                .map((c) => {
                  if (c.id === targetConvId) {
                    return {
                      ...c,
                      last_message_content: newMsg.content,
                      last_message_at: newMsg.created_at,
                      unread_count:
                        targetConvId === selectedConvIdRef.current
                          ? 0
                          : (c.unread_count || 0) + 1,
                    };
                  }
                  return c;
                })
                .sort(
                  (a, b) =>
                    new Date(b.last_message_at).getTime() -
                    new Date(a.last_message_at).getTime()
                );
            });
          } else if (payload.type === 'bot_handoff') {
            loadConversations();
            loadMonitoringStats();
            playIncomingSound();
            const senderName = payload.data?.sender_name || 'Pelanggan';
            const question = payload.data?.question || 'Membutuhkan bantuan agen CS';
            setToastAlert({
              title: '🚨 Chat Perlu Dibalas (Handoff Bot)',
              message: `${senderName} dialihkan dari Bot ke CS: "${question}"`,
              conversationId: payload.conversation_id,
            });
            setTimeout(() => setToastAlert(null), 8000);
          } else if (payload.type === 'conversation_updated' || payload.type === 'notification_created') {
            loadConversations();
            loadMonitoringStats();
            playIncomingSound();
            setToastAlert({
              title: 'Notifikasi Tim Masuk',
              message: 'Terdapat pembaruan penugasan / eskalasi obrolan yang membutuhkan perhatian.',
              conversationId: payload.conversation_id,
            });
            setTimeout(() => setToastAlert(null), 6000);
          }
        } catch (err) {
          console.error('SSE JSON error:', err);
        }
      });

      eventSource.onerror = () => {
        // SSE auto-reconnects natively
      };
    } catch (e) {
      console.warn('Failed to start EventSource:', e);
    }

    // High reliability polling fallback (every 2.5s)
    const pollTimer = setInterval(async () => {
      if (!isMounted) return;
      const currentConvId = selectedConvIdRef.current;
      if (currentConvId && currentWorkspace) {
        try {
          const latest = await api.listMessages(currentWorkspace.id, currentConvId);
          if (!isMounted) return;
          setMessages((prev) => {
            if (latest.length > prev.length) {
              return latest;
            }
            return prev;
          });
        } catch {
          // ignore transient glitches
        }
      }
    }, 2500);

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollTimer);
    };
  }, [currentWorkspace?.id]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);

  const filteredConversations = conversations.filter((conv) => {
    // Assignment filter
    if (assignmentFilter === 'mine') {
      if (conv.assigned_to_id !== user?.id) return false;
    } else if (assignmentFilter === 'unassigned') {
      if (conv.assigned_to_id) return false;
    } else if (assignmentFilter === 'exceptions') {
      const isException =
        conv.is_sla_breached ||
        conv.sentiment === 'critical' ||
        conv.sentiment === 'negative' ||
        conv.priority === 'urgent' ||
        conv.priority === 'high' ||
        Boolean(conv.escalated_to_id) ||
        !conv.assigned_to_id;
      if (!isException) return false;
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      if (conv.priority !== priorityFilter) return false;
    }

    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Ukuran berkas melebihi batas maksimal 50 MB.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Send Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !selectedConvId || (!replyText.trim() && !selectedFile)) return;

    try {
      setSendingReply(true);

      let attachmentData: any = undefined;
      if (selectedFile) {
        const uploadRes = await api.uploadInboxAttachment(currentWorkspace.id, selectedFile);
        attachmentData = {
          url: uploadRes.url,
          name: uploadRes.file_name,
          type: uploadRes.file_type,
          mime_type: uploadRes.mime_type,
          size: uploadRes.file_size,
        };
      }

      const newMsg = await api.sendReply(
        currentWorkspace.id,
        selectedConvId,
        replyText.trim(),
        undefined,
        attachmentData
      );

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setReplyText('');
      removeSelectedFile();

      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? { ...c, last_message_content: newMsg.content, last_message_at: newMsg.created_at }
            : c
        )
      );
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim pesan / berkas');
    } finally {
      setSendingReply(false);
    }
  };

  // Toggle Conversation Status (Open / Closed)
  const handleToggleStatus = async () => {
    if (!currentWorkspace || !selectedConvId || !activeConv) return;
    const newStatus = activeConv.status === 'open' ? 'closed' : 'open';
    try {
      await api.updateConversationStatus(currentWorkspace.id, selectedConvId, newStatus);
      loadConversations();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status percakapan');
    }
  };

  const [deletingConv, setDeletingConv] = useState(false);
  const [clearingInbox, setClearingInbox] = useState(false);

  // Delete Individual Conversation
  const handleDeleteConversation = async (convId: string, convName?: string) => {
    if (!currentWorkspace) return;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus percakapan dengan "${convName || 'kontak ini'}"? Semua riwayat pesan pada obrolan ini akan dihapus dari CRM.`
    );
    if (!confirmDelete) return;

    try {
      setDeletingConv(true);
      await api.deleteConversation(currentWorkspace.id, convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (selectedConvId === convId) {
        setSelectedConvId(null);
        setMessages([]);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus percakapan');
    } finally {
      setDeletingConv(false);
    }
  };

  // Toggle Bot Active Status (Takeover by CS / Re-enable Bot)
  const handleToggleBot = async (enable: boolean) => {
    if (!currentWorkspace || !activeConv) return;
    try {
      await api.toggleConversationBot(
        currentWorkspace.id,
        activeConv.id,
        enable,
        enable ? 'Diaktifkan kembali oleh agen CS' : 'Diambil alih oleh agen CS'
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, bot_active: enable, bot_handoff_reason: enable ? '' : c.bot_handoff_reason }
            : c
        )
      );
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status bot');
    }
  };

  // Clear / Truncate All Conversations for POC Safety
  const handleClearAllConversations = async () => {
    if (!currentWorkspace) return;
    const confirmClear = window.confirm(
      'PERINGATAN POC:\nApakah Anda yakin ingin mengosongkan SEMUA percakapan di Inbox CRM ini?\n\nSemua obrolan dan kontak sinkronisasi WhatsApp akan dihapus dari CRM untuk mencegah salah kirim pesan.'
    );
    if (!confirmClear) return;

    try {
      setClearingInbox(true);
      const res = await api.clearAllConversations(currentWorkspace.id, true);
      setConversations([]);
      setSelectedConvId(null);
      setMessages([]);
      alert(res.message || 'Semua percakapan berhasil dibersihkan dari CRM');
    } catch (err: any) {
      alert(err.message || 'Gagal membersihkan percakapan');
    } finally {
      setClearingInbox(false);
    }
  };

  // Convert to Deal
  const handleConvertToDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !selectedConvId || !dealTitle.trim() || !selectedStageId) return;
    const pipe = pipelines[0];
    if (!pipe) return;

    try {
      setConverting(true);
      await api.convertConversationToDeal(currentWorkspace.id, selectedConvId, {
        pipeline_id: pipe.id,
        stage_id: selectedStageId,
        title: dealTitle.trim(),
        value: Number(dealValue) || 0,
      });
      setShowConvertModal(false);
      alert('Peluang berhasil dibuat dan ditambahkan ke Sales Pipeline!');
      if (activeConv?.contact_id) {
        const dList = await api.listDeals(currentWorkspace.id, { contact_id: activeConv.contact_id });
        setContactDeals(dList);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah percakapan menjadi peluang');
    } finally {
      setConverting(false);
    }
  };

  // Convert to Ticket (CS After-Sales)
  const handleCreateTicketFromChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !activeConv || !ticketSubject.trim()) return;

    try {
      setCreatingTicket(true);
      await api.createTicket(currentWorkspace.id, {
        subject: ticketSubject.trim(),
        description: ticketDesc.trim(),
        category: ticketCategory,
        priority: ticketPriority,
        department: ticketDept,
        contact_id: activeConv.contact_id || undefined,
        conversation_id: activeConv.id,
      });
      setShowTicketModal(false);
      setTicketSubject('');
      setTicketDesc('');
      alert('Tiket bantuan After-Sales berhasil dibuat dari percakapan ini!');
    } catch (err: any) {
      alert(err.message || 'Gagal membuat tiket bantuan');
    } finally {
      setCreatingTicket(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar
        title="Live Chat & Omnichannel Inbox"
        subtitle={
          businessNumber
            ? `Nomor WhatsApp: ${businessNumber} • Terhubung ke WhatsApp & Email`
            : 'Live Chat & WhatsApp Omnichannel • Multi-Account'
        }
        onQuickAddDeal={() => {
          if (activeConv) {
            setDealTitle(`Peluang dari ${activeConv.contact_name || activeConv.channel_identifier}`);
            setShowConvertModal(true);
          }
        }}
      />

      {/* Real-time In-App Notification Toast Alert */}
      {toastAlert && (
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-top-4 duration-200 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-bold text-xs text-slate-900">{toastAlert.title}</span>
              <button
                type="button"
                onClick={() => setToastAlert(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-0.5 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {toastAlert.message}
            </p>
            {toastAlert.conversationId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedConvId(toastAlert.conversationId!);
                  setToastAlert(null);
                }}
                className="mt-2 px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <span>Buka Percakapan</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= GOVERNANCE & VIEW SWITCHER BAR ================= */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setViewMode('inbox')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              viewMode === 'inbox'
                ? 'bg-[#142740] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Team Inbox</span>
            {filteredConversations.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  viewMode === 'inbox' ? 'bg-[#00AFC4] text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {filteredConversations.length}
              </span>
            )}
          </button>

          {(activeRole === 'owner' || activeRole === 'supervisor') && (
            <button
              onClick={() => {
                setViewMode('monitoring');
                loadMonitoringStats();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'monitoring'
                  ? 'bg-[#00AFC4] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Monitoring & SLA</span>
              {monitoringStats && (monitoringStats.exceptions_count || monitoringStats.sla_breached_count || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                  {monitoringStats.exceptions_count ?? monitoringStats.sla_breached_count}
                </span>
              )}
            </button>
          )}

          {(activeRole === 'owner' || activeRole === 'supervisor') && (
            <button
              onClick={() => {
                setViewMode('audit');
                loadAuditTrail();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'audit'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Trail & Akses</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGovernanceModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            title="Lihat Piagam Tata Kelola & Standar Non-Surveillance"
          >
            <Shield className="w-3.5 h-3.5 text-[#00AFC4]" />
            <span className="hidden sm:inline">Piagam Tata Kelola</span>
          </button>
        </div>
      </div>

      {/* ================= CONDITIONAL VIEWS: MONITORING / AUDIT / INBOX ================= */}
      {viewMode === 'monitoring' ? (
        <div className="flex-1 overflow-hidden">
          <MonitoringDashboardView
            stats={monitoringStats}
            loading={loadingMonitoring}
            onRefresh={loadMonitoringStats}
            deptFilter={deptFilter}
            setDeptFilter={setDeptFilter}
            conversations={conversations}
            onOpenConversation={(convId) => {
              setSelectedConvId(convId);
              setViewMode('inbox');
            }}
            onTakeover={(conv) => {
              setSelectedConvId(conv.id);
              setShowTakeoverModal(true);
            }}
            activeRole={activeRole}
          />
        </div>
      ) : viewMode === 'audit' ? (
        <div className="flex-1 overflow-hidden">
          <AuditTrailView
            events={auditTrail}
            loading={loadingAudit}
            onRefresh={loadAuditTrail}
          />
        </div>
      ) : (
        /* ================= 3-COLUMN WORKSPACE ================= */
        <div className="flex-1 flex overflow-hidden">
        
        {/* ================= KOLOM 1: DAFTAR PERCAKAPAN (LEFT SIDEBAR) ================= */}
        <div className="w-80 sm:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Top Header: Business WhatsApp Connection Card */}
          <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/70">
            {/* Live WhatsApp Status Badge */}
            <div
              onClick={() => {
                loadWhatsAppStatus();
                setShowConnectionInfo(true);
              }}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition shadow-2xs group ${
                wahaStatus === 'WORKING'
                  ? 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 hover:bg-amber-100/70 border-amber-200 text-amber-950'
              }`}
              title="Klik untuk melihat status koneksi WhatsApp Anda"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                      wahaStatus === 'WORKING' ? 'bg-emerald-400' : 'bg-amber-400'
                    } opacity-75`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      wahaStatus === 'WORKING' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  ></span>
                </span>
                <div>
                  <span className="text-[11px] font-bold block leading-tight">
                    {businessNumber ? `WhatsApp: ${businessNumber}` : 'WhatsApp: Belum Tertaut'}
                  </span>
                  <span
                    className={`text-[10px] ${
                      wahaStatus === 'WORKING' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {wahaStatus === 'WORKING'
                      ? `Terhubung (${connectedName || 'Aktif'})`
                      : wahaStatus === 'SCAN_QR_CODE'
                      ? 'Ketuk untuk Scan QR Code'
                      : 'Ketuk untuk Hubungkan Akun'}
                  </span>
                </div>
              </div>
              <div
                className={`p-1 rounded-md transition ${
                  wahaStatus === 'WORKING'
                    ? 'text-emerald-700 group-hover:bg-emerald-200'
                    : 'text-amber-700 group-hover:bg-amber-200'
                }`}
              >
                <QrCode className="w-4 h-4" />
              </div>
            </div>

            {/* Owner Multi-Channel Stats & Filter */}
            {activeRole === 'owner' && (
              <div className="p-2.5 bg-slate-100/70 border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-bold text-slate-800">
                      {workspaceChannels.filter((c) => c.status === 'connected' && c.channel_type === 'whatsapp').length} Nomor WA Terhubung
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">
                    Total {workspaceChannels.length} Akun
                  </span>
                </div>
                <div>
                  <select
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 shadow-2xs focus:ring-2 focus:ring-[#00AFC4] focus:outline-hidden"
                  >
                    <option value="all">🌐 Semua Akun / Nomor WA ({workspaceChannels.length} Akun)</option>
                    {workspaceChannels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.status === 'connected' ? '🟢' : '⚪'} {ch.channel_name} ({ch.phone_number || 'Belum tertaut'}) - {ch.department === 'sales' ? 'Pre-Sales' : 'After-Sales'} {ch.assigned_user_name ? `• ${ch.assigned_user_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Quick Actions (Sync History, Broadcast & Clear Data) */}
            <div className="flex items-center justify-between px-1 text-[11px] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {wahaStatus === 'WORKING' && (
                  <button
                    type="button"
                    onClick={() => handleSyncHistory(true)}
                    disabled={syncingHistory}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition disabled:opacity-60"
                    title="Tarik kontak & pesan WhatsApp ke Inbox"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingHistory ? 'animate-spin' : ''}`} />
                    <span>{syncingHistory ? 'Menyinkronkan...' : 'Tarik Riwayat'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenBroadcastModal}
                  className="text-[11px] font-bold text-[#00AFC4] hover:text-[#0096a8] flex items-center gap-1 cursor-pointer"
                  title="Kirim pesan massal/blast ke banyak kontak WhatsApp"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Broadcast WA</span>
                </button>
              </div>

              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllConversations}
                  disabled={clearingInbox}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition disabled:opacity-60"
                  title="Kosongkan seluruh percakapan Inbox (Truncate data POC)"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{clearingInbox ? 'Mengosongkan...' : 'Kosongkan'}</span>
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pesan, nomor WA, kontak..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00AFC4]"
              />
            </div>

            {/* Channel Filters */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setChannelFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    channelFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setChannelFilter('whatsapp')}
                  className={`px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                    channelFilter === 'whatsapp' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <span>WA</span>
                </button>
                <button
                  onClick={() => setChannelFilter('email')}
                  className={`px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                    channelFilter === 'email' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <span>Email</span>
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-[11px] font-semibold p-1 rounded-md border border-slate-200 bg-white text-slate-700"
              >
                <option value="open">Terbuka</option>
                <option value="closed">Selesai</option>
              </select>
            </div>

            {/* Department Filter (Sales vs Support) */}
            {activeRole === 'owner' ? (
              <div className="flex items-center bg-slate-200/50 p-0.5 rounded-lg text-[10px] font-bold text-slate-600">
                <button
                  onClick={() => setDeptFilter('all')}
                  className={`flex-1 py-1 rounded-md transition text-center cursor-pointer ${
                    deptFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  Semua Divisi
                </button>
                <button
                  onClick={() => setDeptFilter('sales')}
                  className={`flex-1 py-1 rounded-md transition text-center cursor-pointer ${
                    deptFilter === 'sales' ? 'bg-[#00AFC4] text-white shadow-2xs font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  Pre-Sales
                </button>
                <button
                  onClick={() => setDeptFilter('support')}
                  className={`flex-1 py-1 rounded-md transition text-center cursor-pointer ${
                    deptFilter === 'support' ? 'bg-purple-600 text-white shadow-2xs font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  After-Sales (CS)
                </button>
              </div>
            ) : activeRole === 'sales' ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-cyan-50 border border-cyan-200/80 rounded-lg text-[11px] font-bold text-[#008A9B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00AFC4]"></span>
                  <span>Divisi: Pre-Sales</span>
                </div>
                <span className="text-[10px] font-semibold bg-cyan-100/70 text-cyan-800 px-1.5 py-0.5 rounded">Khusus Sales</span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-purple-50 border border-purple-200/80 rounded-lg text-[11px] font-bold text-purple-700">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  <span>Divisi: After-Sales (CS)</span>
                </div>
                <span className="text-[10px] font-semibold bg-purple-100/70 text-purple-800 px-1.5 py-0.5 rounded">Khusus CS</span>
              </div>
            )}
            {/* Team Inbox Assignment & Exception Filters */}
            <div className="space-y-1.5 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Penugasan Tim
                </span>
                {(assignmentFilter !== 'all' || priorityFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setAssignmentFilter('all');
                      setPriorityFilter('all');
                    }}
                    className="text-[10px] text-cyan-600 hover:underline font-semibold cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Assignment Filter Pills */}
              <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setAssignmentFilter('all')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                    assignmentFilter === 'all'
                      ? 'bg-slate-800 text-white border-slate-800 font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua Chat</span>
                  <span className={`text-[10px] font-mono ${assignmentFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
                    {conversations.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignmentFilter('mine')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                    assignmentFilter === 'mine'
                      ? 'bg-cyan-700 text-white border-cyan-700 font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Tugas Saya</span>
                  <span className={`text-[10px] font-mono ${assignmentFilter === 'mine' ? 'text-cyan-200' : 'text-slate-400'}`}>
                    {conversations.filter((c) => c.assigned_to_id === user?.id).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignmentFilter('unassigned')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                    assignmentFilter === 'unassigned'
                      ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">Belum Ditugaskan</span>
                  <span className={`text-[10px] font-mono ${assignmentFilter === 'unassigned' ? 'text-amber-100' : 'text-slate-400'}`}>
                    {conversations.filter((c) => !c.assigned_to_id).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignmentFilter('exceptions')}
                  className={`px-2 py-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                    assignmentFilter === 'exceptions'
                      ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70'
                  }`}
                  title="Percakapan kritis, SLA terlewat, eskalasi, atau komplain"
                >
                  <span className="truncate flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Pengecualian</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${assignmentFilter === 'exceptions' ? 'text-rose-100' : 'text-rose-600'}`}>
                    {conversations.filter((c) => c.is_sla_breached || c.priority === 'urgent' || c.priority === 'high' || Boolean(c.escalated_to_id) || !c.assigned_to_id).length}
                  </span>
                </button>
              </div>

              {/* Priority Filter Pills */}
              <div className="flex items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">Prioritas:</span>
                <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                  {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriorityFilter(p)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                        priorityFilter === p
                          ? p === 'urgent'
                            ? 'bg-rose-600 text-white'
                            : p === 'high'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {p === 'all' ? 'Semua' : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Conversation List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Tidak ada percakapan sesuai filter.
                <p className="text-[11px] mt-1 text-slate-400">
                  Coba ubah filter penugasan, divisi, atau status pencarian Anda.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const isWA = conv.channel === 'whatsapp';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-cyan-50/60 border-l-4 border-l-[#00AFC4]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar with Channel Icon Badge */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {conv.contact_name ? conv.contact_name.charAt(0) : 'U'}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white shadow-2xs ${
                          isWA ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        title={isWA ? 'WhatsApp' : 'Email'}
                      >
                        {isWA ? 'W' : '@'}
                      </span>
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                          <span className="truncate">{conv.contact_name || conv.channel_identifier}</span>
                          {conv.sentiment === 'critical' ? (
                            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 animate-pulse" title="Sentimen Kritis" />
                          ) : conv.sentiment === 'negative' ? (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Sentimen Komplain" />
                          ) : conv.sentiment === 'positive' ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Sentimen Positif / Prospek" />
                          ) : null}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatDateIndo(conv.last_message_at).slice(0, 10)}
                        </span>
                      </div>

                      {conv.company_name && (
                        <span className="text-[10px] text-slate-500 block truncate mb-1">
                          {conv.company_name}
                        </span>
                      )}

                      <p className="text-xs text-slate-600 truncate">
                        {conv.last_message_content || conv.subject || 'Percakapan baru'}
                      </p>

                      {/* Governance, SLA & Assignment Meta Badges */}
                      <div className="flex items-center flex-wrap gap-1 text-[10px] mt-1.5">
                        {conv.is_sla_breached && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-extrabold flex items-center gap-0.5 border border-rose-200">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> SLA Lewat
                          </span>
                        )}
                        {conv.escalated_to_id && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold flex items-center gap-0.5 border border-purple-200">
                            <Zap className="w-2.5 h-2.5 shrink-0" /> Eskalasi
                          </span>
                        )}
                        {conv.priority === 'urgent' && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-black text-[9px] uppercase">
                            Urgent
                          </span>
                        )}
                        {conv.priority === 'high' && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold text-[9px] uppercase">
                            Tinggi
                          </span>
                        )}
                        {conv.bot_active ? (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold flex items-center gap-0.5 border border-indigo-200 text-[9px]">
                            <Bot className="w-2.5 h-2.5 shrink-0" /> Bot
                          </span>
                        ) : conv.bot_handoff_reason ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-black flex items-center gap-0.5 border border-amber-300 text-[9px] animate-pulse">
                            ⚠️ Butuh CS
                          </span>
                        ) : null}
                        <span className="text-slate-400 ml-auto flex items-center gap-1 font-medium truncate max-w-[130px]">
                          {conv.assigned_to_name ? (
                            <span className="text-slate-600 truncate" title={`Ditugaskan ke ${conv.assigned_to_name}`}>
                              👤 {conv.assigned_to_name}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold" title="Belum ditugaskan ke agen manapun">
                              ⚠️ Belum Ditugaskan
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Unread badge */}
                    {conv.unread_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px] shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= KOLOM 2: LIVE CHAT ROOM (CENTER AREA) ================= */}
        {activeConv ? (
          <div className="flex-1 flex flex-col bg-[#F3F4F6] overflow-hidden">
            {/* Chat Room Header */}
            <div className="bg-white border-b border-slate-200 shrink-0 shadow-2xs">
              {/* Row 1: Contact Info & Primary CRM Actions */}
              <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-[#00AFC4] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {activeConv.contact_name ? activeConv.contact_name.charAt(0) : 'C'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {activeConv.contact_name || activeConv.channel_identifier}
                      </h2>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          activeConv.channel === 'whatsapp'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {activeConv.channel === 'whatsapp' ? 'WA' : 'Email'}
                      </span>
                      {activeConv.bot_active ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Bot className="w-2.5 h-2.5" />
                          Bot Membalas
                        </span>
                      ) : activeConv.bot_handoff_reason ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          ⚠️ Perlu CS
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          CS Manusia
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {activeConv.channel_identifier} {activeConv.company_name ? `• ${activeConv.company_name}` : ''}
                    </span>
                  </div>
                </div>

                {/* Primary CRM Actions (Compact) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {activeConv.bot_active ? (
                    <button
                      type="button"
                      onClick={() => handleToggleBot(false)}
                      className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Chatbot sedang aktif. Klik untuk mengambil alih ke agen CS manusia."
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ambil Alih CS</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleBot(true)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Klik untuk mengaktifkan kembali chatbot otomatis."
                    >
                      <Bot className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Aktifkan Bot</span>
                    </button>
                  )}

                  {isSupervisorOrAdmin && (
                    <Link
                      href="/settings?tab=chatbot"
                      className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#00AFC4] text-xs font-bold border border-teal-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Kelola & Sesuaikan Template Chatbot Perusahaan (Khusus Admin/Owner)"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Template Bot</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleSummarizeChat}
                    disabled={summarizing}
                    className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1 border border-indigo-200 cursor-pointer shadow-2xs disabled:opacity-50"
                    title="Gunakan AI untuk meringkas percakapan dan deteksi sentimen klien"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${summarizing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{summarizing ? 'Meringkas...' : 'Ringkas AI'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setDealTitle(`Kesepakatan - ${activeConv.contact_name || activeConv.channel_identifier}`);
                      setShowConvertModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#00AFC4] hover:bg-[#0096a8] text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Jadikan prospek ini sebagai peluang baru di Pipeline (Pre-Sales)"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Peluang</span>
                  </button>

                  <button
                    onClick={() => {
                      setTicketSubject(`Keluhan/Kendala - ${activeConv.contact_name || activeConv.channel_identifier}`);
                      const lastMsg = messages.length > 0 ? messages[messages.length - 1].content : '';
                      setTicketDesc(lastMsg);
                      setShowTicketModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Jadikan obrolan ini sebagai Tiket Bantuan CS (After-Sales Helpdesk)"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tiket CS</span>
                  </button>

                  <button
                    onClick={handleToggleStatus}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      activeConv.status === 'open'
                        ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {activeConv.status === 'open' ? 'Selesai' : 'Buka'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteConversation(
                        activeConv.id,
                        activeConv.contact_name || activeConv.channel_identifier
                      )
                    }
                    disabled={deletingConv}
                    className="p-1 rounded-lg text-xs font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer shadow-2xs"
                    title="Hapus obrolan ini dari CRM"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: Governance, Assignment & Priority Control Bar */}
              <div className="px-4 py-2 bg-slate-50 flex items-center justify-between gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Tata Kelola:</span>
                  </span>

                  {/* Priority Selector */}
                  <select
                    value={activeConv.priority || 'medium'}
                    onChange={(e) => handlePriorityChange(activeConv.id, e.target.value)}
                    className={`text-xs font-bold px-2 py-1 rounded-lg border shadow-2xs focus:outline-hidden cursor-pointer ${
                      activeConv.priority === 'urgent'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : activeConv.priority === 'high'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                    title="Ubah prioritas penanganan"
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 Prioritas Tinggi</option>
                    <option value="medium">🟡 Normal</option>
                    <option value="low">🟢 Rendah</option>
                  </select>

                  {/* Quick Assign Dropdown */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Agen:</span>
                    <select
                      value={activeConv.assigned_to_id || ''}
                      onChange={(e) => handleQuickAssign(activeConv.id, e.target.value || undefined)}
                      className="text-xs font-semibold px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 shadow-2xs focus:outline-hidden cursor-pointer max-w-[140px] truncate"
                      title="Tugaskan percakapan ke anggota tim"
                    >
                      <option value="">⚠️ Belum Ditugaskan</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.full_name || m.email} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Governance Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowTakeoverModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1 border border-amber-300 cursor-pointer shadow-2xs"
                    title="Ambil alih percakapan (Take Over) dengan alasan bisnis tercatat di audit trail"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Ambil Alih</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition flex items-center gap-1 border border-purple-300 cursor-pointer shadow-2xs"
                    title="Eskalasi percakapan ini ke supervisor atau owner"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-600" />
                    <span>Eskalasi</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Access on Demand Governance Banner */}
            {(activeRole === 'owner' || activeRole === 'supervisor') &&
              activeConv.assigned_to_id &&
              activeConv.assigned_to_id !== user?.id && (
                <div className="bg-slate-900 text-slate-200 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      <strong>Tata Kelola Akses:</strong> Anda melihat percakapan yang ditugaskan kepada{' '}
                      <strong>{activeConv.assigned_to_name || 'staf lain'}</strong>.
                      {loggedConvs[activeConv.id] ? (
                        <span className="text-emerald-400 ml-1 font-semibold">✓ Alasan akses tercatat di Audit Trail.</span>
                      ) : (
                        <span className="text-slate-400 ml-1">Sesuai etika non-surveillance, cantumkan alasan supervisi.</span>
                      )}
                    </span>
                  </div>
                  {!loggedConvs[activeConv.id] && (
                    <button
                      onClick={() => setShowAccessLogModal(true)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition cursor-pointer shrink-0 shadow-xs"
                    >
                      Catat Alasan Akses
                    </button>
                  )}
                </div>
            )}

            {/* Escalation Active Banner */}
            {activeConv.escalated_to_id && (
              <div className="bg-purple-50 border-b border-purple-200 px-6 py-2 flex items-center justify-between text-xs text-purple-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    <strong>Percakapan Dieskalasi</strong>{' '}
                    {activeConv.escalated_to_name ? `ke ${activeConv.escalated_to_name}` : ''}
                    {activeConv.escalation_reason ? `: "${activeConv.escalation_reason}"` : ''}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                  Eskalasi Aktif
                </span>
              </div>
            )}

            {/* Bot Handoff Alert Banner */}
            {!activeConv.bot_active && activeConv.bot_handoff_reason && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="font-bold text-amber-950 shrink-0">🚨 Dialihkan dari Bot ke CS:</span>
                  <span className="text-slate-700 italic truncate">
                    "{activeConv.bot_handoff_reason}"
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    Menunggu Respon Agen CS
                  </span>
                </div>
              </div>
            )}

            {/* SLA Breached Warning Banner */}
            {activeConv.is_sla_breached && (
              <div className="bg-rose-50 border-b border-rose-200 px-6 py-2 flex items-center justify-between text-xs text-rose-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                  <span>
                    <strong>Peringatan SLA Terlewat (Breached):</strong> First Response Time atau SLA penyelesaian melewati batas target.
                  </span>
                </div>
                <button
                  onClick={() => setShowTakeoverModal(true)}
                  className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                >
                  Ambil Alih Sekarang &rarr;
                </button>
              </div>
            )}

            {/* AI Summary Banner (Pilar 5) */}
            {aiSummary && (
              <div className="bg-linear-to-r from-indigo-50/95 to-purple-50/95 p-4 border-b border-indigo-200/80 flex items-start gap-3 relative animate-in fade-in">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 flex items-center gap-2">
                      <span>Rangkuman AI Percakapan</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                        aiSummary.sentiment === 'critical' || aiSummary.sentiment === 'negative'
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : aiSummary.sentiment === 'positive'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : 'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}>
                        Sentimen: {aiSummary.sentiment} (Skor: {Math.round(aiSummary.sentiment_score * 100)}%)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAiSummary(null)}
                      className="text-indigo-400 hover:text-indigo-700 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-indigo-900 font-medium">
                    {aiSummary.key_points.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                  <div className="pt-1 text-[11px] text-indigo-800 font-semibold flex items-center gap-1.5 bg-white/70 p-2 rounded-lg border border-indigo-200/50">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Rekomendasi Tindakan: <strong>{aiSummary.next_action}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#00AFC4] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Belum ada pesan dalam percakapan ini.
                </div>
              ) : (
                messages.map((msg) => {
                  const isAgent = msg.sender_type === 'agent';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-semibold text-slate-500">
                          {isAgent ? `Anda (${msg.sender_name})` : msg.sender_name}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isAgent
                            ? 'bg-[#142740] text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                        }`}
                      >
                        {/* Attachment Preview if present */}
                        {msg.metadata?.attachment_url && (
                          <div className="mb-2">
                            {msg.metadata.attachment_type === 'image' || msg.metadata.mime_type?.startsWith('image/') ? (
                              <a
                                href={getAttachmentFullUrl(msg.metadata.attachment_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block overflow-hidden rounded-xl group relative border border-white/10"
                              >
                                <img
                                  src={getAttachmentFullUrl(msg.metadata.attachment_url)}
                                  alt={msg.metadata.attachment_name || 'Gambar'}
                                  className="max-h-64 max-w-full rounded-xl object-contain hover:scale-101 transition bg-black/20"
                                />
                              </a>
                            ) : msg.metadata.attachment_type === 'video' || msg.metadata.mime_type?.startsWith('video/') ? (
                              <video
                                controls
                                className="max-h-64 max-w-full rounded-xl bg-black"
                                src={getAttachmentFullUrl(msg.metadata.attachment_url)}
                              />
                            ) : (
                              <a
                                href={getAttachmentFullUrl(msg.metadata.attachment_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={msg.metadata.attachment_name || 'dokumen'}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition ${
                                  isAgent
                                    ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                                }`}
                              >
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-500 shrink-0">
                                  {msg.metadata.mime_type?.includes('spreadsheet') || msg.metadata.attachment_name?.endsWith('.xlsx') || msg.metadata.attachment_name?.endsWith('.xls') || msg.metadata.attachment_name?.endsWith('.csv') ? (
                                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-red-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <span className="font-semibold text-xs block truncate">
                                    {msg.metadata.attachment_name || 'Dokumen Terlampir'}
                                  </span>
                                  <span className={`text-[10px] block ${isAgent ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {formatFileSize(msg.metadata.file_size) ? `${formatFileSize(msg.metadata.file_size)} • ` : ''}Unduh berkas
                                  </span>
                                </div>
                                <Download className={`w-4 h-4 shrink-0 ${isAgent ? 'text-white' : 'text-slate-600'}`} />
                              </a>
                            )}
                          </div>
                        )}

                        {msg.content && msg.content !== msg.metadata?.attachment_name && (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1 px-1 text-[9px] text-slate-400">
                        {isAgent && (
                          <span className="flex items-center gap-0.5 text-[#00AFC4]">
                            <CheckCheck className="w-3 h-3" />
                            <span>Terkirim ke WhatsApp {activeConv.channel_identifier}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Smart Reply Suggestions (Pilar 5) */}
            {aiSuggestions && aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 && (
              <div className="px-6 py-2 bg-indigo-50/90 border-t border-indigo-200/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                  <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" /> Template Sesuai Pertanyaan ({aiSuggestions.detected_intent || 'Smart'}):
                </span>
                {aiSuggestions.suggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(sug.content)}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-950 text-[11px] whitespace-nowrap transition cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5"
                    title={sug.content}
                  >
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold uppercase">{sug.title}</span>
                    <span className="truncate max-w-[240px] text-slate-600">{sug.content}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Canned Responses Pills */}
            <div className="px-6 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-[#00AFC4]" /> Template Cepat CS:
              </span>
              {cannedResponses.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReplyText(item.text)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] whitespace-nowrap transition cursor-pointer shadow-2xs shrink-0 font-medium"
                >
                  {item.title}
                </button>
              ))}
            </div>

            {/* Reply Input Box */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={handleSendReply} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activeConv.channel === 'whatsapp' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                    ></span>
                    Membalas via WhatsApp dari nomor <strong>{businessNumber}</strong> ke <strong>{activeConv.channel_identifier}</strong>
                  </span>
                  <span className="text-slate-400">Tekan Kirim atau Enter</span>
                </div>

                {/* File Attachment Preview Banner */}
                {selectedFile && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt="Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-slate-300 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                          {selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv') ? (
                            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                          ) : selectedFile.type.startsWith('video/') ? (
                            <VideoIcon className="w-5 h-5 text-purple-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <span className="font-bold text-slate-800 block truncate text-xs">
                          {selectedFile.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatFileSize(selectedFile.size)} • Siap dikirim
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                      title="Batalkan lampiran"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm,.zip,.rar"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendingReply}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer border border-slate-200 shrink-0"
                    title="Lampirkan berkas (PDF, DOCX, Excel, Gambar, Video, dll)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      selectedFile
                        ? `Tambah keterangan/caption untuk ${selectedFile.name} (opsional)...`
                        : `Ketik pesan balasan langsung ke WhatsApp pelanggan (${activeConv.channel_identifier})...`
                    }
                    className="flex-1 p-3 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#00AFC4] focus:border-transparent resize-none bg-slate-50/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || (!replyText.trim() && !selectedFile)}
                    className="px-4 py-3 bg-[#00AFC4] hover:bg-[#0096a8] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sendingReply ? 'Mengirim...' : 'Kirim'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50">
            <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-sm">Pilih Percakapan untuk Memulai</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Semua pesan masuk dari WhatsApp ke nomor <strong>{businessNumber}</strong> akan langsung terhubung ke sini dan dapat dibalas seketika.
            </p>
          </div>
        )}

        {/* ================= KOLOM 3: CUSTOMER 360 & CRM CONTEXT (RIGHT SIDEBAR) ================= */}
        {activeConv && (
          <div className="w-72 bg-white border-l border-slate-200 p-5 overflow-y-auto hidden xl:block space-y-6 shrink-0">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                Profil Pelanggan
              </span>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-[#142740] text-[#00AFC4] font-bold flex items-center justify-center text-base shadow-xs">
                  {activeConv.contact_name ? activeConv.contact_name.charAt(0) : 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-slate-900 truncate">
                    {activeConv.contact_name || 'Pelanggan Baru'}
                  </h3>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {activeConv.company_name || 'Individual / Belum Ada PT'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{activeConv.contact_phone || activeConv.channel_identifier}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{activeConv.contact_email || '-'}</span>
                </div>
                {activeConv.contact_id && (
                  <Link
                    href={`/contacts/${activeConv.contact_id}`}
                    className="mt-2 text-[#00AFC4] hover:underline font-semibold text-[11px] flex items-center gap-1 pt-1"
                  >
                    <span>Lihat Riwayat Kontak 360</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>

            {/* Related Deals in Pipeline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Peluang di Pipeline ({contactDeals.length})
                </span>
                <button
                  onClick={() => {
                    setDealTitle(`Peluang dari ${activeConv.contact_name || activeConv.channel_identifier}`);
                    setShowConvertModal(true);
                  }}
                  className="text-[10px] font-bold text-[#00AFC4] hover:underline cursor-pointer"
                >
                  + Buat Baru
                </button>
              </div>

              {contactDeals.length === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                  Belum ada peluang penjualan untuk kontak ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {contactDeals.map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <span className="font-bold text-xs text-slate-800 line-clamp-1">{d.title}</span>
                      <div className="flex items-center justify-between text-[11px] mt-1">
                        <span className="font-extrabold text-[#142740]">{formatCurrencyIDR(d.value)}</span>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                          {d.stage_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Governance & SLA Sidebar Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00AFC4]" />
                  <span>Tata Kelola & SLA</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeConv.is_sla_breached
                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                }`}>
                  {activeConv.is_sla_breached ? 'SLA Terlewat' : 'SLA Aman'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400">Prioritas:</span>
                  <span className={`font-bold capitalize px-1.5 py-0.5 rounded text-[10px] ${
                    activeConv.priority === 'urgent'
                      ? 'bg-rose-500 text-white'
                      : activeConv.priority === 'high'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}>
                    {activeConv.priority || 'medium'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400">Penanggung Jawab:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[140px]">
                    {activeConv.assigned_to_name || 'Belum Ditugaskan'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-slate-400">Respon Pertama:</span>
                  <span className="font-semibold text-slate-700">
                    {activeConv.first_responded_at ? 'Terjawab' : activeConv.is_sla_breached ? 'Terlewat (>15m)' : 'Menunggu'}
                  </span>
                </div>

                {activeConv.escalated_to_id && (
                  <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-purple-600" />
                      <span>Eskalasi ke {activeConv.escalated_to_name || 'Supervisor'}</span>
                    </span>
                    {activeConv.escalation_reason && (
                      <p className="text-[10px] text-purple-700 italic">
                        "{activeConv.escalation_reason}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons inside Card */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTakeoverModal(true)}
                  className="w-full py-1.5 px-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Ambil Alih Penugasan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(true)}
                  className="w-full py-1.5 px-2.5 rounded-xl text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-purple-700" />
                  <span>Eskalasi ke Supervisor</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ================= MODAL: HUBUNGKAN & SCAN QR WHATSAPP CS ================= */}
      {showConnectionInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Hubungkan WhatsApp CS
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tautkan nomor WhatsApp bisnis untuk live chat langsung dengan calon pelanggan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectionInfo(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* 1. Card Nomor WhatsApp CS Bisnis */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Nomor WhatsApp CS Perusahaan
                  </span>
                  <span className="text-lg font-extrabold text-slate-900 tracking-wide">
                    {businessNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingChannel(!isEditingChannel)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-2xs"
                >
                  {isEditingChannel ? 'Batal' : 'Ganti Nomor'}
                </button>
              </div>

              {isEditingChannel && (
                <form onSubmit={handleSaveChannel} className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    placeholder="+6281295099738"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={savingChannel}
                    className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition shadow-2xs"
                  >
                    {savingChannel ? 'Menyimpan...' : 'Simpan Nomor'}
                  </button>
                </form>
              )}
            </div>

            {/* 2. QR Code / Connected Status */}
            {wahaStatus === 'WORKING' ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-sm block">WhatsApp CS Terhubung & Aktif!</span>
                      <span className="text-[11px] text-emerald-100">Siap menerima & membalas pesan secara real-time</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-[10px] font-black uppercase tracking-wider">
                    Online
                  </span>
                </div>

                <div className="text-xs bg-black/15 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center py-0.5 border-b border-white/10">
                    <span className="text-emerald-100">Nomor Tertaut:</span>
                    <span className="font-bold font-mono">+{connectedPhone || businessNumber.replace(/^\+/, '')}</span>
                  </div>
                  {connectedName && (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-emerald-100">Nama Profil:</span>
                      <span className="font-bold">{connectedName}</span>
                    </div>
                  )}
                </div>

                {/* Sync History Action */}
                <div className="bg-black/15 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs block text-white">Sinkronisasi Riwayat Chat</span>
                      <span className="text-[11px] text-emerald-100">Tampilkan semua obrolan & riwayat pesan WhatsApp ke Inbox</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSyncHistory(true)}
                      disabled={syncingHistory}
                      className="px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingHistory ? 'animate-spin' : ''}`} />
                      <span>{syncingHistory ? 'Menyinkronkan...' : 'Tarik Riwayat'}</span>
                    </button>
                  </div>
                  {syncStatusMsg && (
                    <div className="text-[11px] bg-emerald-950/40 px-2.5 py-1.5 rounded-lg text-emerald-100 leading-snug">
                      {syncStatusMsg}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-emerald-100">
                    Ingin mengganti nomor CS?
                  </span>
                  <button
                    type="button"
                    onClick={handleRestartSession}
                    disabled={restartingSession}
                    className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{restartingSession ? 'Memproses...' : 'Tautkan Ulang / Ganti Akun'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-800">Scan QR Code untuk Menghubungkan</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestartSession}
                    disabled={restartingSession}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    {restartingSession ? 'Memuat ulang...' : 'Muat Ulang QR'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* QR Image Box */}
                  <div className="w-44 h-44 border-2 border-dashed border-emerald-300 rounded-xl p-2 bg-slate-50 flex items-center justify-center shrink-0 relative shadow-2xs overflow-hidden">
                    {qrLoading && !qrHasError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-2 text-center z-10">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-1.5" />
                        <span className="text-[10px] text-slate-500 font-medium">Memuat QR Code...</span>
                      </div>
                    )}
                    {qrHasError ? (
                      <div className="flex flex-col items-center justify-center p-3 text-center bg-rose-50/90 rounded-lg w-full h-full border border-rose-200">
                        <AlertCircle className="w-6 h-6 text-rose-500 mb-1 shrink-0" />
                        <span className="text-[10px] font-bold text-rose-800 leading-tight">
                          QR Belum Tersedia
                        </span>
                        <span className="text-[9px] text-rose-600 mt-1 leading-tight line-clamp-2">
                          Pastikan service WAHA aktif & WHATSAPP_GATEWAY_URL sudah diatur
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setQrHasError(false);
                            setQrLoading(true);
                            setQrRefreshKey(Date.now());
                          }}
                          className="mt-2 px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md text-[10px] font-bold shadow-2xs transition cursor-pointer"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    ) : (
                      <img
                        src={`${apiUrl}/workspaces/${currentWorkspace?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}/inbox/whatsapp-qr?session=${sessionName}&token=${typeof window !== 'undefined' ? localStorage.getItem('octo_token') || '' : ''}&t=${qrRefreshKey}`}
                        alt="WhatsApp QR Code"
                        className={`w-full h-full object-contain rounded-lg transition-opacity duration-200 ${qrLoading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => {
                          setQrLoading(false);
                          setQrHasError(false);
                        }}
                        onError={() => {
                          setQrLoading(false);
                          setQrHasError(true);
                        }}
                      />
                    )}
                  </div>

                  {/* 4 Simple Steps */}
                  <div className="space-y-2 text-xs text-slate-600 flex-1">
                    <span className="font-bold text-slate-800 block text-xs">
                      Langkah menghubungkan di ponsel:
                    </span>
                    <ol className="space-y-1.5 text-[11px] list-decimal list-inside text-slate-600 leading-relaxed">
                      <li>
                        Buka aplikasi <strong className="text-slate-800">WhatsApp</strong> di ponsel CS (<strong>{businessNumber}</strong>).
                      </li>
                      <li>
                        Ketuk menu titik tiga (<strong className="text-slate-800">⋮</strong>) atau menu <strong className="text-slate-800">Pengaturan</strong>.
                      </li>
                      <li>
                        Pilih <strong className="text-slate-800">Perangkat Tertaut</strong>, lalu ketuk <strong className="text-slate-800">Tautkan Perangkat</strong>.
                      </li>
                      <li>
                        Arahkan kamera ke QR Code di samping.
                      </li>
                    </ol>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center gap-2 text-[11px] text-emerald-800">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>
                    Setelah QR berhasil di-scan, layar ini akan otomatis terhubung tanpa perlu me-refresh halaman.
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
                  💡 <strong>Catatan:</strong> Jika muncul tulisan <em>&quot;Couldn&apos;t link device&quot;</em> di HP, pastikan jumlah perangkat tertaut di WhatsApp Anda belum mencapai batas maksimal (maksimal 4 perangkat) dan klik <strong>Muat Ulang QR</strong> untuk mendapatkan kode QR yang baru.
                </div>
              </div>
            )}

            {/* 3. Multi-Channel & Multi-Account List (Sales vs CS) */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#00AFC4]" />
                  <span>Daftar Saluran WhatsApp Akun ({workspaceChannels.length})</span>
                </span>
                <span className="text-[10px] text-slate-400">Pemisahan Jalur Sales vs CS</span>
              </div>

              <div className="space-y-2">
                {workspaceChannels.map((wc) => (
                  <div key={wc.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800">{wc.channel_name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${wc.department === 'sales' ? 'bg-[#00AFC4]/10 text-[#00AFC4]' : 'bg-purple-100 text-purple-700'}`}>
                          {wc.department === 'sales' ? 'Pre-Sales' : 'After-Sales'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">{wc.phone_number || 'Belum diisi'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${wc.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {wc.status === 'connected' ? 'Aktif' : 'Scan QR'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => setShowConnectionInfo(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: JADIKAN PELUANG (CONVERT TO DEAL) ================= */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00AFC4]" />
              Jadikan Peluang Penjualan (Pipeline Deal)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Konversikan percakapan WhatsApp ini menjadi peluang bisnis resmi di Sales Pipeline.
            </p>

            <form onSubmit={handleConvertToDeal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Peluang</label>
                <input
                  type="text"
                  required
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimasi Nilai (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step={500000}
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahap Pipeline</label>
                  <select
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    {pipelines[0]?.stages?.map((stg) => (
                      <option key={stg.id} value={stg.id}>
                        {stg.name} ({stg.probability}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="px-4 py-1.5 rounded-lg bg-[#00AFC4] hover:bg-[#0096a8] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {converting ? 'Membuat...' : 'Buat Peluang di Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONVERSI CHAT KE TIKET AFTER-SALES ================= */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-purple-600" />
              Jadikan Tiket Bantuan CS (After-Sales)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Buat tiket helpdesk untuk komplain atau kendala teknis agar dapat di-assign dan dimonitor alurnya.
            </p>

            <form onSubmit={handleCreateTicketFromChat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subjek Tiket *</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Subjek komplain / kendala"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="complaint">Komplain Layanan</option>
                    <option value="technical">Kendala Teknis</option>
                    <option value="billing">Tagihan / Billing</option>
                    <option value="general">Pertanyaan Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas & SLA</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="low">Rendah (48 Jam)</option>
                    <option value="medium">Sedang (48 Jam)</option>
                    <option value="high">Tinggi (24 Jam)</option>
                    <option value="urgent">Mendesak (SLA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Departemen Alur</label>
                <select
                  value={ticketDept}
                  onChange={(e) => setTicketDept(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="support">Customer Support (L1)</option>
                  <option value="technical">Tim Teknis / Engineering</option>
                  <option value="billing">Billing & Finance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Kasus</label>
                <textarea
                  rows={3}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Rincian keluhan pelanggan..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer transition"
                >
                  {creatingTicket ? 'Membuat Tiket...' : 'Buat Tiket CS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: WHATSAPP BROADCAST ENGINE (PILAR 2) ================= */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00AFC4]/10 text-[#00AFC4] flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    WhatsApp Broadcast & Campaign Engine
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kirim pesan broadcast personal dengan variabel template otomatis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBroadcastTab('create')}
                className={`pb-2 px-1 border-b-2 transition ${
                  broadcastTab === 'create'
                    ? 'border-[#00AFC4] text-[#00AFC4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Kirim Blast Baru
              </button>
              <button
                type="button"
                onClick={() => setBroadcastTab('history')}
                className={`pb-2 px-1 border-b-2 transition ${
                  broadcastTab === 'history'
                    ? 'border-[#00AFC4] text-[#00AFC4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Riwayat Kampanye ({broadcastCampaigns.length})
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 text-xs">
              {broadcastTab === 'create' ? (
                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kampanye Blast</label>
                      <input
                        type="text"
                        required
                        value={broadcastName}
                        onChange={(e) => setBroadcastName(e.target.value)}
                        placeholder="Contoh: Promo Q4 CRM Enterprise"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Divisi Pengirim</label>
                      <select
                        value={broadcastDept}
                        onChange={(e: any) => setBroadcastDept(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      >
                        <option value="sales">Pre-Sales (Penawaran & Promosi)</option>
                        <option value="support">After-Sales (Pengumuman CS & Maintenance)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Template Pesan WhatsApp</label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Sisipkan Variabel:</span>
                        {['{{first_name}}', '{{company}}', '{{phone}}'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setBroadcastMessage((prev) => prev + ' ' + tag)}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-[#E8F8FA] text-[#00AFC4] font-mono text-[10px] font-bold transition"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      required
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                    />
                  </div>

                  {/* Live Interpolation Preview Card */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                      <span>Pratinjau Pesan yang Diterima Klien:</span>
                    </span>
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 text-slate-700 text-xs whitespace-pre-wrap shadow-2xs font-sans">
                      {broadcastMessage
                        .replaceAll('{{first_name}}', 'Rian')
                        .replaceAll('{{full_name}}', 'Rian Pratama')
                        .replaceAll('{{company}}', 'PT Maju Makmur Sentosa')
                        .replaceAll('{{phone}}', '+6281234567890')}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Anti-Ban Smart Pacing:
                    </p>
                    <p>
                      Sistem memberi jeda 1.5 detik per kontak secara otomatis untuk melindungi reputasi nomor WhatsApp Anda agar tidak terdeteksi spam.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBroadcastModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={sendingBroadcast}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00AFC4] hover:bg-[#0096a8] text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {sendingBroadcast ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengirimkan Broadcast...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim Blast ke Semua Kontak WA</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  {broadcastCampaigns.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Belum ada kampanye broadcast yang dikirim.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5">Nama Kampanye</th>
                            <th className="px-4 py-2.5">Divisi</th>
                            <th className="px-4 py-2.5">Terkirim / Target</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5">Waktu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {broadcastCampaigns.map((camp) => (
                            <tr key={camp.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-semibold text-slate-800">{camp.name}</td>
                              <td className="px-4 py-2.5 uppercase text-[10px] font-bold text-slate-500">{camp.department}</td>
                              <td className="px-4 py-2.5 font-mono text-[11px]">
                                <span className="text-emerald-600 font-bold">{camp.sent_count}</span> / {camp.total_recipients}
                                {camp.failed_count > 0 && (
                                  <span className="text-rose-600 font-bold ml-1">({camp.failed_count} gagal)</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  camp.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : camp.status === 'sending'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {camp.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                                {formatDateIndo(camp.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= GOVERNANCE MODALS ================= */}
      <TakeoverModal
        isOpen={showTakeoverModal}
        onClose={() => setShowTakeoverModal(false)}
        conversation={activeConv || null}
        reason={takeoverReason}
        setReason={setTakeoverReason}
        onConfirm={handleTakeover}
        loading={takingOver}
      />

      <EscalateModal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        conversation={activeConv || null}
        members={members}
        escalateToId={escalateToId}
        setEscalateToId={setEscalateToId}
        reason={escalateReason}
        setReason={setEscalateReason}
        priority={escalatePriority}
        setPriority={setEscalatePriority}
        onConfirm={handleEscalate}
        loading={escalating}
      />

      <AccessLogModal
        isOpen={showAccessLogModal}
        onClose={() => setShowAccessLogModal(false)}
        conversation={activeConv || null}
        reason={accessLogReason}
        setReason={setAccessLogReason}
        onConfirm={handleLogAccess}
        loading={loggingAccess}
      />

      <GovernancePolicyModal
        isOpen={showGovernanceModal}
        onClose={() => setShowGovernanceModal(false)}
      />
    </div>
  );
}
