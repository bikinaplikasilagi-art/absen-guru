import React, { useState } from 'react';
import {
  Clock,
  UserCheck,
  Calendar,
  AlertTriangle,
  FileText,
  CheckCircle,
  TrendingUp,
  Camera,
  Image as ImageIcon,
  Compass,
  FileUp,
  MapPin,
  ExternalLink,
  Info,
  CalendarDays,
  Sparkles,
  User,
  Lock,
  Settings,
  ShieldCheck,
  Upload,
  BookOpen,
  Printer,
  Phone
} from 'lucide-react';
import { Teacher, AttendanceRecord, LeaveRequest, SchoolConfig, TeacherJournal } from '../types';
import CameraCapture from './CameraCapture';
import LocationSelector, { getHaversineDistance } from './LocationSelector';

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

interface GuruDashboardProps {
  currentTeacher: Teacher;
  attendanceHistory: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  schoolConfig: SchoolConfig;
  simulatedUserLat: number;
  simulatedUserLng: number;
  onSimulatedLocationChange: (lat: number, lng: number) => void;
  onAddAttendance: (record: AttendanceRecord) => void;
  onUpdateAttendance: (updated: AttendanceRecord) => void;
  onAddLeaveRequest: (leave: LeaveRequest) => void;
  onUpdateTeacher?: (updated: Teacher) => void;
  journals: TeacherJournal[];
  onAddJournal: (journal: TeacherJournal) => void;
}

