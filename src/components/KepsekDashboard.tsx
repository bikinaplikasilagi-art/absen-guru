import React, { useState } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  Calendar,
  AlertTriangle,
  FileCheck,
  UserX,
  UserCheck,
  Compass,
  MessageSquare,
  X,
  FileText,
  Camera,
  Image as ImageIcon,
  BookOpen,
  User,
  Lock,
  Settings,
  Upload,
  Eye,
  EyeOff,
  Printer
} from 'lucide-react';
import { Teacher, AttendanceRecord, LeaveRequest, TeacherJournal } from '../types';

const compressImage = (base64Str: string, maxWidth = 150, maxHeight = 150): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // compress with 80% JPEG quality
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120'
];

interface KepsekDashboardProps {
  currentKepsek: any;
  onUpdateKepsekProfile: (newProfile: any) => void;
  teachers: Teacher[];
  attendanceHistory: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  onApproveLeave: (leaveId: string, isApproved: boolean, comment?: string) => void;
  journals: TeacherJournal[];
  onUpdateJournal: (updated: TeacherJournal) => void;
}

export default function KepsekDashboard({
  currentKepsek,
  onUpdateKepsekProfile,
  teachers,
  attendanceHistory,
  leaveRequests,
  onApproveLeave,
  journals,
  onUpdateJournal
}: KepsekDashboardProps) {
  // Inbox active tab: approvals vs roster
  const [activeSubTab, setActiveSubTab] = useState<'approvals' | 'monitoring' | 'journals' | 'profile'>('approvals');

  // Profil Kepsek states
  const [kepsekName, setKepsekName] = useState(currentKepsek?.nama || '');
  const [kepsekNip, setKepsekNip] = useState(currentKepsek?.nip || '');
  const [kepsekPassword, setKepsekPassword] = useState(currentKepsek?.password || '');
  const [kepsekAvatar, setKepsekAvatar] = useState(currentKepsek?.fotoUrl || '');
  const [showKepsekPass, setShowKepsekPass] = useState(false);
  const [kepsekSaveSuccess, setKepsekSaveSuccess] = useState(false);
  const [kepsekSaveError, setKepsekSaveError] = useState<string | null>(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  // Sync state values when currentKepsek details change or loaded
  React.useEffect(() => {
    if (currentKepsek) {
      setKepsekName(currentKepsek.nama);
      setKepsekNip(currentKepsek.nip);
      setKepsekPassword(currentKepsek.password);
      setKepsekAvatar(currentKepsek.fotoUrl);
    }
  }, [currentKepsek]);
  const [kepsekComment, setKepsekComment] = useState<{ [key: string]: string }>({});
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);

  // Teaching Journals monitoring states
  const [journalSearch, setJournalSearch] = useState('');
  const [journalFilterKelas, setJournalFilterKelas] = useState('');
  const [journalFilterTeacher, setJournalFilterTeacher] = useState('');
  const [journalFeedbackComments, setJournalFeedbackComments] = useState<{ [key: string]: string }>({});

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate Today's metrics
  const totalTeachersCount = teachers.length;
  const todayRecords = attendanceHistory.filter(r => r.date === todayStr);

  const presentCount = todayRecords.filter(r => r.status === 'Hadir').length;
  const lateCount = todayRecords.filter(r => r.status === 'Terlambat').length;
  const sickOrPermitCount = todayRecords.filter(r => ['Sakit', 'Izin', 'Dinas Luar', 'Pelatihan'].includes(r.status)).length;
  // Alpa is total teachers who do not have any record today AND are not marked as sick/leave
  const teachersWithRecords = new Set(todayRecords.map(r => r.teacherId));
  const absentCount = Math.max(0, totalTeachersCount - teachersWithRecords.size);

  // Filter Leave requests
  const pendingLeaves = leaveRequests.filter(l => l.status === 'Pending');
  const pastLeavesObj = leaveRequests.filter(l => l.status !== 'Pending');

  // Handle Approve / Reject Actions
  const handleDecision = (leaveId: string, approved: boolean) => {
    const comment = kepsekComment[leaveId]?.trim() || '';
    onApproveLeave(leaveId, approved, comment);
    // Clear comment
    setKepsekComment(prev => {
      const copy = { ...prev };
      delete copy[leaveId];
      return copy;
    });
  };

  // Custom inline SVG responsive line chart representation representing monthly attendance stats
  // Let's mock a 7-day pattern
  const dailyAttendanceTrends = [
    { day: 'Sen', rate: 94 },
    { day: 'Sel', rate: 91 },
    { day: 'Rab', rate: 98 },
    { day: 'Kam', rate: 92 },
    { day: 'Jum', rate: 88 },
    { day: 'Sab', rate: 95 },
    { day: 'Hari Ini', rate: (presentCount + lateCount + sickOrPermitCount) > 0 ? Math.round(((presentCount + lateCount + sickOrPermitCount) / totalTeachersCount) * 100) : 0 }
  ];

  return (
    <div id="kepsek-module" className="flex flex-col gap-6 text-gray-800">
      
      {/* Kepsek statistics header */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 print:hidden">
        
        {/* Metric 1 */}
        <div className="bg-white border border-gray-250/80 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">Total Guru & Staf</span>
            <h3 className="text-2xl font-black font-display text-slate-800 mt-1 transition-colors group-hover:text-emerald-700">{totalTeachersCount}</h3>
            <span className="text-[10px] text-emerald-600 font-mono mt-0.5 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Aktif Mengajar
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl transition-all group-hover:scale-105 group-hover:bg-emerald-100">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-gray-250/80 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">Hadir Masuk</span>
            <h3 className="text-2xl font-black font-display text-emerald-800 mt-1">{presentCount}</h3>
            <span className="text-[10px] text-emerald-600 font-semibold font-mono mt-0.5 block">✓ Absen tepat waktu</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl transition-all group-hover:scale-105 group-hover:bg-emerald-100/80">
            <CheckCircle className="w-5 h-5 text-emerald-700" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-gray-250/80 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">Terlambat</span>
            <h3 className="text-2xl font-black font-display text-amber-700 mt-1">{lateCount}</h3>
            <span className="text-[10px] text-amber-600 font-mono mt-0.5 block font-semibold">⚠️ Di atas 07:30</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl transition-all group-hover:scale-105 group-hover:bg-amber-100">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-gray-250/80 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">Sakit / Izin</span>
            <h3 className="text-2xl font-black font-display text-indigo-850 mt-1">{sickOrPermitCount}</h3>
            <span className="text-[10px] text-indigo-600 font-semibold font-mono mt-0.5 block">📋 Cuti tervalidasi</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl transition-all group-hover:scale-105 group-hover:bg-indigo-100">
            <Calendar className="w-5 h-5 text-indigo-650" />
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-gray-250/80 p-4 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between col-span-2 lg:col-span-1 group">
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">Alpa / Belum Absen</span>
            <h3 className="text-2xl font-black font-display text-rose-800 mt-1">{absentCount}</h3>
            <span className="text-[10px] text-rose-500 font-mono mt-0.5 block font-semibold">⏱️ Belum tapping</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl transition-all group-hover:scale-105 group-hover:bg-rose-100">
            <UserX className="w-5 h-5 text-rose-600" />
          </div>
        </div>

      </div>

      {/* Sub tabs switches */}
      <div className="bg-slate-100/80 p-1.5 rounded-xl border border-gray-200 flex flex-wrap gap-1 shadow-2xs print:hidden">
        <button
          onClick={() => setActiveSubTab('approvals')}
          className={`py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 grow md:grow-0 justify-center cursor-pointer ${
            activeSubTab === 'approvals'
              ? 'bg-white text-emerald-800 shadow-sm border border-gray-200 font-extrabold'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Agenda Cuti & Izin</span>
          <span className={`text-[10.5px] font-mono px-1.5 py-0.5 rounded-full font-bold leading-none ${activeSubTab === 'approvals' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-205 bg-gray-200 text-gray-600'}`}>
            {pendingLeaves.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('monitoring')}
          className={`py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 grow md:grow-0 justify-center cursor-pointer ${
            activeSubTab === 'monitoring'
              ? 'bg-white text-emerald-800 shadow-sm border border-gray-200 font-extrabold'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-teal-600" />
          <span>Live Kehadiran</span>
          <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-full font-bold leading-none bg-gray-205 bg-gray-200 text-gray-600">
            {todayRecords.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('journals')}
          className={`py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 grow md:grow-0 justify-center cursor-pointer ${
            activeSubTab === 'journals'
              ? 'bg-white text-emerald-800 shadow-sm border border-gray-200 font-extrabold'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>Jurnal KBM</span>
          <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-full font-bold leading-none bg-gray-205 bg-gray-200 text-gray-600">
            {journals.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 grow md:grow-0 justify-center cursor-pointer ml-auto ${
            activeSubTab === 'profile'
              ? 'bg-white text-emerald-800 shadow-sm border border-gray-200 font-extrabold'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-slate-550" />
          <span>Akun Saya</span>
        </button>
      </div>

      {/* TAB SUB-CONTENT 1: APPROVALS INBOX */}
      {activeSubTab === 'approvals' && (
        <div id="approvals-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Pending leave list */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-extrabold text-slate-700 border-b border-gray-150 pb-3 flex items-center gap-2 font-display uppercase tracking-widest text-[#1e293b]">
                <FileCheck className="w-4 h-4 text-emerald-600 animate-pulse" /> INBOX PERNYATAAN IZIN & CUTI GURU (PENDING)
              </h3>

              <div className="flex flex-col gap-4 mt-5">
                {pendingLeaves.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="text-xs font-black text-slate-800">Semua Permohonan Selesai Direview</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">Tidak ada berkas cuti atau izin guru baru yang membutuhkan persetujuan hari ini.</p>
                  </div>
                ) : (
                  pendingLeaves.map((leave) => {
                    // Accent border based on leave types
                    let stripeColor = "border-l-[6px] border-l-slate-400";
                    let badgeBg = "bg-slate-100 text-slate-800 border-slate-200";
                    if (leave.type === "Sakit") {
                      stripeColor = "border-l-[6px] border-l-rose-500";
                      badgeBg = "bg-rose-50 text-rose-800 border-rose-200";
                    } else if (leave.type === "Izin Pribadi") {
                      stripeColor = "border-l-[6px] border-l-amber-500";
                      badgeBg = "bg-amber-50 text-amber-800 border-amber-200";
                    } else if (leave.type === "Cuti Tahunan") {
                      stripeColor = "border-l-[6px] border-l-indigo-600";
                      badgeBg = "bg-indigo-50 text-indigo-800 border-indigo-200";
                    } else if (leave.type === "Dinas Luar" || leave.type === "Pelatihan") {
                      stripeColor = "border-l-[6px] border-l-emerald-600";
                      badgeBg = "bg-emerald-50 text-emerald-800 border-emerald-250";
                    }

                    return (
                      <div
                        key={leave.id}
                        className={`bg-white border border-gray-200 hover:border-slate-350 transition-all rounded-xl p-4 flex flex-col gap-3 shadow-xs hover:shadow-sm ${stripeColor}`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[9px] font-extrabold font-mono text-gray-400 block uppercase tracking-wider">GURU PEMOHON</span>
                            <h4 className="text-sm font-black text-slate-900 leading-tight">{leave.teacherName}</h4>
                            <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                              📆 Dikirim: {new Date(leave.timestamp).toLocaleDateString("id-ID", {
                                weekday: "long",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          <span className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-lg inline-block font-mono border ${badgeBg}`}>
                            {leave.type}
                          </span>
                        </div>

                        {/* Leave Date Range */}
                        <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-slate-800">Rencana Tanggal Absen</span>
                          </div>
                          <span className="font-mono text-xs font-black text-indigo-900 bg-indigo-100/60 border border-indigo-100 px-2 py-0.5 rounded">
                            {leave.startDate} s/d {leave.endDate}
                          </span>
                        </div>

                        {/* Alasan Kronologi */}
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-black text-slate-400 block uppercase font-mono tracking-widest">Alasan / Kronologi Absen:</span>
                          <div className="bg-amber-50/20 border border-amber-100 rounded-lg p-3 italic text-xs text-slate-800 relative shadow-3xs leading-relaxed">
                            "{leave.reason}"
                          </div>
                        </div>

                        {/* Attachment files */}
                        {leave.attachmentName && (
                          <div className="text-xs bg-slate-50 border border-slate-150 rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-semibold text-gray-600">Dokumen Lampiran:</span>
                              <strong className="text-xs text-slate-800 font-mono font-medium">{leave.attachmentName}</strong>
                            </div>
                            {leave.attachmentData && (
                              <button
                                onClick={() => setSelectedSelfie(leave.attachmentData!)}
                                className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-all font-bold cursor-pointer"
                              >
                                Lihat Dokumen Lampiran
                              </button>
                            )}
                          </div>
                        )}

                        {/* Headmaster Action Corner */}
                        <div className="mt-2.5 pt-3 border-t border-gray-150 flex flex-col gap-2 bg-emerald-50/10 p-3 rounded-lg border">
                          <label className="text-[10px] font-extrabold text-teal-900 uppercase tracking-widest flex items-center gap-1 font-mono">
                            ✍🏼 Tulis Catatan / Rekomendasi Kepala Sekolah
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="Ket: Cuti disetujui, koordinasikan dengan guru piket..."
                              value={kepsekComment[leave.id] || ''}
                              onChange={(e) => setKepsekComment(prev => ({ ...prev, [leave.id]: e.target.value }))}
                              className="bg-white border border-gray-300 text-xs px-3 py-2.5 rounded-lg flex-1 focus:outline-emerald-555 placeholder-gray-400 text-slate-800 font-semibold"
                            />
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 shrink-0">
                              <button
                                onClick={() => handleDecision(leave.id, true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto cursor-pointer active:scale-95 shadow-sm"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Setujui
                              </button>
                              <button
                                onClick={() => handleDecision(leave.id, false)}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto cursor-pointer active:scale-95 shadow-sm"
                              >
                                <X className="w-3.5 h-3.5" /> Tolak
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Past Leave approvals records */}
          <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-extrabold text-slate-700 border-b border-gray-150 pb-3 font-display flex items-center justify-between uppercase tracking-widest">
                <span>🗂️ TIMELINE KEPUTUSAN</span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  Selesai: {pastLeavesObj.length}
                </span>
              </h3>
            </div>

            <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
              {pastLeavesObj.length === 0 ? (
                <div className="text-center py-10 border border-slate-150 rounded-xl bg-gray-55/10 text-gray-400">
                  <p className="text-xs font-bold">Histori Kosong</p>
                  <p className="text-[10px] mt-0.5">Belum ada keputusan cuti terdokumentasi.</p>
                </div>
              ) : (
                pastLeavesObj
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((leave) => {
                    const isApproved = leave.status === 'Approved';
                    return (
                      <div key={leave.id} className={`border border-gray-200 p-3.5 rounded-lg text-xs flex flex-col gap-2 relative bg-slate-50/50 hover:bg-white transition-all shadow-3xs ${isApproved ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-rose-500'}`}>
                        <div className="flex justify-between items-start gap-1">
                          <div>
                            <span className="font-extrabold text-slate-800 block text-xs">{leave.teacherName}</span>
                            <span className="text-[9.5px] font-bold text-gray-400 mt-0.5 block font-mono">Jenis: {leave.type}</span>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold ${
                              isApproved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isApproved ? 'Disetujui ✓' : 'Ditolak ✗'}
                          </span>
                        </div>
                        
                        <div className="text-[10px] text-indigo-900 font-mono font-bold bg-indigo-50 border border-indigo-100/50 rounded px-2 py-1 flex items-center justify-between">
                          <span>⏱️ Absen:</span>
                          <span>{leave.startDate} s/d {leave.endDate}</span>
                        </div>

                        {leave.comments && (
                          <div className="text-gray-600 bg-white p-2 rounded-md border border-gray-200 italic relative text-[11px] leading-relaxed">
                            "{leave.comments}"
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB SUB-CONTENT 2: LIVE MONITORING */}
      {activeSubTab === 'monitoring' && (
        <div id="live-monitoring" className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-gray-150 pb-4 mb-5">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 font-display uppercase tracking-widest flex items-center gap-1.5">
                👥 MONITORING PRESENSI HARIAN {totalTeachersCount} GURU
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal font-medium">
                Daftar absensi real-time Guru dan Staf per hari ini tanggal <span className="font-bold text-slate-800">{new Date(todayStr).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>.
              </p>
            </div>
            
            <div className="self-start sm:self-center">
              <span className="text-[10px] font-bold font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 border border-emerald-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                GEOFENCE SEAMLESS RADAR ACTIVE (100M)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-slate-500 font-mono font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 font-extrabold">Nama Lengkap</th>
                  <th className="p-4 font-extrabold">Jabatan / Mengampu</th>
                  <th className="p-4 font-extrabold">Masuk Jam</th>
                  <th className="p-4 font-extrabold text-center">Swafoto Masuk</th>
                  <th className="p-4 font-extrabold">Pulang Jam</th>
                  <th className="p-4 font-extrabold text-center">Swafoto Pulang</th>
                  <th className="p-4 font-extrabold">Verifikasi Geofence</th>
                  <th className="p-4 font-extrabold text-center">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {teachers.map((teacher) => {
                  const myTodayRec = todayRecords.find(r => r.teacherId === teacher.id);
                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                      
                      {/* Name Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-100 shadow-3xs shrink-0 bg-gray-100">
                            <img
                              src={teacher.fotoUrl}
                              alt={teacher.nama}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight text-xs">{teacher.nama}</span>
                            <span className="text-[10px] text-gray-500 font-mono block mt-0.5">NIP: {teacher.nip}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role/Position Column */}
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded border border-slate-200/60 font-mono">
                          {teacher.jabatan.split(' / ')[1] || teacher.jabatan}
                        </span>
                      </td>

                      {/* Check-In Jam */}
                      <td className="p-4 font-mono font-bold text-slate-800 text-xs">
                        {myTodayRec?.checkInTime ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{myTodayRec.checkInTime}</span>
                        ) : (
                          <span className="text-gray-300 font-bold">--:--:--</span>
                        )}
                      </td>

                      {/* Selfie Masuk Thumbnail */}
                      <td className="p-4 text-center">
                        {myTodayRec?.checkInPhoto ? (
                          <div className="inline-block relative">
                            <button
                              onClick={() => setSelectedSelfie(myTodayRec.checkInPhoto!)}
                              className="relative w-9 h-9 rounded-lg border-2 border-emerald-105 overflow-hidden hover:scale-105 active:scale-95 transition-all shadow-3xs cursor-pointer bg-white group focus:outline-none"
                              title="Buka lampiran foto masuk"
                            >
                              <img
                                src={myTodayRec.checkInPhoto}
                                alt="Selfie Masuk"
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Zoom</span>
                              </div>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 font-mono font-bold">-</span>
                        )}
                      </td>

                      {/* Check-Out Jam */}
                      <td className="p-4 font-mono font-bold text-slate-800 text-xs">
                        {myTodayRec?.checkOutTime ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-105">{myTodayRec.checkOutTime}</span>
                        ) : (
                          <span className="text-gray-300 font-bold">--:--:--</span>
                        )}
                      </td>

                      {/* Selfie Pulang Thumbnail */}
                      <td className="p-4 text-center">
                        {myTodayRec?.checkOutPhoto ? (
                          <div className="inline-block relative">
                            <button
                              onClick={() => setSelectedSelfie(myTodayRec.checkOutPhoto!)}
                              className="relative w-9 h-9 rounded-lg border-2 border-indigo-150 overflow-hidden hover:scale-105 active:scale-95 transition-all shadow-3xs cursor-pointer bg-white group focus:outline-none"
                              title="Buka lampiran foto pulang"
                            >
                              <img
                                src={myTodayRec.checkOutPhoto}
                                alt="Selfie Pulang"
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Zoom</span>
                              </div>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 font-mono font-bold">-</span>
                        )}
                      </td>

                      {/* Geofence Status */}
                      <td className="p-4">
                        {myTodayRec ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs font-extrabold text-teal-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Verified
                            </span>
                            <span className="text-[9.5px] font-semibold text-gray-500 font-mono block">
                              📌 {myTodayRec.checkInDistanceMeters !== undefined ? `${myTodayRec.checkInDistanceMeters}m dari pusat` : '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Final Status Pill */}
                      <td className="p-4 text-center">
                        {(() => {
                          let finalStyle = "bg-rose-50 text-rose-800 border-rose-200";
                          let finalLabel = "Alpa (Belum Absen)";
                          
                          if (myTodayRec?.status === 'Hadir') {
                            finalStyle = "bg-emerald-50 text-emerald-800 border-emerald-250 font-extrabold";
                            finalLabel = "HADIR tepat waktu";
                          } else if (myTodayRec?.status === 'Terlambat') {
                            finalStyle = "bg-amber-50 text-amber-850 border-amber-250 font-bold";
                            finalLabel = "TERLAMBAT masuk";
                          } else if (myTodayRec?.status && ['Sakit', 'Izin', 'Dinas Luar', 'Pelatihan'].includes(myTodayRec.status)) {
                            finalStyle = "bg-indigo-50 text-indigo-900 border-indigo-200 font-extrabold";
                            finalLabel = `${myTodayRec.status.toUpperCase()} (disetujui)`;
                          } else if (!myTodayRec) {
                            finalStyle = "bg-rose-50 text-rose-800 border-rose-150 font-extrabold animate-pulse";
                          }

                          return (
                            <span className={`text-[10px] px-2.5 py-1.5 rounded-lg border inline-block select-none font-mono uppercase ${finalStyle}`}>
                              {myTodayRec ? finalLabel : 'ALPA (Belum Absen)'}
                            </span>
                          );
                        })()}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB SUB-CONTENT 3: JOURNALS MONITOR */}
      {activeSubTab === 'journals' && (
        <div id="journals-monitor-section" className="flex flex-col gap-6 text-gray-800">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold border-b border-gray-150 pb-2.5 flex items-center gap-1.5 font-display uppercase tracking-wider text-blue-700">
              <BookOpen className="w-4 h-4 text-blue-600" /> MONITOR JURNAL HARIAN & AGENDA MENGAJAR GURU (KBM)
            </h3>

            {/* Filter and search controls */}
            <div className="flex flex-col md:flex-row gap-3 mt-4 text-xs font-semibold items-end justify-between print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 grow w-full md:w-auto">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Cari Subject / Materi</label>
                  <input
                    type="text"
                    value={journalSearch}
                    onChange={(e) => setJournalSearch(e.target.value)}
                    placeholder="e.g. Matematika, Aljabar..."
                    className="w-full pl-3 pr-3 py-1.5 border border-gray-300 rounded-lg text-slate-800 focus:outline-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Filter Kelas</label>
                  <select
                    value={journalFilterKelas}
                    onChange={(e) => setJournalFilterKelas(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-slate-800 focus:outline-emerald-500 font-extrabold"
                  >
                    <option value="">-- Semua Kelas --</option>
                    {Array.from(new Set(journals.map(j => j.kelas))).sort().map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide font-display text-emerald-800">Filter Guru Pengajar</label>
                  <select
                    value={journalFilterTeacher}
                    onChange={(e) => setJournalFilterTeacher(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-slate-800 focus:outline-emerald-500 font-extrabold"
                  >
                    <option value="">-- Semua Guru --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm h-[60px] md:h-[52px]"
                >
                  <Printer className="w-4 h-4" /> Cetak / Arsip Jurnal
                </button>
              </div>
            </div>
          </div>

          {/* List of matching teacher journal records */}
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-1 print:gap-4 gap-4">
            {journals.filter(j => {
              const matchesSearch = !journalSearch.trim() || 
                j.mataPelajaran.toLowerCase().includes(journalSearch.toLowerCase()) || 
                j.materiPokok.toLowerCase().includes(journalSearch.toLowerCase());
              const matchesKelas = !journalFilterKelas || j.kelas === journalFilterKelas;
              const matchesTeacher = !journalFilterTeacher || j.teacherId === journalFilterTeacher;
              return matchesSearch && matchesKelas && matchesTeacher;
            }).length === 0 ? (
              <div className="col-span-2 text-center py-16 bg-white border border-gray-200 rounded-xl text-gray-400 shadow-sm">
                <BookOpen className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-500">Tidak ada jurnal mengajar yang sesuai filter saat ini.</p>
              </div>
            ) : (
              [...journals]
                .filter(j => {
                  const matchesSearch = !journalSearch.trim() || 
                    j.mataPelajaran.toLowerCase().includes(journalSearch.toLowerCase()) || 
                    j.materiPokok.toLowerCase().includes(journalSearch.toLowerCase());
                  const matchesKelas = !journalFilterKelas || j.kelas === journalFilterKelas;
                  const matchesTeacher = !journalFilterTeacher || j.teacherId === journalFilterTeacher;
                  return matchesSearch && matchesKelas && matchesTeacher;
                })
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .map((j) => (
                  <div key={j.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm relative hover:border-emerald-500 transition-all text-slate-800">
                    
                    {/* Header Row */}
                    <div className="flex flex-wrap justify-between items-start gap-2 border-b border-gray-150 pb-2.5">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-mono font-bold uppercase">Guru Pengampu</span>
                        <h4 className="text-xs font-extrabold text-slate-800">{j.teacherName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-mono font-bold">📅 {j.date}</span>
                        <div className="flex gap-1.5 mt-0.5 justify-end">
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold font-mono text-[9.5px] px-2 py-0.5 rounded">
                            Kelas {j.kelas}
                          </span>
                          <span className="bg-slate-100 text-slate-750 font-semibold font-mono text-[9.5px] px-1.5 py-0.5 rounded leading-tight border border-gray-200">
                            Jam {j.jamKe}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subject info */}
                    <div className="pt-1">
                      <span className="text-[9px] font-extrabold text-blue-800 uppercase tracking-wider block font-mono">Topik / Materi KBM:</span>
                      <h5 className="text-[13px] font-black leading-snug text-slate-900">{j.mataPelajaran}</h5>
                      <p className="text-xs text-slate-700 font-semibold font-sans mt-0.5 leading-relaxed bg-slate-50 p-2 rounded border border-gray-150 whitespace-pre-line shadow-2xs">
                        {j.materiPokok}
                      </p>
                    </div>

                    {/* Student Presence counts */}
                    <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono py-1 border-t border-b border-gray-100 mt-1">
                      <span className="text-emerald-700 font-bold">✓ Siswa Hadir: {j.jumlahSiswaHadir}</span>
                      <span className={j.jumlahSiswaAbsen > 0 ? "text-amber-700 font-bold" : "text-gray-400 font-bold"}>
                        ⚠️ Absen/Bolos: {j.jumlahSiswaAbsen}
                      </span>
                      {j.catatanSiswaAbsen && (
                        <p className="col-span-2 text-[9.5px] text-gray-500 italic mt-0.5">
                          Ket: {j.catatanSiswaAbsen}
                        </p>
                      )}
                    </div>

                    {/* Obstacles & Solutions */}
                    {j.hambatanDanSolusi && (
                      <div className="text-[10.8px] text-gray-650 bg-slate-50 p-2.5 rounded border border-gray-200 leading-relaxed shadow-3xs">
                        <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Hambatan & Tindak Lanjut Guru:</span>
                        {j.hambatanDanSolusi}
                      </div>
                    )}

                    {/* HEADMASTER FEEDBACK CORNER: SAVE & COMMENT */}
                    <div className="mt-2.5 pt-2.5 border-t border-gray-200 bg-emerald-50/20 p-2.5 rounded-lg flex flex-col gap-2">
                      <span className="text-[9.5px] font-extrabold text-teal-850 uppercase tracking-widest flex items-center gap-1 font-mono">
                        🗣️ Tanggapan / Feedback Kepala Sekolah
                      </span>

                      {j.feedbackKepsek ? (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs italic bg-white px-3 py-2 border rounded-md font-semibold text-slate-800 shadow-3xs border-emerald-250">
                            " {j.feedbackKepsek} "
                          </p>
                          <div className="flex justify-end gap-2 mt-1">
                            <button
                              onClick={() => {
                                setJournalFeedbackComments(prev => ({
                                  ...prev,
                                  [j.id]: j.feedbackKepsek || ''
                                }));
                                onUpdateJournal({
                                  ...j,
                                  feedbackKepsek: undefined // set back to edit mode
                                });
                              }}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                            >
                              Ubah Feedback
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <textarea
                            rows={2}
                            placeholder="Tulis amanat, evaluasi KBM, masukan pembelajaran, atau apresiasi..."
                            value={journalFeedbackComments[j.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJournalFeedbackComments(prev => ({
                                ...prev,
                                [j.id]: val
                              }));
                            }}
                            className="bg-white w-full border border-gray-300 rounded-lg p-2 text-xs text-slate-800 shadow-2xs focus:outline-emerald-550"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                const comment = journalFeedbackComments[j.id]?.trim() || '';
                                if (!comment) return;
                                
                                onUpdateJournal({
                                  ...j,
                                  feedbackKepsek: comment
                                });

                                // Clear temp comment
                                setJournalFeedbackComments(prev => {
                                  const copy = { ...prev };
                                  delete copy[j.id];
                                  return copy;
                                });
                              }}
                              className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-[10.5px] px-3.5 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Beri Catatan Evaluasi
                            </button>
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* TAB SUB-CONTENT 4: KEPSEK PROFILE */}
      {activeSubTab === 'profile' && (
        <div id="kepsek-profile-panel" className="bg-white border text-gray-800 border-gray-200 rounded-xl p-5 shadow-xs max-w-2xl mx-auto w-full">
          <div className="border-b border-gray-150 pb-4 mb-5">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 font-display">
              👤 Pengaturan Akun & Profil Kepala Sekolah
            </h3>
            <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">
              Anda sebagai Kepala Sekolah dapat mengubah nama lengkap, NIP login, Kata Sandi akun, serta Pas Foto / Avatar Profil mandiri secara aman.
            </p>
          </div>

          {kepsekSaveSuccess && (
            <div className="mb-4 bg-emerald-50 font-semibold text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg border border-emerald-150 flex items-center gap-2">
              <span className="text-emerald-650 font-bold">✓</span>
              <span>Profil Kepala Sekolah berhasil diperbarui di database sistem!</span>
            </div>
          )}

          {kepsekSaveError && (
            <div className="mb-4 bg-rose-50 text-rose-800 text-xs px-3.5 py-2.5 rounded-lg border border-rose-150 font-semibold">
              {kepsekSaveError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setKepsekSaveSuccess(false);
              setKepsekSaveError(null);

              if (!kepsekName.trim()) {
                setKepsekSaveError("Nama lengkap tidak boleh kosong.");
                return;
              }
              if (!kepsekNip.trim()) {
                setKepsekSaveError("Username / NIP tidak boleh kosong.");
                return;
              }
              if (!kepsekPassword.trim()) {
                setKepsekSaveError("Kata sandi akses login tidak boleh kosong.");
                return;
              }

              setIsSavingLocal(true);
              try {
                await onUpdateKepsekProfile({
                  ...currentKepsek,
                  nama: kepsekName.trim(),
                  nip: kepsekNip.trim(),
                  password: kepsekPassword.trim(),
                  fotoUrl: kepsekAvatar,
                });
                setKepsekSaveSuccess(true);
                setTimeout(() => setKepsekSaveSuccess(false), 5000);
              } catch (err: any) {
                console.error("Gagal memperbarui profil kepala sekolah:", err);
                setKepsekSaveError(err instanceof Error ? err.message : String(err));
              } finally {
                setIsSavingLocal(false);
              }
            }}
            className="flex flex-col gap-5"
          >
            {/* AVATAR/PHOTO PICKER */}
            <div className="flex flex-col sm:flex-row gap-5 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
              
              {/* CURRENT PHOTO */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest font-mono">Pas Foto</span>
                <div className="w-20 h-20 rounded-full border-2 border-slate-200 overflow-hidden shadow-xs bg-white">
                  <img
                    src={kepsekAvatar}
                    alt="Current Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* CHOOSE PRESET & FILE UPLOAD */}
              <div className="flex-grow w-full">
                <label className="text-[11px] font-bold text-gray-500 block mb-2 uppercase tracking-wide">Pilih Pas Foto Profil:</label>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSavingLocal}
                      onClick={() => setKepsekAvatar(av)}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                        kepsekAvatar === av ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-gray-250'
                      }`}
                    >
                      <img src={av} alt="Preset avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}

                  {/* CUSTOM FILE UPLOAD FOR KEPSEK PROFILE */}
                  <label className="w-10 h-10 rounded-full border border-dashed border-gray-300 bg-white hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600 transition-colors" title="Unggah pas foto sendiri">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-[7.5px] font-extrabold tracking-tighter uppercase mt-0.5">Custom</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isSavingLocal}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            if (reader.result) {
                              try {
                                const compressedStr = await compressImage(reader.result as string, 160, 160);
                                setKepsekAvatar(compressedStr);
                              } catch (compressErr) {
                                console.error("Gagal melakukan kompresi foto:", compressErr);
                                setKepsekAvatar(reader.result as string);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-gray-400 font-sans">Pilih salah satu pas foto preset yang ada di atas atau unggah foto asli berformat PNG / JPG Anda sendiri.</p>
              </div>

            </div>

            {/* DETAIL FIELDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Nama Lengkap & Gelar</label>
                <div className="relative text-xs">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    disabled={isSavingLocal}
                    value={kepsekName}
                    onChange={(e) => setKepsekName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">NIP / Username Login</label>
                <div className="relative text-xs">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    disabled={isSavingLocal}
                    value={kepsekNip}
                    onChange={(e) => setKepsekNip(e.target.value)}
                    placeholder="NIP / Username"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-emerald-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Kata Sandi Akses</label>
                <div className="relative text-xs">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showKepsekPass ? "text" : "password"}
                    disabled={isSavingLocal}
                    value={kepsekPassword}
                    onChange={(e) => setKepsekPassword(e.target.value)}
                    placeholder="Kata Sandi Baru"
                    className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-emerald-500 font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKepsekPass(!showKepsekPass)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showKepsekPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>

            {/* ACTION TRIGGERS */}
            <div className="flex gap-3 justify-end mt-2 pt-3 border-t">
              <button
                type="submit"
                disabled={isSavingLocal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isSavingLocal ? (
                  <span className="font-mono text-[10px]">Menyimpan...</span>
                ) : (
                  <>Simpan Perubahan</>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Lightbox Selfie Modal */}
      {selectedSelfie && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-sm w-full border border-gray-200">
            <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center text-gray-800">
              <span className="text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1 text-emerald-600">
                <Camera className="w-3.5 h-3.5" /> Verifikasi Swafoto Guru
              </span>
              <button
                onClick={() => setSelectedSelfie(null)}
                className="text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded-lg p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative aspect-[4/3] bg-neutral-900 flex items-center justify-center">
              <img
                src={selectedSelfie}
                alt="Selfie Watermarked"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white font-mono text-[9px] py-1 px-1.5 rounded border border-white/10 text-center">
                System Hash ID: PRESENCE-{Date.now().toString().slice(-6)} ● GPS Verified
              </div>
            </div>

            <div className="p-2.5 bg-gray-50 text-[10.5px] text-gray-500 font-mono text-center border-t border-gray-150 text-gray-750">
              Lampiran absensi tervalidasi sensor sistem GuruPresence
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