export default function GuruDashboard({
  currentTeacher,
  attendanceHistory,
  leaveRequests,
  schoolConfig,
  simulatedUserLat,
  simulatedUserLng,
  onSimulatedLocationChange,
  onAddAttendance,
  onUpdateAttendance,
  onAddLeaveRequest,
  onUpdateTeacher,
  journals,
  onAddJournal,
}: GuruDashboardProps) {
  const [activeTab, setActiveTab] = useState<'absen' | 'cuti' | 'riwayat' | 'jurnal' | 'profil' | null>(null);

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 11) return 'Pagi';
    if (hrs < 15) return 'Siang';
    if (hrs < 19) return 'Sore';
    return 'Malam';
  };

  // Profil Guru states
  const [teacherName, setTeacherName] = useState(currentTeacher.nama);
  const [teacherNip, setTeacherNip] = useState(currentTeacher.nip);
  const [teacherPassword, setTeacherPassword] = useState(currentTeacher.password);
  const [teacherAvatar, setTeacherAvatar] = useState(currentTeacher.fotoUrl);
  const [teacherPhone, setTeacherPhone] = useState(currentTeacher.phone || '');
  const [showTeacherPass, setShowTeacherPass] = useState(false);
  const [teacherSaveSuccess, setTeacherSaveSuccess] = useState(false);
  const [teacherSaveError, setTeacherSaveError] = useState<string | null>(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  // Sync state values when currentTeacher details change or loaded
  React.useEffect(() => {
    if (currentTeacher) {
      setTeacherName(currentTeacher.nama);
      setTeacherNip(currentTeacher.nip);
      setTeacherPassword(currentTeacher.password);
      setTeacherAvatar(currentTeacher.fotoUrl);
      setTeacherPhone(currentTeacher.phone || '');
    }
  }, [currentTeacher]);

  // Attendance states
  const [selfieBase64, setSelfieBase64] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Leave Form states
  const [leaveType, setLeaveType] = useState<'Sakit' | 'Izin Pribadi' | 'Dinas Luar' | 'Pelatihan' | 'Cuti Tahunan'>('Sakit');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachName, setAttachName] = useState('');
  const [attachData, setAttachData] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Jurnal Form states
  const [journalKelas, setJournalKelas] = useState('');
  const [journalMataPelajaran, setJournalMataPelajaran] = useState('');
  const [journalMateriPokok, setJournalMateriPokok] = useState('');
  const [journalJamKe, setJournalJamKe] = useState('');
  const [journalHadirCount, setJournalHadirCount] = useState<number>(0);
  const [journalAbsenCount, setJournalAbsenCount] = useState<number>(0);
  const [journalCatatanAbsen, setJournalCatatanAbsen] = useState('');
  const [journalHambatan, setJournalHambatan] = useState('');
  const [journalSuccess, setJournalSuccess] = useState<string | null>(null);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // Lightbox selfie preview state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Compute Today's Attendance Record for current teacher
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceHistory.find(
    r => r.teacherId === currentTeacher.id && r.date === todayStr
  );

  const todayHoliday = schoolConfig.holidays?.find(
    (h) => h.date === todayStr && h.isActive
  );
  const todayFlexSchedule = schoolConfig.flexibleSchedules?.find(
    (fs) => fs.date === todayStr
  );

  const activeCheckInStart = todayFlexSchedule?.checkInStart || schoolConfig.checkInStart;
  const activeCheckInEnd = todayFlexSchedule?.checkInEnd || schoolConfig.checkInEnd;
  const activeCheckOutStart = todayFlexSchedule?.checkOutStart || schoolConfig.checkOutStart;

  // Personal statistics
  const myTotalAttendances = attendanceHistory.filter(r => r.teacherId === currentTeacher.id);
  const myTotalLeavesApproved = leaveRequests.filter(l => l.teacherId === currentTeacher.id && l.status === 'Approved').length;
  
  // Calculate distance
  const currentDistance = getHaversineDistance(
    schoolConfig.lat,
    schoolConfig.lng,
    simulatedUserLat,
    simulatedUserLng
  );
  const isInRange = currentDistance <= schoolConfig.radiusMeters;

  // Handle Absen Masuk action
  const handleAbsenMasuk = () => {
    setAttendanceMessage(null);

    if (!isInRange) {
      setAttendanceMessage({
        type: 'error',
        text: `Absensi GAGAL. Lokasi Anda berada di luar radius sekolah (${currentDistance.toFixed(0)} meter dari gerbang).`
      });
      return;
    }

    if (!selfieBase64) {
      setAttendanceMessage({
        type: 'error',
        text: 'Absensi GAGAL. Anda wajib mengambil swafoto (selfie) sebagai bentuk verifikasi visual anti-titip absen.'
      });
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    
    // Check if late based on active end hour (checks if custom flexible schedule override exists)
    const activeCheckInEnd = todayFlexSchedule?.checkInEnd || schoolConfig.checkInEnd;
    const [configHour, configMin] = activeCheckInEnd.split(':').map(Number);
    const attendanceTimeMins = now.getHours() * 60 + now.getMinutes();
    const limitTimeMins = configHour * 60 + configMin;

    const isLate = attendanceTimeMins > limitTimeMins;
    const finalStatus = isLate ? 'Terlambat' : 'Hadir';

    const newAttendance: AttendanceRecord = {
      id: `att-run-${Date.now()}`,
      teacherId: currentTeacher.id,
      teacherName: currentTeacher.nama,
      date: todayStr,
      checkInTime: timeStr,
      checkInPhoto: selfieBase64,
      checkInLocation: { lat: simulatedUserLat, lng: simulatedUserLng },
      checkInDistanceMeters: Math.round(currentDistance),
      status: finalStatus,
      isVerified: true
    };

    onAddAttendance(newAttendance);
    setSelfieBase64(''); // Reset selfie
    setAttendanceMessage({
      type: 'success',
      text: `Absen MASUK Berhasil! Dicatat pukul ${timeStr}. Status: ${finalStatus === 'Terlambat' ? 'Terlambat ⚠️' : 'Tepat Waktu ✓'}`
    });
  };

  // Handle Absen Pulang action
  const handleAbsenPulang = () => {
    setAttendanceMessage(null);

    if (!todayRecord) {
      setAttendanceMessage({
        type: 'error',
        text: 'Absensi GAGAL. Anda harus melakukan absensi masuk terlebih dahulu sebelum absensi pulang.'
      });
      return;
    }

    if (!isInRange) {
      setAttendanceMessage({
        type: 'error',
        text: `Absensi GAGAL. Anda berada di luar radius sekolah dilarang check-out dari rumah.`
      });
      return;
    }

    if (!selfieBase64) {
      setAttendanceMessage({
        type: 'error',
        text: 'Absensi GAGAL. Wajib mengambil swafoto pulang sebagai bukti penyelesaian tugas ajar hari ini.'
      });
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

    const updatedRecord: AttendanceRecord = {
      ...todayRecord,
      checkOutTime: timeStr,
      checkOutPhoto: selfieBase64,
      checkOutLocation: { lat: simulatedUserLat, lng: simulatedUserLng }
    };

    onUpdateAttendance(updatedRecord);
    setSelfieBase64(''); // Reset selfie
    setAttendanceMessage({
      type: 'success',
      text: `Absen PULANG Berhasil! Dicatat pukul ${timeStr}. Selamat beristirahat!`
    });
  };

  // Leave Form Doc upload simulation handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachName(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Leave Form Submission handler
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!startDate || !endDate) {
      setFormError('Tanggal mulai dan tanggal selesai wajib ditentukan.');
      return;
    }

    if (!reason || reason.trim().length < 10) {
      setFormError('Alasan pengajuan wajib diisi secara deskriptif (minimal 10 karakter).');
      return;
    }

    // Verify annual leave dates vs sisa cuti
    if (leaveType === 'Cuti Tahunan') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const lengthMs = end.getTime() - start.getTime();
      const lengthDays = Math.ceil(lengthMs / (1000 * 60 * 60 * 24)) + 1;

      if (lengthDays <= 0) {
        setFormError('Tanggal mulanya tidak boleh mendahului tanggal selesai.');
        return;
      }

      if (lengthDays > currentTeacher.sisaCuti) {
        setFormError(`Sisa cuti tahunan Anda tidak mencukupi. Pengajuan: ${lengthDays} hari, Sisa: ${currentTeacher.sisaCuti} hari.`);
        return;
      }
    }

    const newRequest: LeaveRequest = {
      id: `leave-run-${Date.now()}`,
      teacherId: currentTeacher.id,
      teacherName: currentTeacher.nama,
      type: leaveType,
      startDate,
      endDate,
      reason,
      attachmentName: attachName || undefined,
      attachmentData: attachData || undefined,
      status: 'Pending',
      timestamp: new Date().toISOString()
    };

    onAddLeaveRequest(newRequest);
    setFormSuccess('Pengujian permohonan izin/cuti berhasil terkirim ke Kepala Sekolah untuk disetujui.');
    
    // Clear form inputs
    setStartDate('');
    setEndDate('');
    setReason('');
    setAttachName('');
    setAttachData('');
  };

  return (
    <div id="guru-module" className="flex flex-col gap-6">
      
      {/* Top Welcome Title Widget */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden print:hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-teal-500/20"></div>
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/60 shadow-md">
            <img
              src={currentTeacher.fotoUrl}
              alt="Guru Avatar"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">{currentTeacher.nama}</h2>
            <p className="text-xs text-emerald-100 font-mono mt-0.5">
              NIP: {currentTeacher.nip} ● {currentTeacher.jabatan}
            </p>
          </div>
        </div>

        {/* Cuti sisa display */}
        <div className="bg-emerald-950/40 backdrop-blur-xs border border-emerald-400/20 px-4 py-2.5 rounded-xl text-center self-stretch md:self-auto">
          <span className="text-[10px] text-emerald-200 block font-mono font-bold tracking-wider uppercase">Sisa Cuti Tahunan</span>
          <span className="text-xl font-bold text-amber-300 font-display">{currentTeacher.sisaCuti} Hari</span>
        </div>
      </div>

      {/* Menu Grid - Dashboard Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:hidden">
        {/* Card 1: Absen */}
        <button
          type="button"
          onClick={() => { setActiveTab(activeTab === 'absen' ? null : 'absen'); setAttendanceMessage(null); }}
          className={`group flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden h-36 cursor-pointer ${
            activeTab === 'absen'
              ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/10 scale-[1.02]'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`p-2.5 rounded-xl transition-all ${
              activeTab === 'absen' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            {/* Active Indicator pulse */}
            {activeTab === 'absen' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider font-mono">Absensi</span>
            <h3 className="text-[13px] font-extrabold text-slate-800 mt-0.5 leading-tight group-hover:text-emerald-700 transition-colors">
              Absensi & Swafoto
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">Masuk & pulang harian</p>
          </div>
        </button>

        {/* Card 2: Cuti */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'cuti' ? null : 'cuti')}
          className={`group flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden h-36 cursor-pointer ${
            activeTab === 'cuti'
              ? 'bg-teal-50 border-teal-500 shadow-md ring-2 ring-teal-500/10 scale-[1.02]'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`p-2.5 rounded-xl transition-all ${
              activeTab === 'cuti' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700 group-hover:bg-teal-200'
            }`}>
              <CalendarDays className="w-5 h-5" />
            </div>
            {activeTab === 'cuti' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
            )}
          </div>
          <div>
            <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider font-mono">Izin & Cuti</span>
            <h3 className="text-[13px] font-extrabold text-slate-800 mt-0.5 leading-tight group-hover:text-teal-700 transition-colors">
              Pengajuan Izin/Cuti
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">Ajukan surat sakit & cuti</p>
          </div>
        </button>

        {/* Card 3: Riwayat */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'riwayat' ? null : 'riwayat')}
          className={`group flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden h-36 cursor-pointer ${
            activeTab === 'riwayat'
              ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/10 scale-[1.02]'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`p-2.5 rounded-xl transition-all ${
              activeTab === 'riwayat' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            {activeTab === 'riwayat' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            )}
          </div>
          <div>
            <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider font-mono">Rekap</span>
            <h3 className="text-[13px] font-extrabold text-slate-800 mt-0.5 leading-tight group-hover:text-indigo-700 transition-colors">
              Riwayat Absen Saya
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">Status kehadiran harian</p>
          </div>
        </button>

        {/* Card 4: Jurnal Mengajar */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'jurnal' ? null : 'jurnal')}
          className={`group flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden h-36 cursor-pointer ${
            activeTab === 'jurnal'
              ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/10 scale-[1.02]'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`p-2.5 rounded-xl transition-all ${
              activeTab === 'jurnal' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 group-hover:bg-blue-200'
            }`}>
              <BookOpen className="w-5 h-5" />
            </div>
            {activeTab === 'jurnal' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            )}
          </div>
          <div>
            <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider font-mono font-black text-blue-700">Agenda & Materi</span>
            <h3 className="text-[13px] font-extrabold text-slate-800 mt-0.5 leading-tight group-hover:text-blue-700 transition-colors">
              Jurnal Mengajar
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">Laporan agenda KBM harian</p>
          </div>
        </button>

        {/* Card 5: Profil */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'profil' ? null : 'profil')}
          className={`group flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden h-36 cursor-pointer col-span-2 md:col-span-1 ${
            activeTab === 'profil'
              ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-500/10 scale-[1.02]'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`p-2.5 rounded-xl transition-all ${
              activeTab === 'profil' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
            }`}>
              <User className="w-5 h-5" />
            </div>
            {activeTab === 'profil' && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </div>
          <div>
            <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider font-mono">Akun Mandiri</span>
            <h3 className="text-[13px] font-extrabold text-slate-800 mt-0.5 leading-tight group-hover:text-amber-700 transition-colors">
              Akun & Profil
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">Kelola foto & sandi login</p>
          </div>
        </button>
      </div>

      {/* Real-time Status Alert / Flash Messaging */}
      {attendanceMessage && (
        <div
          className={`p-3.5 rounded-lg text-xs font-semibold flex items-start gap-2.5 border ${
            attendanceMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{attendanceMessage.text}</span>
        </div>
      )}

      {/* TAMPILAN AWAL (HOMEPAGE/OVERVIEW) SAAT BELUM ADA TOMBOL YANG DIKLIK */}
      {activeTab === null && (
        <div id="home-overview-block" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Selamat Datang di Portal Presensi Guru & Staf
                </div>
                <h3 className="text-xl font-bold text-slate-800 font-display">
                  Halo, Selamat {getGreeting()}, {currentTeacher.nama}! 👋
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Semoga hari Anda menyenangkan dan penuh semangat dalam mendidik generasi bangsa. Di bawah ini adalah ringkasan singkat status tugas dan kehadiran Anda untuk hari ini. Silakan klik salah satu menu di atas untuk membuka formulir detail.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block font-mono font-bold tracking-wide uppercase">TANGGAL PRESENSI</span>
                <span className="text-sm font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-150 inline-block mt-1">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Ringkasan Tugas Hari Ini */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase mb-4 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> RINGKASAN AKTIVITAS HARI INI
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Absen Masuk */}
                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl flex flex-col justify-between gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">1. ABSEN MASUK</span>
                    {todayRecord?.checkInTime ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                        SELESAI
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono animate-pulse">
                        BELUM ABSEN
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-lg font-bold font-mono text-slate-700 block">
                      {todayRecord?.checkInTime ? todayRecord.checkInTime.slice(0, 5) : '-- : --'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {todayRecord?.checkInTime ? 'Telah diverifikasi swafoto' : `Batas: ${activeCheckInEnd} WIB`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('absen'); setAttendanceMessage(null); }}
                    className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer mt-1"
                  >
                    {todayRecord?.checkInTime ? 'Lihat Detail' : 'Lakukan Absen Masuk'}
                  </button>
                </div>

                {/* Status Jurnal Mengajar */}
                {(() => {
                  const todayJournalsCount = journals.filter(j => j.teacherId === currentTeacher.id && j.date === todayStr).length;
                  return (
                    <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl flex flex-col justify-between gap-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">2. JURNAL MENGAJAR</span>
                        {todayJournalsCount > 0 ? (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                            {todayJournalsCount} KBM
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                            KOSONG
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-lg font-bold font-mono text-slate-700 block">
                          {todayJournalsCount > 0 ? `${todayJournalsCount} Terisi` : 'Belum Ada'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {todayJournalsCount > 0 ? 'Agenda KBM hari ini dicatat' : 'Silakan lengkapi agenda mengajar'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('jurnal')}
                        className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer mt-1"
                      >
                        {todayJournalsCount > 0 ? 'Tambah / Lihat' : 'Isi Jurnal Sekarang'}
                      </button>
                    </div>
                  );
                })()}

                {/* Status Absen Pulang */}
                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl flex flex-col justify-between gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">3. ABSEN PULANG</span>
                    {todayRecord?.checkOutTime ? (
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                        SELESAI
                      </span>
                    ) : todayRecord ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono animate-pulse">
                        READY CHECK-OUT
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                        STANDBY
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-lg font-bold font-mono text-slate-700 block">
                      {todayRecord?.checkOutTime ? todayRecord.checkOutTime.slice(0, 5) : '-- : --'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {todayRecord?.checkOutTime ? 'Tugas mengajar selesai' : `Mulai: ${activeCheckOutStart} WIB`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('absen'); setAttendanceMessage(null); }}
                    disabled={!todayRecord}
                    className={`w-full text-center text-xs font-semibold py-1.5 px-3 rounded-lg transition-all mt-1 ${
                      todayRecord
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {todayRecord?.checkOutTime ? 'Lihat Detail' : 'Lakukan Absen Pulang'}
                  </button>
                </div>
              </div>

              {/* Lokasi Check in Info */}
              <div className="mt-5 bg-emerald-50/40 border border-dashed border-emerald-200 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-emerald-800">
                <MapPin className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-emerald-900 text-[13px]">Geofencing Status Presensi</span>
                  Lokasi Anda saat ini terdeteksi berada sejauh <strong className="text-emerald-950 font-mono">{currentDistance.toFixed(0)} meter</strong> dari gerbang sekolah. Radius maksimal yang diperbolehkan adalah <strong className="text-emerald-950 font-mono">{schoolConfig.radiusMeters} meter</strong>. 
                  {isInRange ? (
                    <span className="text-emerald-700 font-semibold block mt-1">
                      ✓ Sinyal GPS Aman! Anda berada di dalam jangkauan wilayah sekolah.
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold block mt-1 bg-rose-50/80 px-2 py-1 rounded inline-block">
                      ⚠️ Di Luar Radius! Anda berada di luar area presensi yang sah. Silakan sesuaikan lokasi Anda di menu "Absensi" terlebih dahulu.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Panduan Cepat & Info Ringkasan */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase mb-3.5 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-indigo-600" /> STATISTIK BULAN INI
              </h4>
              
              <div className="flex flex-col gap-3 font-sans">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Tepat Waktu</span>
                  <span className="text-xs font-bold text-slate-800 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-mono">
                    {myTotalAttendances.filter(r => r.status === 'Hadir').length} Hari
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Terlambat</span>
                  <span className="text-xs font-bold text-slate-800 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-mono">
                    {myTotalAttendances.filter(r => r.status === 'Terlambat').length} Hari
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Izin / Sakit / Dinas</span>
                  <span className="text-xs font-bold text-slate-800 bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-mono">
                    {myTotalAttendances.filter(r => ['Sakit', 'Izin', 'Dinas Luar', 'Pelatihan'].includes(r.status)).length} Hari
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Sisa Cuti Tahunan</span>
                  <span className="text-xs font-bold text-slate-800 bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full font-mono">
                    {currentTeacher.sisaCuti} Hari
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" /> PANDUAN CEPAT OPERATOR
              </h4>
              <ul className="text-xs text-slate-600 space-y-2.5 list-none pl-0">
                <li className="flex gap-2">
                  <span className="text-emerald-500 font-bold">1.</span>
                  <span>Pilih menu tab di atas untuk mengaktifkan antarmuka masing-masing fitur.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500 font-bold">2.</span>
                  <span>Anda dapat mengklik ulang tab yang sedang aktif untuk menutup kembali isinya dan menampilkan halaman utama ini.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500 font-bold">3.</span>
                  <span>Setiap presensi/absen wajib disertai swafoto wajah asli menggunakan kamera perangkat.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: NEW ATTENDANCE ACTIVE FORM (MASUK / PULANG) */}
      {activeTab === 'absen' && (
        <div id="quick-absence" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Selfie and Action panel */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="bg-white border text-gray-800 border-gray-200 rounded-xl p-5 shadow-sm">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                INFORMASI HARI INI
              </span>
              
              <div className="mt-3 flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-150">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-mono">{todayFlexSchedule ? "BATAS PENYESUAIAN" : "BATAS ABSEN MASUK"}</span>
                  <span className={`text-xs font-bold ${todayFlexSchedule ? "text-indigo-600" : "text-red-500"}`}>{activeCheckInEnd} WIB</span>
                </div>
              </div>

              {todayHoliday && (
                <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                    🎉 HARI LIBUR SEKOLAH RESMI
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Hari ini adalah hari libur sekolah resmi: <strong className="text-amber-900">{todayHoliday.name}</strong>. Anda tidak diwajibkan melakukan presensi absensi harian. Selamat menikmati liburan Anda!
                  </p>
                </div>
              )}

              {todayFlexSchedule && (
                <div className="mt-3 bg-indigo-50 border border-indigo-150 text-indigo-900 rounded-xl p-3.5 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    🕒 PENYESUAIAN JAM KERJA AKTIF
                  </div>
                  <p className="text-indigo-800 leading-relaxed font-sans -mt-0.5">
                    Hari ini berlaku jadwal kerja khusus (<strong>{todayFlexSchedule.label}</strong>):
                  </p>
                  <div className="font-mono text-[11px] text-indigo-900 bg-white/70 p-2 rounded-lg border border-indigo-100 flex flex-col gap-1">
                    <div>• Absen Masuk: <strong>{todayFlexSchedule.checkInStart} - {todayFlexSchedule.checkInEnd} WIB</strong></div>
                    <div>• Batas Mulai Pulang: <strong>{todayFlexSchedule.checkOutStart} WIB</strong></div>
                  </div>
                </div>
              )}

              {/* Status Absensi Card */}
              <div className="mt-4 p-4 rounded-xl border flex flex-col gap-3 bg-slate-50 border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-gray-500">Status Kehadiran Hari ini:</span>
                    <h3 className="text-lg font-bold text-slate-800 mt-0.5 font-display flex items-center gap-1.5">
                      {todayRecord ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          Marked as {todayRecord.status}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          Belum Melakukan Absen
                        </>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1 text-center font-mono text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-[9px] text-gray-400 block pb-1.5">ABSEN MASUK</span>
                    <span className="font-bold text-emerald-600 block text-sm">
                      {todayRecord?.checkInTime ? `✓ ${todayRecord.checkInTime.slice(0, 5)}` : '-- : --'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                    <span className="text-[9px] text-gray-400 block pb-1.5">ABSEN PULANG</span>
                    <span className="font-bold text-indigo-600 block text-sm">
                      {todayRecord?.checkOutTime ? `✓ ${todayRecord.checkOutTime.slice(0, 5)}` : '-- : --'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Form block */}
              {!todayRecord && (
                <div className="mt-6 border-t border-gray-150 pt-5">
                  <h4 className="text-sm font-bold text-slate-700 font-display">Langkah 1: Lakukan Absen Masuk</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Nyalakan kamera di sebelah kanan, sesuaikan lokasi GPS hingga terdeteksi di dalam radius sekolah, lalu tekan tombol absen.
                  </p>
                  <button
                    type="button"
                    onClick={handleAbsenMasuk}
                    disabled={!isInRange || !selfieBase64}
                    className={`mt-4 w-full py-2.5 px-4 font-bold rounded-lg text-sm transition-all text-center flex items-center justify-center gap-2 ${
                      isInRange && selfieBase64
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" /> KIRI ABSEN MASUK GURU
                  </button>
                  {!selfieBase64 && (
                    <p className="text-[10px] text-rose-600 mt-1.5 text-center font-semibold bg-rose-50 rounded py-1">
                      *Silakan ambil Swafoto (Selfie) terlebih dahulu di modul kamera.
                    </p>
                  )}
                </div>
              )}

              {todayRecord && !todayRecord.checkOutTime && (
                <div className="mt-6 border-t border-gray-150 pt-5">
                  <h4 className="text-sm font-bold text-slate-700 font-display">Langkah 2: Absen Pulang (Check-Out)</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Selesai mengajar? Ambil swafoto kepulangan Anda, pastikan GPS masih di lingkungan sekolah, lalu klik check-out.
                  </p>
                  <button
                    type="button"
                    onClick={handleAbsenPulang}
                    disabled={!isInRange || !selfieBase64}
                    className={`mt-4 w-full py-2.5 px-4 font-bold rounded-lg text-sm transition-all text-center flex items-center justify-center gap-2 ${
                      isInRange && selfieBase64
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    <Clock className="w-4 h-4" /> KIRIM ABSEN PULANG GURU
                  </button>
                  {!selfieBase64 && (
                    <p className="text-[10px] text-rose-600 mt-1.5 text-center font-semibold bg-rose-50 rounded py-1">
                      *Ambil swafoto pulang untuk mematikan absensi hari ini.
                    </p>
                  )}
                </div>
              )}

              {todayRecord && todayRecord.checkOutTime && (
                <div className="mt-6 border-t border-gray-150 pt-5 bg-emerald-50/50 p-4 rounded-xl border border-dashed border-emerald-200 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-800 font-display mt-2">Absensi Anda Hari Ini Lengkap!</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Anda sudah melakukan absensi masuk dan absensi pulang dengan sukses. Terima kasih atas dedikasi pengabdian Anda hari ini!
                  </p>
                </div>
              )}
            </div>

            {/* Render Geofence Selector Simulator */}
            <LocationSelector
              schoolConfig={schoolConfig}
              simulatedUserLat={simulatedUserLat}
              simulatedUserLng={simulatedUserLng}
              onSimulatedLocationChange={onSimulatedLocationChange}
            />
          </div>

          {/* Interactive Camera Screen */}
          <div className="lg:col-span-6">
            <CameraCapture
              onCapture={(photo) => setSelfieBase64(photo)}
              savedPhoto={selfieBase64}
            />
          </div>

        </div>
      )}

      {/* TAB 2: APPLICATIONS OF LEAVE / PERMISSION */}
      {activeTab === 'cuti' && (
        <div id="leave-applications-block" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* New Application Form */}
          <div className="lg:col-span-5 bg-white border text-gray-800 border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 border-b border-gray-150 pb-2.5 flex items-center gap-1.5 font-display uppercase tracking-wide">
              <CalendarDays className="w-4.5 h-4.5 text-emerald-600" /> Formulir Pengajuan Baru
            </h3>

            {formError && (
              <div className="mt-3 bg-rose-50 border-l-4 border-rose-500 p-3 text-xs text-rose-700 rounded flex items-start gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-3 bg-emerald-50 border-l-4 border-emerald-500 p-3 text-xs text-emerald-700 rounded flex items-start gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLeaveSubmit} className="flex flex-col gap-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">JENIS IZIN / CUTI:</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full bg-white border border-gray-300 text-xs px-2.5 py-2 rounded-lg focus:outline-emerald-500"
                >
                  <option value="Sakit">Sakit (Butuh Surat Keterangan Dokter)</option>
                  <option value="Izin Pribadi">Izin Pribadi (Urusan Mendesak)</option>
                  <option value="Dinas Luar">Dinas Luar (Tugas Sekolah / Yayasan)</option>
                  <option value="Pelatihan">Pelatihan / Workshop Pendidikan</option>
                  <option value="Cuti Tahunan">Cuti Tahunan (Mengurangi Sisa Cuti Resmi)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Mulai Tanggal:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-xs px-2 py-2 rounded-lg focus:outline-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Hingga Tanggal:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-xs px-2 py-2 rounded-lg focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">ALASAN DESKRIPTIF PENGUJUAN:</label>
                <textarea
                  placeholder="Sebutkan alasan atau kronologis singkat keperluan secara valid..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-gray-300 text-xs p-2.5 rounded-lg focus:outline-emerald-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">LAMPIRAN DOKUMEN MANDATORI (FOTO/PDF):</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:bg-slate-50 transition-colors relative flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileUp className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs font-medium text-emerald-700">
                    {attachName ? attachName : 'Pilih Berkas atau Tarik ke sini'}
                  </span>
                  <span className="text-[9px] text-gray-400 mt-1">Sakit wajib surat dokter, dinas wajib surat undangan</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2 px-4 rounded-lg shadow-xs transition-colors text-center"
              >
                Kirim Permohonan Izin
              </button>
            </form>
          </div>

          {/* Leave History List */}
          <div className="lg:col-span-7 bg-white border text-gray-800 border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 border-b border-gray-150 pb-2.5 flex items-center justify-between font-display uppercase tracking-wide">
              <span>🗂️ Status Pengajuan Cuti / Izin Anda</span>
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full font-mono">
                Total: {leaveRequests.filter(l => l.teacherId === currentTeacher.id).length}
              </span>
            </h3>

            <div className="flex flex-col gap-3.5 mt-4 max-h-[480px] overflow-y-auto pr-1">
              {leaveRequests.filter(l => l.teacherId === currentTeacher.id).length === 0 ? (
                <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs">Anda belum pernah mengajukan cuti atau izin sebelumnya.</p>
                </div>
              ) : (
                leaveRequests
                  .filter(l => l.teacherId === currentTeacher.id)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((leave) => (
                    <div
                      key={leave.id}
                      className="border border-gray-250 p-4 rounded-xl shadow-xs transition-hover hover:border-gray-300 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="bg-slate-100 text-slate-800 text-xs font-extrabold px-2 py-0.5 rounded font-mono">
                          {leave.type}
                        </span>
                        
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            leave.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : leave.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {leave.status === 'Pending' ? '⏱️ Menunggu Kepala Sekolah' : leave.status === 'Approved' ? '✓ Disetujui' : '✗ Ditolak'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-semibold font-mono">
                            {leave.startDate} s/d {leave.endDate}
                          </span>
                        </div>
                        <p className="text-gray-700 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1 leading-relaxed">
                          "{leave.reason}"
                        </p>
                      </div>

                      {leave.attachmentName && (
                        <div className="text-xs text-indigo-700 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Lampiran: {leave.attachmentName}</span>
                          {leave.attachmentData && (
                            <button
                              onClick={() => setLightboxImage(leave.attachmentData!)}
                              className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors ml-1 font-semibold"
                            >
                              Lihat Dokumen
                            </button>
                          )}
                        </div>
                      )}

                      {leave.comments && (
                        <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg text-xs mt-1">
                          <span className="font-bold text-sky-800 block text-[10px] uppercase font-mono tracking-wider">
                            CATATAN KEPALA SEKOLAH:
                          </span>
                          <p className="text-sky-900 italic mt-0.5">"{leave.comments}"</p>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: PERSONAL ATTENDANCE LOG */}
      {activeTab === 'riwayat' && (
        <div id="personal-history" className="bg-white border text-gray-800 border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-gray-150 pb-3 mb-4">
            <h3 className="text-sm font-bold text-gray-750 font-display uppercase tracking-wide">
              📊 Rekam Kehadiran Anda Bulan Ini
            </h3>
            <span className="text-xs text-gray-500 font-mono">
              Hadir: {myTotalAttendances.filter(r => r.status === 'Hadir' || r.status === 'Terlambat').length} | Terlambat: {myTotalAttendances.filter(r => r.status === 'Terlambat').length} | Izin: {myTotalAttendances.filter(r => r.status === 'Sakit' || r.status === 'Izin' || r.status === 'Dinas Luar' || r.status === 'Pelatihan').length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-mono font-bold uppercase tracking-wider">
                  <th className="p-3">Tanggal / Hari</th>
                  <th className="p-3">Waktu Masuk</th>
                  <th className="p-3">Swafoto Masuk</th>
                  <th className="p-3">Waktu Pulang</th>
                  <th className="p-3">Swafoto Pulang</th>
                  <th className="p-3">Jarak GPS</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myTotalAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400 font-medium">
                      Belum ada data rekap hadir aktif bulan ini.
                    </td>
                  </tr>
                ) : (
                  myTotalAttendances
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-gray-700">
                          {new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="p-3 font-mono text-gray-800 font-semibold">{rec.checkInTime || '--:--:--'}</td>
                        <td className="p-3">
                          {rec.checkInPhoto ? (
                            <button
                              onClick={() => setLightboxImage(rec.checkInPhoto!)}
                              className="relative w-10 h-10 rounded border border-gray-300 overflow-hidden hover:opacity-85 transition-all cursor-zoom-in"
                            >
                              <img
                                src={rec.checkInPhoto}
                                alt="Selfie Masuk"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </button>
                          ) : (
                            <span className="text-gray-300 font-mono">-</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-gray-800 font-semibold">{rec.checkOutTime || '--:--:--'}</td>
                        <td className="p-3">
                          {rec.checkOutPhoto ? (
                            <button
                              onClick={() => setLightboxImage(rec.checkOutPhoto!)}
                              className="relative w-10 h-10 rounded border border-gray-300 overflow-hidden hover:opacity-85 transition-all cursor-zoom-in"
                            >
                              <img
                                src={rec.checkOutPhoto}
                                alt="Selfie Pulang"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </button>
                          ) : (
                            <span className="text-gray-300 font-mono">-</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-gray-600">
                          {rec.checkInDistanceMeters !== undefined ? `${rec.checkInDistanceMeters}m` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-1 rounded inline-block font-mono ${
                              rec.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'Terlambat'
                                ? 'bg-amber-100 text-amber-800'
                                : rec.status === 'Alpa'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: JURNAL MENGAJAR (AGENDA & KBM) */}
      {activeTab === 'jurnal' && (
        <div id="teacher-journal-panel" className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Form Input Jurnal */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-xs print:hidden">
              <div className="border-b border-gray-150 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display text-blue-700">
                  <BookOpen className="w-4 h-4 text-blue-600" /> Isi Agenda & Jurnal Mengajar Baru
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Rekam detail pelaksanaan Kegiatan Belajar Mengajar (KBM) Anda setiap hari di kelas.
                </p>
              </div>

              {journalSuccess && (
                <div className="mb-4 bg-emerald-50 text-emerald-800 text-xs px-3 py-2 rounded-lg border border-emerald-100 font-semibold">
                  ✓ {journalSuccess}
                </div>
              )}

              {journalError && (
                <div className="mb-4 bg-rose-50 text-rose-800 text-xs px-3 py-2 rounded-lg border border-rose-100 font-semibold">
                  ⚠️ {journalError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setJournalSuccess(null);
                  setJournalError(null);

                  if (!journalKelas.trim()) {
                    setJournalError("Kolom 'Kelas' wajib diisi.");
                    return;
                  }
                  if (!journalMataPelajaran.trim()) {
                    setJournalError("Kolom 'Mata Pelajaran' wajib diisi.");
                    return;
                  }
                  if (!journalMateriPokok.trim()) {
                    setJournalError("Kolom 'Materi Pokok / Agenda KBM' wajib diisi.");
                    return;
                  }
                  if (!journalJamKe.trim()) {
                    setJournalError("Kolom 'Jam Pembelajaran Ke-' wajib diisi.");
                    return;
                  }

                  setIsSavingJournal(true);
                  try {
                    const newJournal: TeacherJournal = {
                      id: `journal-${Date.now()}`,
                      teacherId: currentTeacher.id,
                      teacherName: currentTeacher.nama,
                      date: new Date().toISOString().split('T')[0],
                      kelas: journalKelas.trim(),
                      mataPelajaran: journalMataPelajaran.trim(),
                      materiPokok: journalMateriPokok.trim(),
                      jamKe: journalJamKe.trim(),
                      jumlahSiswaHadir: Number(journalHadirCount) || 0,
                      jumlahSiswaAbsen: Number(journalAbsenCount) || 0,
                      catatanSiswaAbsen: journalCatatanAbsen.trim() || undefined,
                      hambatanDanSolusi: journalHambatan.trim() || undefined,
                      timestamp: new Date().toISOString()
                    };

                    onAddJournal(newJournal);
                    setJournalSuccess("Jurnal mengajar harian berhasil disimpan dan dipublikasikan!");
                    
                    // Clear inputs
                    setJournalKelas('');
                    setJournalMataPelajaran('');
                    setJournalMateriPokok('');
                    setJournalJamKe('');
                    setJournalHadirCount(0);
                    setJournalAbsenCount(0);
                    setJournalCatatanAbsen('');
                    setJournalHambatan('');
                  } catch (err: any) {
                    setJournalError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setIsSavingJournal(false);
                  }
                }}
                className="flex flex-col gap-3 text-xs"
              >
                {/* Kelas & Jam-ke double column */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Rombel / Kelas</label>
                    <input
                      type="text"
                      disabled={isSavingJournal}
                      value={journalKelas}
                      onChange={(e) => setJournalKelas(e.target.value)}
                      placeholder="e.g. VII-A, XI-MIPA 2"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-blue-500 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Jam Belajar Ke-</label>
                    <input
                      type="text"
                      disabled={isSavingJournal}
                      value={journalJamKe}
                      onChange={(e) => setJournalJamKe(e.target.value)}
                      placeholder="e.g. 1-2, 3, 5-6"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-blue-500 text-slate-800"
                    />
                  </div>
                </div>

                {/* Mata Pelajaran */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Mata Pelajaran</label>
                  <input
                    type="text"
                    disabled={isSavingJournal}
                    value={journalMataPelajaran}
                    onChange={(e) => setJournalMataPelajaran(e.target.value)}
                    placeholder="e.g. Matematika, Matematika Wajib"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-blue-500 font-semibold text-slate-800"
                  />
                </div>

                {/* Materi Pokok KBM */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Materi Pokok / Agenda Kegiatan</label>
                  <textarea
                    disabled={isSavingJournal}
                    rows={2}
                    value={journalMateriPokok}
                    onChange={(e) => setJournalMateriPokok(e.target.value)}
                    placeholder="e.g. Menyelesaikan sistem persamaan linier tiga variabel dan latihan soal"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-blue-500 text-slate-850"
                  />
                </div>

                {/* Siswa counts double column */}
                <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-blue-900 block mb-1 uppercase tracking-wide">Siswa Hadir</label>
                    <input
                      type="number"
                      min={0}
                      disabled={isSavingJournal}
                      value={journalHadirCount || ''}
                      onChange={(e) => setJournalHadirCount(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-xs text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-red-900 block mb-1 uppercase tracking-wide">Siswa Absen</label>
                    <input
                      type="number"
                      min={0}
                      disabled={isSavingJournal}
                      value={journalAbsenCount || ''}
                      onChange={(e) => setJournalAbsenCount(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-xs text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                {/* Catatan Siswa Absen */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Nama / Catatan Siswa Absen (Opsional)</label>
                  <input
                    type="text"
                    disabled={isSavingJournal}
                    value={journalCatatanAbsen}
                    onChange={(e) => setJournalCatatanAbsen(e.target.value)}
                    placeholder="e.g. Budi (sakit), Kevin (bolos)"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-blue-500 text-slate-800"
                  />
                </div>

                {/* Hambatan & Solusi */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Hambatan & Solusi / Tindak Lanjut (Opsional)</label>
                  <textarea
                    disabled={isSavingJournal}
                    rows={2}
                    value={journalHambatan}
                    onChange={(e) => setJournalHambatan(e.target.value)}
                    placeholder="e.g. Beberapa siswa masih bingung di pertengahan materi. Solusi: diberi modul latihan tambahan di rumah."
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-blue-500 text-slate-800"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingJournal}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2 rounded-lg transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4" />
                    Simpan Jurnal KBM
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Riwayat Jurnal Saya */}
            <div className="lg:col-span-7 print:col-span-12 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <div className="border-b border-gray-150 pb-3 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5 text-slate-700">
                  📁 Arsip Jurnal Mengajar Saya ({journals.filter(j => j.teacherId === currentTeacher.id).length})
                </h3>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm uppercase tracking-wider"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak / Arsip Jurnal
                </button>
              </div>

              <div className="flex flex-col gap-4 max-h-[580px] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
                {journals.filter(j => j.teacherId === currentTeacher.id).length === 0 ? (
                  <div className="text-center py-20 text-gray-400 border border-dashed border-gray-250 rounded-xl bg-gray-50/30">
                    <BookOpen className="w-8 h-8 text-blue-500/30 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-500">Belum ada jurnal mengajar yang terekam.</p>
                    <p className="text-[10px] text-gray-400 mt-1">Silakan isi formulir di samping kiri untuk mengarsipkan agenda mengajar harian.</p>
                  </div>
                ) : (
                  [...journals]
                    .filter(j => j.teacherId === currentTeacher.id)
                    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                    .map((j) => (
                      <div key={j.id} className="bg-slate-50 border border-gray-200 p-4 rounded-xl flex flex-col gap-2 shadow-xs relative">
                        {/* Day / Class Badge Row */}
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono tracking-wider">
                              Kelas {j.kelas}
                            </span>
                            <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                              Jam Ke: {j.jamKe}
                            </span>
                          </div>
                          <span className="text-[10.5px] text-gray-500 font-bold font-mono">
                            📅 {j.date}
                          </span>
                        </div>

                        {/* Subject Title */}
                        <div>
                          <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-tight">{j.mataPelajaran}</h4>
                          <p className="text-xs text-slate-755 mt-0.5 whitespace-pre-line leading-relaxed font-sans font-semibold">
                            materi: <span className="font-normal text-slate-800">{j.materiPokok}</span>
                          </p>
                        </div>

                        {/* Attendance summary statistics */}
                        <div className="grid grid-cols-2 gap-2 text-[10.5px] border-t border-b border-gray-150 py-1.5 font-mono">
                          <span className="text-emerald-700 font-semibold">✓ Hadir: {j.jumlahSiswaHadir} Siswa</span>
                          <span className={j.jumlahSiswaAbsen > 0 ? "text-amber-700 font-semibold" : "text-gray-400"}>
                            ⚠️ Absen: {j.jumlahSiswaAbsen} Siswa
                          </span>
                          {j.catatanSiswaAbsen && (
                            <p className="col-span-2 text-[9.5px] text-gray-500 italic mt-0.5">
                              Ket: {j.catatanSiswaAbsen}
                            </p>
                          )}
                        </div>

                        {/* Obstacles & solutions if present */}
                        {j.hambatanDanSolusi && (
                          <div className="text-[11px] bg-white p-2 rounded border border-gray-150 leading-relaxed text-gray-600">
                            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Hambatan & Solusi:</span>
                            {j.hambatanDanSolusi}
                          </div>
                        )}

                        {/* KEPALA SEKOLAH FEEDBACK RESPONSE BUBBLE */}
                        {j.feedbackKepsek ? (
                          <div className="mt-2 text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg flex flex-col gap-1">
                            <span className="text-[9.5px] font-extrabold text-emerald-600 uppercase tracking-widest block font-mono">🗣️ Catatan & Feedback Kepala Sekolah:</span>
                            <p className="italic font-semibold text-slate-800">" {j.feedbackKepsek} "</p>
                            <span className="text-[8.5px] text-emerald-500 font-mono text-right">- Drs. H. Bambang Hermawan, M.Si</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 italic font-mono mt-1">
                             belum diperiksa Kepala Sekolah
                          </div>
                        )}
                        
                      </div>
                    ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: AKUN & PROFIL SAYA */}
      {activeTab === 'profil' && (
        <div id="teacher-profile-panel" className="bg-white border text-gray-800 border-gray-200 rounded-xl p-5 shadow-xs max-w-2xl mx-auto">
          <div className="border-b border-gray-150 pb-4 mb-5">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 font-display">
              👤 Pengaturan Akun & Profil Mandiri
            </h3>
            <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">
              Anda sebagai guru dapat mengubah nama tampilan, Username / NIP login, Kata Sandi akun, serta Pas Foto / Avatar Profil mandiri secara aman.
            </p>
          </div>

          {teacherSaveSuccess && (
            <div className="mb-4 bg-emerald-50 font-semibold text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg border border-emerald-150 flex items-center gap-2">
              <span className="text-emerald-650 font-bold">✓</span>
              <span>Profil Anda berhasil diperbarui di database sistem!</span>
            </div>
          )}

          {teacherSaveError && (
            <div className="mb-4 bg-rose-50 text-rose-800 text-xs px-3.5 py-2.5 rounded-lg border border-rose-150 font-semibold">
              {teacherSaveError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setTeacherSaveSuccess(false);
              setTeacherSaveError(null);

              if (!teacherName.trim()) {
                setTeacherSaveError("Nama lengkap tidak boleh kosong.");
                return;
              }
              if (!teacherNip.trim()) {
                setTeacherSaveError("Username / NIP tidak boleh kosong.");
                return;
              }
              if (!teacherPassword.trim()) {
                setTeacherSaveError("Kata sandi akses login tidak boleh kosong.");
                return;
              }

              setIsSavingLocal(true);
              try {
                if (onUpdateTeacher) {
                  await onUpdateTeacher({
                    ...currentTeacher,
                    nama: teacherName.trim(),
                    nip: teacherNip.trim(),
                    password: teacherPassword.trim(),
                    fotoUrl: teacherAvatar,
                    phone: teacherPhone.trim(),
                  });
                  setTeacherSaveSuccess(true);
                  setTimeout(() => setTeacherSaveSuccess(false), 5000);
                } else {
                  setTeacherSaveError("Koneksi database tidak memadai.");
                }
              } catch (err: any) {
                console.error("Gagal memperbarui profil guru:", err);
                setTeacherSaveError(err instanceof Error ? err.message : String(err));
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
                    src={teacherAvatar}
                    alt="Current Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* CHOOSE PRESET & FILE UPLOAD */}
              <div className="flex-grow">
                <label className="text-[11px] font-bold text-gray-500 block mb-2 uppercase tracking-wide">Pilih Pas Foto Profil:</label>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSavingLocal}
                      onClick={() => setTeacherAvatar(av)}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                        teacherAvatar === av ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-gray-250'
                      }`}
                    >
                      <img src={av} alt="Preset avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}

                  {/* CUSTOM FILE UPLOAD FOR TEACHERS PROFILE */}
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
                          // Note: Even with large files we can compress them directly using Canvas
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            if (reader.result) {
                              try {
                                const compressedStr = await compressImage(reader.result as string, 160, 160);
                                setTeacherAvatar(compressedStr);
                              } catch (compressErr) {
                                console.error("Gagal melakukan kompresi foto:", compressErr);
                                setTeacherAvatar(reader.result as string);
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
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    disabled={isSavingLocal}
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">NIP / Username Login</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <Settings className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    disabled={isSavingLocal}
                    value={teacherNip}
                    onChange={(e) => setTeacherNip(e.target.value)}
                    placeholder="Nomor Induk Pegawai"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-mono font-semibold focus:outline-emerald-500 text-slate-800"
                  />
                </div>
                <p className="text-[9.5px] text-gray-400 mt-1 font-sans">Gunakan username / NIP ini sewaktu login.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Nomor WhatsApp / HP (Opsional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    disabled={isSavingLocal}
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-mono font-semibold focus:outline-emerald-500 text-slate-800"
                  />
                </div>
                <p className="text-[9.5px] text-gray-400 mt-1 font-sans">Digunakan untuk keperluan notifikasi sistem WhatsApp.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wide">Kata Sandi Akses</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showTeacherPass ? "text" : "password"}
                    disabled={isSavingLocal}
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    placeholder="Sandi Rahasia"
                    className="w-full pl-9 pr-24 py-2 border border-gray-300 rounded-lg text-xs font-semibold font-mono tracking-wide focus:outline-emerald-500 text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={isSavingLocal}
                    onClick={() => setShowTeacherPass(!showTeacherPass)}
                    className="absolute right-2.5 top-1.5 text-[10px] text-gray-500 font-bold hover:bg-gray-100 py-1 px-2 rounded uppercase font-mono tracking-wider transition-all cursor-pointer"
                  >
                    {showTeacherPass ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <p className="text-[9.5px] text-gray-400 mt-1 font-sans">Harap catat baik-baik kata sandi baru Anda untuk menghindari kendala kegagalan login.</p>
              </div>

            </div>

            {/* BUTTON SUBMIT */}
            <div className="border-t border-gray-150 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSavingLocal}
                className={`text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                  isSavingLocal ? 'bg-emerald-400 cursor-not-allowed opacity-80' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                {isSavingLocal ? "Sedang Menyimpan..." : "Simpan Pembaruan Profil"}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* Selfie Watermarked Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-sm w-full border border-gray-200">
            <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center text-gray-800">
              <span className="text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1 text-emerald-600">
                <Camera className="w-3.5 h-3.5" /> Verifikasi Swafoto Guru
              </span>
              <button
                onClick={() => setLightboxImage(null)}
                className="text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded-lg p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative aspect-[4/3] bg-neutral-900 flex items-center justify-center">
              <img
                src={lightboxImage}
                alt="Watermarked Selfie Preview"
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

interface XProps {
  className?: string;
}
function X({ className }: XProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
