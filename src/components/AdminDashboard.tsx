import React, { useState } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Settings,
  Download,
  Printer,
  Compass,
  Briefcase,
  Mail,
  User,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Upload,
  Clock,
  Calendar,
  RefreshCw,
  FileImage,
  Eye,
  EyeOff
} from 'lucide-react';
import JSZip from 'jszip';
import { Teacher, AttendanceRecord, SchoolConfig, TeacherJournal } from '../types';
import { sendWhatsappMessage } from '../lib/whatsapp';
import LocationSelector from './LocationSelector';

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

interface AdminDashboardProps {
  teachers: Teacher[];
  attendanceHistory: AttendanceRecord[];
  journals?: TeacherJournal[];
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (config: SchoolConfig) => void;
  onAddTeacher: (teacher: Teacher) => void;
  onAddTeachers: (teachers: Teacher[]) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onClearAllData?: () => void;
  // Location simulation props passed from main App
  simulatedUserLat: number;
  simulatedUserLng: number;
  onSimulatedLocationChange: (lat: number, lng: number) => void;
  adminProfile?: any;
  onUpdateAdminProfile?: (newProfile: any) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
];

export default function AdminDashboard({
  teachers,
  attendanceHistory,
  journals = [],
  schoolConfig,
  onUpdateSchoolConfig,
  onAddTeacher,
  onAddTeachers,
  onUpdateTeacher,
  onDeleteTeacher,
  onClearAllData,
  simulatedUserLat,
  simulatedUserLng,
  onSimulatedLocationChange,
  adminProfile,
  onUpdateAdminProfile,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'teachers' | 'geofence' | 'reports' | 'calendar' | 'adminSettings'>('teachers');

  // Admin Profile settings form states
  const [adminName, setAdminName] = useState(adminProfile?.nama || 'Operator Utama / Admin');
  const [adminNip, setAdminNip] = useState(adminProfile?.nip || 'admin');
  const [adminPassword, setAdminPassword] = useState(adminProfile?.password || 'admin');
  const [adminAvatar, setAdminAvatar] = useState(adminProfile?.fotoUrl || PRESET_AVATARS[0]);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminSaveSuccess, setAdminSaveSuccess] = useState(false);
  const [adminSaveError, setAdminSaveError] = useState<string | null>(null);

  // WhatsApp Config state
  const [waEnabled, setWaEnabled] = useState(schoolConfig.whatsappConfig?.enabled || false);
  const [waProvider, setWaProvider] = useState<'fonnte' | 'wablas'>(schoolConfig.whatsappConfig?.provider || 'fonnte');
  const [waApiKey, setWaApiKey] = useState(schoolConfig.whatsappConfig?.apiKey || '');
  const [waKepsekPhone, setWaKepsekPhone] = useState(schoolConfig.whatsappConfig?.kepsekPhone || '');
  const [waSaveSuccess, setWaSaveSuccess] = useState(false);

  // WA Blast States
  const [waBroadcastMsg, setWaBroadcastMsg] = useState('');
  const [waBroadcastStatus, setWaBroadcastStatus] = useState<{ loading: boolean; text: string; type: 'success'|'error'|'info' } | null>(null);

  const handleSendBroadcast = async () => {
    if (!waBroadcastMsg.trim()) return;
    if (!schoolConfig.whatsappConfig?.enabled) {
      setWaBroadcastStatus({ loading: false, text: 'Fitur WA belum diaktifkan di Pengaturan.', type: 'error' });
      return;
    }
    
    setWaBroadcastStatus({ loading: true, text: 'Mengirim pesan broadcast...', type: 'info' });
    const targets = teachers.filter(t => t.phone && t.phone.length > 5);
    
    if (targets.length === 0) {
      setWaBroadcastStatus({ loading: false, text: 'Tidak ada guru dengan nomor telepon yang valid.', type: 'error' });
      return;
    }

    let successCount = 0;
    for (const t of targets) {
      const waMsg = `*PENGUMUMAN SEKOLAH* 📢\n\nHalo Bapak/Ibu ${t.nama},\n\n${waBroadcastMsg}\n\n_Salam, Admin ${schoolConfig.schoolName}_`;
      try {
        const res = await sendWhatsappMessage(t.phone as string, waMsg, schoolConfig.whatsappConfig);
        if (res.success) successCount++;
      } catch (err) {}
    }

    setWaBroadcastStatus({ loading: false, text: `Berhasil mengirim broadcast ke ${successCount} dari ${targets.length} guru.`, type: 'success' });
    setWaBroadcastMsg('');
  };

  const handleSendReminderJurnal = async () => {
    if (!schoolConfig.whatsappConfig?.enabled) {
      setWaBroadcastStatus({ loading: false, text: 'Fitur WA belum diaktifkan.', type: 'error' });
      return;
    }

    setWaBroadcastStatus({ loading: true, text: 'Memindai data & mengirim pengingat...', type: 'info' });
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Find teachers who checked in today
    const presentTeacherIds = new Set(
      attendanceHistory
        .filter(a => a.date === todayStr && a.checkInTime)
        .map(a => a.teacherId)
    );

    // Find teachers who submitted a journal today in the dedicated journals collection passed via props
    const journalTeacherIds = new Set(
      (journals || [])
        .filter(j => j.date === todayStr)
        .map(j => j.teacherId)
    );

    const targets = teachers.filter(t => presentTeacherIds.has(t.id) && !journalTeacherIds.has(t.id) && t.phone);

    if (targets.length === 0) {
      setWaBroadcastStatus({ loading: false, text: 'Semua guru yang hadir hari ini sudah mengisi jurnal!', type: 'success' });
      return;
    }

    let successCount = 0;
    for (const t of targets) {
      const waMsg = `*PENGINGAT JURNAL MENGAJAR* 📝\n\nHalo Bapak/Ibu ${t.nama},\n\nAnda tercatat sudah absen masuk hari ini, namun *belum mengisi jurnal mengajar/agenda*. Mohon segera buka aplikasi dan lengkapi agenda kelas hari ini sebelum pulang.\n\n_Terima kasih._`;
      try {
        const res = await sendWhatsappMessage(t.phone as string, waMsg, schoolConfig.whatsappConfig);
        if (res.success) successCount++;
      } catch (err) {}
    }

    setWaBroadcastStatus({ loading: false, text: `Berhasil mengingatkan ${successCount} guru yang belum mengisi jurnal.`, type: 'success' });
  };

  const handleSendDailyRekap = async () => {
    if (!schoolConfig.whatsappConfig?.enabled || !schoolConfig.whatsappConfig.kepsekPhone) {
      setWaBroadcastStatus({ loading: false, text: 'Nomor WA Kepsek belum diatur atau fitur nonaktif.', type: 'error' });
      return;
    }

    setWaBroadcastStatus({ loading: true, text: 'Menyusun rekap harian...', type: 'info' });
    const todayStr = new Date().toISOString().split('T')[0];
    
    const todaysAttendance = attendanceHistory.filter(a => a.date === todayStr && a.checkInTime);
    
    let presentCount = 0, lateCount = 0;
    todaysAttendance.forEach(a => {
      if (a.status === 'Terlambat') {
        lateCount++;
      } else if (a.status === 'Hadir') {
        presentCount++;
      }
    });

    const totalTeachers = teachers.length;
    const absentCount = totalTeachers - (presentCount + lateCount);

    const waMsg = `*REKAPITULASI KEHADIRAN GURU* 📊\n*Tanggal: ${todayStr}*\n\n1. Hadir Tepat Waktu: *${presentCount}*\n2. Hadir Terlambat: *${lateCount}*\n3. Belum Hadir / Cuti: *${absentCount}*\n\nTotal Guru: *${totalTeachers}*\n\n_Sistem Admin Terpadu_`;
    
    try {
      const res = await sendWhatsappMessage(schoolConfig.whatsappConfig.kepsekPhone, waMsg, schoolConfig.whatsappConfig);
      if (res.success) {
        setWaBroadcastStatus({ loading: false, text: 'Rekap harian berhasil dikirim ke Kepala Sekolah.', type: 'success' });
      } else {
        setWaBroadcastStatus({ loading: false, text: 'Gagal mengirim rekap WA: ' + res.error, type: 'error' });
      }
    } catch(err: any) {
      setWaBroadcastStatus({ loading: false, text: 'Gagal mengirim rekap WA: ' + err.message, type: 'error' });
    }
  };

  // Sync state values when adminProfile resolves from Firestore
  React.useEffect(() => {
    if (adminProfile) {
      setAdminName(adminProfile.nama || '');
      setAdminNip(adminProfile.nip || '');
      setAdminPassword(adminProfile.password || '');
      setAdminAvatar(adminProfile.fotoUrl || PRESET_AVATARS[0]);
    }
  }, [adminProfile]);

  // School Calendar and Flexible Work Hours management state variables
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newFlexDate, setNewFlexDate] = useState('');
  const [newFlexLabel, setNewFlexLabel] = useState('');
  const [newFlexStart, setNewFlexStart] = useState('06:00');
  const [newFlexEnd, setNewFlexEnd] = useState('07:30');
  const [newFlexOut, setNewFlexOut] = useState('14:00');
  
  // Teachers table state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add / Edit Teacher state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formName, setFormName] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formJabatan, setFormJabatan] = useState('Guru Kelas');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCuti, setFormCuti] = useState('12');
  const [formPass, setFormPass] = useState('password123');
  const [showTeacherFormPass, setShowTeacherFormPass] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // Bulk Upload states
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [parsedBulkTeachers, setParsedBulkTeachers] = useState<any[]>([]);
  const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Filters for Laporan
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState('2026-06');
  const [reportType, setReportType] = useState<'harian' | 'bulanan'>('harian');

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // ZIP Photo Export states
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [photoExportMonth, setPhotoExportMonth] = useState('2026-06');

  const filteredTeachers = teachers.filter(
    t => t.nama.toLowerCase().includes(searchTerm.toLowerCase()) || t.nip.includes(searchTerm)
  );

  // Reset form helper
  const openForm = (teacher?: Teacher) => {
    setTeacherError(null);
    setShowTeacherFormPass(false);
    if (teacher) {
      setEditingTeacher(teacher);
      setFormName(teacher.nama);
      setFormNip(teacher.nip);
      setFormJabatan(teacher.jabatan);
      setFormEmail(teacher.email);
      setFormPhone(teacher.phone || '');
      setFormCuti(teacher.sisaCuti.toString());
      setFormPass(teacher.password || 'password123');
      setSelectedAvatar(teacher.fotoUrl);
    } else {
      setEditingTeacher(null);
      setFormName('');
      setFormNip('');
      setFormJabatan('Guru Kelas');
      setFormEmail('');
      setFormPhone('');
      setFormCuti('12');
      setFormPass('password123');
      // Assign random preset avatar
      setSelectedAvatar(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]);
    }
    setIsFormOpen(true);
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);

    const cleanNip = formNip.trim();
    const cleanNama = formName.trim();
    const cleanEmail = formEmail.trim();

    if (!cleanNip || !cleanNama || !cleanEmail) {
      setTeacherError('NIP, Nama Lengkap, dan Email wajib diisi.');
      return;
    }

    if (cleanNip.length < 5) {
      setTeacherError('NIP wajib terdiri dari minimal 5 digit numerik.');
      return;
    }

    // Check duplicate NIP if creating new
    if (!editingTeacher && teachers.some(t => t.nip === cleanNip)) {
      setTeacherError('Guru dengan NIP tersebut sudah terdaftar di sistem.');
      return;
    }

    const payload: Teacher = {
      id: editingTeacher ? editingTeacher.id : `teacher-${Date.now()}`,
      nip: cleanNip,
      nama: cleanNama,
      jabatan: formJabatan,
      email: cleanEmail,
      phone: formPhone.trim(),
      sisaCuti: parseInt(formCuti) || 12,
      fotoUrl: selectedAvatar,
      password: formPass,
      customAdded: true
    };

    if (editingTeacher) {
      onUpdateTeacher(payload);
    } else {
      onAddTeacher(payload);
    }

    setIsFormOpen(false);
  };

  // Convert currently filtered logs to EXCEL-friendly CSV file
  const handleExportCSV = () => {
    let headers = ['Tanggal', 'NIP', 'Nama Guru', 'Check-In Jam', 'Check-Out Jam', 'Jarak GPS', 'Status Kehadiran'];
    let rows: string[][] = [];

    if (reportType === 'harian') {
      teachers.forEach(t => {
        const found = attendanceHistory.find(h => h.teacherId === t.id && h.date === filterDate);
        // Force Excel to treat NIP as text to prevent scientific notation (e.g. 1.98E+17)
        const formattedNip = t.nip && t.nip !== '-' ? `="${t.nip}"` : '-';
        rows.push([
          filterDate,
          formattedNip,
          t.nama,
          found?.checkInTime || '-',
          found?.checkOutTime || '-',
          found?.checkInDistanceMeters !== undefined ? `${found.checkInDistanceMeters}m` : '-',
          found?.status || 'Alpa'
        ]);
      });
    } else {
      // Bulanan
      const [year, month] = filterMonth.split('-');
      const monthRecords = attendanceHistory.filter(h => h.date.startsWith(`${year}-${month}`));
      
      monthRecords.forEach(rec => {
        const teacherObj = teachers.find(t => t.id === rec.teacherId);
        // Force Excel to treat NIP as text to prevent scientific notation (e.g. 1.98E+17)
        const formattedNip = teacherObj?.nip && teacherObj.nip !== '-' ? `="${teacherObj.nip}"` : '-';
        rows.push([
          rec.date,
          formattedNip,
          rec.teacherName,
          rec.checkInTime || '-',
          rec.checkOutTime || '-',
          rec.checkInDistanceMeters !== undefined ? `${rec.checkInDistanceMeters}m` : '-',
          rec.status
        ]);
      });
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_absensi_${reportType === 'harian' ? filterDate : filterMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to get friendly Indonesian label of selected Month
  const getSelectedMonthLabel = (customMonth?: string) => {
    const monthToUse = customMonth || filterMonth;
    const [year, month] = monthToUse.split('-');
    const indonesianMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = indonesianMonths[parseInt(month) - 1] || month;
    return `${monthName} ${year}`;
  };

  // Package and download all profile and attendance photos as a single consolidated ZIP file
  const handleDownloadAllPhotos = async (onlySelectedMonth: boolean = false, targetMonth: string = photoExportMonth) => {
    setIsZipping(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      
      let addedProfileCount = 0;
      let addedCheckInCount = 0;
      let addedCheckOutCount = 0;

      // 1. Pack Teacher Profile Pictures (only when retrieving all photos, otherwise skip)
      if (!onlySelectedMonth) {
        teachers.forEach((t) => {
          if (t.fotoUrl && t.fotoUrl.startsWith('data:image/')) {
            const parts = t.fotoUrl.split(',');
            if (parts.length > 1) {
              const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
              const ext = mime.split('/')[1] || 'jpeg';
              const cleanName = t.nama.replace(/[\/\\?%*:|"<>\s]+/g, '_');
              const fileName = `Foto_Profil_Guru/${t.nip}_${cleanName}.${ext}`;
              zip.file(fileName, parts[1], { base64: true });
              addedProfileCount++;
            }
          }
        });
      }

      // 2. Pack Attendance Photos
      attendanceHistory.forEach((rec) => {
        // If filtering by selected month, ignore logs that don't match our targetMonth (format: YYYY-MM)
        if (onlySelectedMonth && !rec.date.startsWith(targetMonth)) {
          return;
        }

        const cleanTeacherName = rec.teacherName.replace(/[\/\\?%*:|"<>\s]+/g, '_');
        
        // Check-In Photo
        if (rec.checkInPhoto && rec.checkInPhoto.startsWith('data:image/')) {
          const parts = rec.checkInPhoto.split(',');
          if (parts.length > 1) {
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const ext = mime.split('/')[1] || 'jpeg';
            const formattedTime = rec.checkInTime?.replace(/:/g, '-') || '00-00-00';
            const fileName = `Foto_Absensi_Masuk/${rec.date}_${formattedTime}_${cleanTeacherName}.${ext}`;
            zip.file(fileName, parts[1], { base64: true });
            addedCheckInCount++;
          }
        }

        // Check-Out Photo
        if (rec.checkOutPhoto && rec.checkOutPhoto.startsWith('data:image/')) {
          const parts = rec.checkOutPhoto.split(',');
          if (parts.length > 1) {
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const ext = mime.split('/')[1] || 'jpeg';
            const formattedTime = rec.checkOutTime?.replace(/:/g, '-') || '00-00-00';
            const fileName = `Foto_Absensi_Pulang/${rec.date}_${formattedTime}_${cleanTeacherName}.${ext}`;
            zip.file(fileName, parts[1], { base64: true });
            addedCheckOutCount++;
          }
        }
      });

      const totalFiles = addedProfileCount + addedCheckInCount + addedCheckOutCount;
      if (totalFiles === 0) {
        if (onlySelectedMonth) {
          alert(`Belum ada data foto swafoto absensi untuk periode bulan ${getSelectedMonthLabel(targetMonth)} di sistem.`);
        } else {
          alert("Belum ada data foto swafoto absensi atau foto profil berformat gambar di sistem.");
        }
        setIsZipping(false);
        return;
      }

      const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setZipProgress(Math.round(metadata.percent));
      });

      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      
      const fileDateSuffix = onlySelectedMonth ? targetMonth : `Semua_Hingga_${new Date().toISOString().split('T')[0]}`;
      link.download = `Sistem_Absensi_Ekspor_Foto_${fileDateSuffix}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengepak file ZIP:", err);
      alert("Terjadi kesalahan saat menyiapkan file ZIP.");
    } finally {
      setIsZipping(false);
    }
  };

  // Convert currently selected month logs to a beautifully formatted Excel CSV Dinas with official Kop Surat
  const handleDownloadExcelDinas = () => {
    const [year, month] = filterMonth.split('-');
    const indonesianMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = indonesianMonths[parseInt(month) - 1] || month;

    // We build a highly readable Dinas layout incorporating official signatures and layout inside the CSV rows when parsed by Excel
    const headerRows = [
      `"LAPORAN REKAPITULASI KEHADIRAN BULANAN PEGAWAI / TENAGA PENDIDIK"`,
      `"INSTANSI: DINAS PENDIDIKAN DAN KEBUDAYAAN KOTA"`,
      `"SEKOLAH: ${schoolConfig.schoolName.toUpperCase()}"`,
      `"ALAMAT: ${schoolConfig.address?.toUpperCase() || '-'}"`,
      `"PERIODE PERTANGGUNGJAWABAN: BULAN ${monthName.toUpperCase()} ${year}"`,
      `""`, // blank spacer line
      `"NIP","Nama Tenaga Pendidik","Tanggal Absensi","Jam Check-In Masuk","Jam Check-Out Pulang","Jarak GPS Sekolah (Meter)","Status Presensi"`
    ];

    const dataRows: string[] = [];
    const monthlyFiltered = attendanceHistory.filter(h => h.date.startsWith(`${year}-${month}`));

    if (monthlyFiltered.length === 0) {
      dataRows.push(`"-","-","Tidak ada data log kehadiran tercatat di bulan ini","-","-","-","-"`);
    } else {
      // Sort chronologically by date
      const sortedLogs = [...monthlyFiltered].sort((a, b) => a.date.localeCompare(b.date));
      sortedLogs.forEach(log => {
        const teacherObj = teachers.find(t => t.id === log.teacherId);
        // Replace outer quotes, escape double quotes
        const rawNip = teacherObj?.nip || '-';
        // Force Excel text format: "=""1988..."""
        const safeNip = rawNip !== '-' ? `=""${rawNip.replace(/"/g, '""')}""` : '-';
        const safeNama = (log.teacherName || '-').replace(/"/g, '""');
        const safeDate = (log.date || '-').replace(/"/g, '""');
        const safeIn = (log.checkInTime || '-').replace(/"/g, '""');
        const safeOut = (log.checkOutTime || '-').replace(/"/g, '""');
        const safeDist = log.checkInDistanceMeters !== undefined ? `${log.checkInDistanceMeters}m` : '-';
        const safeStatus = (log.status || '-').replace(/"/g, '""');

        dataRows.push(`"${safeNip}","${safeNama}","${safeDate}","${safeIn}","${safeOut}","${safeDist}","${safeStatus}"`);
      });
    }

    // Signatures and metadata at the bottom
    const footerRows = [
      `""`,
      `""`,
      `"","","","","","Yogyakarta, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}"`,
      `"","","","","","Mengetahui, Kepala Sekolah"`,
      `""`,
      `""`,
      `"","","","","","Drs. H. Bambang Hermawan, M.Si"`,
      `"","","","","","NIP. 197508112002121001"`
    ];

    const csvContent = "\uFEFF" + [...headerRows, ...dataRows, ...footerRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `REKAP_DINAS_BULANAN_${schoolConfig.schoolName.replace(/\s+/g, '_')}_${monthName}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- BULK TEACHERS IMPORT PARSING LOGIC ---
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processBulkFile(file);
  };

  const processBulkFile = (file: File) => {
    setBulkUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setBulkUploadError("Berkas / File kosong.");
          return;
        }

        // Read line by line
        const lines = text.split(/\r?\n/).map(line => line.trim());
        if (lines.length < 2) {
          setBulkUploadError("File harus memiliki minimal baris judul (header) dan satu baris data.");
          return;
        }

        // Detect separators automatically (defaulting to comma or semicolon which Excel uses)
        let separator = ',';
        const firstLine = lines[0];
        if (firstLine.includes(';')) {
          separator = ';';
        } else if (firstLine.includes('\t')) {
          separator = '\t';
        }

        const splitCsvLine = (line: string) => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const rawHeaders = splitCsvLine(lines[0]);
        const headers = rawHeaders.map(h => h.toLowerCase().replace(/["']/g, '').trim());

        // Locate columns index
        const nipIdx = headers.findIndex(h => h.includes('nip') || h.includes('nuptk') || h.includes('id') || h.includes('username'));
        const namaIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('lengkap'));
        const jabatanIdx = headers.findIndex(h => h.includes('jabatan') || h.includes('role') || h.includes('posisi') || h.includes('position'));
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('surat'));
        const cutiIdx = headers.findIndex(h => h.includes('cuti') || h.includes('leave') || h.includes('sakit'));
        const passIdx = headers.findIndex(h => h.includes('password') || h.includes('sandi') || h.includes('kata'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('telp') || h.includes('wa') || h.includes('handphone') || h.includes('hp'));

        if (nipIdx === -1 || namaIdx === -1) {
          setBulkUploadError("Header kolom minimal wajib berisi 'NIP' dan 'Nama'. Silakan unduh contoh template resmi kami.");
          return;
        }

        const parsedList: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          
          const cols = splitCsvLine(line);
          if (cols.length < Math.max(nipIdx, namaIdx) + 1) continue;

          const nip = cols[nipIdx]?.replace(/["']/g, '').trim() || '';
          const nama = cols[namaIdx]?.replace(/["']/g, '').trim() || '';
          if (!nip && !nama) continue;

          const rawJabatan = jabatanIdx !== -1 ? cols[jabatanIdx]?.replace(/["']/g, '').trim() : '';
          const jabatan = rawJabatan || 'Guru Kelas';
          
          const rawEmail = emailIdx !== -1 ? cols[emailIdx]?.replace(/["']/g, '').trim() : '';
          const email = rawEmail || `${nip || 'guru'}@sekolah.sch.id`;

          const rawCuti = cutiIdx !== -1 ? cols[cutiIdx]?.replace(/["']/g, '').trim() : '';
          const sisaCuti = parseInt(rawCuti) >= 0 ? parseInt(rawCuti) : 12;

          const rawPass = passIdx !== -1 ? cols[passIdx]?.replace(/["']/g, '').trim() : '';
          const password = rawPass || 'password123';

          const rawPhone = phoneIdx !== -1 ? cols[phoneIdx]?.replace(/["']/g, '').trim() : '';
          const phone = rawPhone || '';

          parsedList.push({
            nip,
            nama,
            jabatan,
            email,
            phone,
            sisaCuti,
            password
          });
        }

        if (parsedList.length === 0) {
          setBulkUploadError("Tidak ditemukan data guru valid pada file CSV yang diunggah.");
        } else {
          setParsedBulkTeachers(parsedList);
        }
      } catch (err) {
        setBulkUploadError("Gagal membaca file CSV: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBulkFile(file);
    }
  };

  const downloadBulkTemplate = () => {
    const headers = ['NIP', 'Nama', 'Jabatan', 'Email', 'Sisa Cuti', 'Password', 'No WhatsApp'];
    const rows = [
      ['198807242015042001', 'Sri Wahyuningsih, S.Pd', 'Guru Kelas', 'sri@sekolah.sch.id', '12', 'password1122', '081234567890'],
      ['199205112019031003', 'Hendra Ginanjar, M.Pd', 'Guru Bidang Studi / Matematika', 'hendra@sekolah.sch.id', '12', 'password123', '085234567891'],
      ['199512302022022001', 'Anisa Sukmawati, S.Pd', 'Guru Bidang Studi / IPA', 'anisa@sekolah.sch.id', '12', 'password123', '089234567892']
    ];

    const utf8Bom = '\uFEFF';
    let csvContent = "data:text/csv;charset=utf-8," + utf8Bom
      + [headers.join(','), ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "guru_template_bulk_upload.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmBulkImport = () => {
    if (parsedBulkTeachers.length === 0) return;

    const newTeachersBatch: Teacher[] = [];
    let skipCount = 0;

    parsedBulkTeachers.forEach((pt, index) => {
      const cleanNip = pt.nip.trim();
      const cleanNama = pt.nama.trim();

      if (!cleanNip || !cleanNama) {
        skipCount++;
        return;
      }

      // Check duplicates in global state & local batch
      const isAlreadyExist = teachers.some(t => t.nip === cleanNip);
      const isDuplicateInBatch = newTeachersBatch.some(t => t.nip === cleanNip);

      if (isAlreadyExist || isDuplicateInBatch) {
        skipCount++;
        return;
      }

      const randomAvatar = PRESET_AVATARS[index % PRESET_AVATARS.length];

      newTeachersBatch.push({
        id: `teacher-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        nip: cleanNip,
        nama: cleanNama,
        jabatan: pt.jabatan,
        email: pt.email,
        sisaCuti: pt.sisaCuti,
        fotoUrl: randomAvatar,
        password: pt.password,
        customAdded: true
      });
    });

    if (newTeachersBatch.length > 0) {
      onAddTeachers(newTeachersBatch);
      alert(`Berhasil mengimpor ${newTeachersBatch.length} guru sekaligus ke database.${skipCount > 0 ? ` (${skipCount} baris dilewati karena NIP duplikat / data tidak lengkap)` : ''}`);
    } else {
      alert(`Impor dibatalkan. Semua data (${skipCount} baris) dilewati karena NIP sudah terdaftar atau format kosong.`);
    }

    // Reset states
    setIsBulkUploadOpen(false);
    setParsedBulkTeachers([]);
    setBulkUploadError(null);
  };

  // Render Printer Invoice-Style popup for PDF printing
  const [isPrintLayoutOpen, setIsPrintLayoutOpen] = useState(false);

  return (
    <div id="admin-module" className="flex flex-col gap-6 text-gray-800">
      
      {/* Tab controls */}
      <div className="flex flex-wrap border-b border-gray-200">
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex-1 min-w-[120px] py-3 px-4 text-center font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
            activeTab === 'teachers'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-750'
          }`}
        >
          👤 Kelola Data Guru & Staf ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('geofence')}
          className={`flex-1 min-w-[120px] py-3 px-4 text-center font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
            activeTab === 'geofence'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-750'
          }`}
        >
          📍 Geofencing & Koordinat Sekolah
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 min-w-[120px] py-3 px-4 text-center font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
            activeTab === 'calendar'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-750'
          }`}
        >
          📅 Kalender & Jam Fleksibel
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 min-w-[120px] py-3 px-4 text-center font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
            activeTab === 'reports'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-750'
          }`}
        >
          🧾 Rekap Laporan & Export
        </button>
        <button
          onClick={() => setActiveTab('waBlast')}
          className={`flex-1 min-w-[120px] py-3 px-4 text-center font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
            activeTab === 'waBlast'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-750'
          }`}
        >
          📢 Siaran WA
        </button>
        <button
          onClick={() => setActiveTab('adminSettings')}
          className={`flex-1 min-w-[120px] py-3 px-4 text-center font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 ${
            activeTab === 'adminSettings'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-750'
          }`}
        >
          ⚙️ Pengaturan Admin
        </button>
      </div>

      {/* TAB 1: CRUD GURU DATABASE */}
      {activeTab === 'teachers' && (
        <div id="teachers-crud" className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-gray-150 pb-4 mb-4">
            <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wide">
              📋 DATABASE GURU & STAF SEKOLAH
            </h3>

            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              <button
                onClick={() => {
                  setBulkUploadError(null);
                  setParsedBulkTeachers([]);
                  setIsBulkUploadOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
              >
                <Upload className="w-4 h-4" /> Unggah Massal (CSV)
              </button>
              <button
                onClick={() => openForm()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" /> Tambah Guru / Staf Baru
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-4 w-full max-w-md">
            <span className="absolute left-3 top-2.5 text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari guru atau staf berdasarkan nama/NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 text-xs rounded-lg focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-600 focus:outline-none transition-all font-mono"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-mono font-bold uppercase tracking-wider">
                  <th className="p-3">Avatar</th>
                  <th className="p-3">NIP / NUPTK / Username</th>
                  <th className="p-3">Nama Lengkap (Guru/Staf)</th>
                  <th className="p-3">Jabatan / Posisi</th>
                  <th className="p-3">Kontak Email</th>
                  <th className="p-3 text-center">Sisa Cuti</th>
                  <th className="p-3 text-right">Aksi Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">
                      Nihil data guru terdeteksi dengan kata kunci tersebut.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                          <img
                            src={teacher.fotoUrl}
                            alt="Guru"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-gray-800">{teacher.nip}</td>
                      <td className="p-3 font-semibold text-slate-800">{teacher.nama}</td>
                      <td className="p-3 text-gray-600">{teacher.jabatan}</td>
                      <td className="p-3 text-gray-500 font-mono">{teacher.email}</td>
                      <td className="p-3 text-center">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 font-mono">
                          {teacher.sisaCuti} Hari
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openForm(teacher)}
                            className="p-1 px-2 border text-[10.5px] border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded transition-all flex items-center gap-1 font-bold"
                            title="Ubah info Guru"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: "Konfirmasi Hapus",
                                message: `Hapus data guru "${teacher.nama}" dari database sekolah? Tindakan ini tidak dapat dibatalkan.`,
                                onConfirm: () => onDeleteTeacher(teacher.id)
                              });
                            }}
                            className="p-1 px-2 border text-[10.5px] border-rose-200 hover:bg-rose-50 text-rose-700 rounded transition-all flex items-center gap-1 font-bold"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ADD / EDIT TEACHER MODAL FORM */}
          {isFormOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
                <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center text-gray-800">
                  <span className="text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 text-emerald-600">
                    <UserPlus className="w-4 h-4" /> {editingTeacher ? 'UBAH DATA GURU / STAF' : 'TAMBAH DATA GURU / STAF BARU'}
                  </span>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded-lg p-1.5 transition-colors"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleTeacherSubmit} className="p-6 flex flex-col gap-4">
                  {teacherError && (
                    <div className="bg-rose-50 border-l-4 border-red-500 p-2.5 text-xs text-red-700 rounded flex gap-1.5 items-start">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{teacherError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">NIP / NUPTK:</label>
                      <input
                        type="text"
                        placeholder="Numerik 18 digit"
                        value={formNip}
                        onChange={(e) => setFormNip(e.target.value.replace(/\D/g, ''))} // numbers only
                        disabled={!!editingTeacher}
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-emerald-500 font-mono disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">PASSWORD DAFTAR:</label>
                      <div className="relative">
                        <input
                          type={showTeacherFormPass ? "text" : "password"}
                          placeholder="Min 6 karakter"
                          value={formPass}
                          onChange={(e) => setFormPass(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded pl-2.5 pr-8 py-1.5 text-xs focus:outline-emerald-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTeacherFormPass(!showTeacherFormPass)}
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                          title={showTeacherFormPass ? "Sembunyikan password" : "Lihat password"}
                        >
                          {showTeacherFormPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">NAMA LENGKAP & GELAR:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Sri Wahyuningsih, S.Pd"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-emerald-500 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">JABATAN / POSISI:</label>
                      <select
                        value={formJabatan}
                        onChange={(e) => setFormJabatan(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold text-gray-800"
                      >
                        <option value="Guru Kelas">Guru Kelas</option>
                        <option value="Guru Kelas / Wali Kelas">Guru Kelas / Wali Kelas</option>
                        <option value="Guru Bidang Studi / Matematika">Guru Matematika</option>
                        <option value="Guru Bidang Studi / IPA">Guru IPA / Sains</option>
                        <option value="Guru Bidang Studi / IPS">Guru IPS / Sosial</option>
                        <option value="Guru Bidang Studi / Bahasa">Guru Bahasa</option>
                        <option value="Guru Bidang Studi / Olahraga">Guru PJOK / Olahraga</option>
                        <option value="Guru Bidang Studi / Agama">Guru Agama</option>
                        <option value="Guru Bidang Studi / Seni & Prakarya">Guru Seni & Prakarya</option>
                        <option value="Guru Bidang Studi / IPTEK & TIK">Guru Komputer / TIK</option>
                        <option value="Guru Bimbingan Konseling (BK)">Guru BK</option>
                        <option value="Kepala Tata Usaha (KTU)">Kepala Tata Usaha (KTU)</option>
                        <option value="Staf Tata Usaha (TU)">Staf Tata Usaha (TU)</option>
                        <option value="Bendahara Sekolah">Bendahara Sekolah</option>
                        <option value="Operator Sekolah / IT Support">Operator Sekolah / IT Support</option>
                        <option value="Staf Administrasi Sekolah">Staf Administrasi Sekolah</option>
                        <option value="Pustakawan">Pustakawan / Staf Perpustakaan</option>
                        <option value="Laboran / Teknisi">Laboran / Teknisi</option>
                        <option value="Petugas Keamanan / Security">Petugas Keamanan / Security</option>
                        <option value="Staf Kebersihan / Office Boy OB">Staf Kebersihan / Office Boy OB</option>
                        <option value="Penjaga Sekolah / Penjaga Malam">Penjaga Sekolah / Penjaga Malam</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">SISA CUTI TAHUNAN:</label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={formCuti}
                        onChange={(e) => setFormCuti(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">EMAIL RESMI SEKOLAH:</label>
                      <input
                        type="email"
                        placeholder="Contoh: guru@sekolah.sch.id"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">NO. WHATSAPP (Opsional):</label>
                      <input
                        type="text"
                        placeholder="Contoh: 081234567890"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Photo Profile / Avatar Section */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 block mb-1">FOTO PROFIL / AVATAR GURU & STAF:</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-3 rounded-xl border border-gray-150">
                      {/* Current Photo Preview */}
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-inner bg-slate-200 flex items-center justify-center">
                          {selectedAvatar ? (
                            <img 
                              src={selectedAvatar} 
                              alt="Teacher avatar" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          ) : (
                            <User className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <span className="absolute bottom-0 right-0 bg-emerald-600 text-white rounded-full p-1 border border-white shadow-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      </div>

                      {/* Photo Actions */}
                      <div className="flex-1 w-full space-y-2">
                        <div>
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-750 text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-95 shadow-2xs">
                            <Upload className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Unggah Foto Kustom</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (ev) => {
                                    if (ev.target?.result) {
                                      try {
                                        const base64Str = ev.target.result as string;
                                        const compressed = await compressImage(base64Str, 150, 150);
                                        setSelectedAvatar(compressed);
                                      } catch (err) {
                                        console.error("Gagal mengompresi gambar:", err);
                                      }
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Disarankan format persegi (.jpg/.png), ukuran maks 5MB. Foto akan dioptimalkan otomatis.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Preset Avatars */}
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase">Atau Pilih Preset Avatar Kartun:</span>
                      <div className="flex flex-wrap gap-2 items-center">
                        {PRESET_AVATARS.map((av, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedAvatar(av)}
                            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                              selectedAvatar === av ? 'border-emerald-600 scale-110 shadow-md ring-2 ring-emerald-500/10' : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300'
                            }`}
                          >
                            <img src={av} alt="Avatar preset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-150 pt-4 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="bg-white border hover:bg-slate-50 text-gray-700 text-xs font-bold py-2 px-4 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      Kirim & Simpan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* BULK TEACHER UPLOAD MODAL */}
          {isBulkUploadOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-250 flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center text-gray-800 shrink-0">
                  <span className="text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 text-indigo-700">
                    <Upload className="w-4 h-4 text-indigo-600" /> UNGGAH DATA GURU MASSAL (EXCEL / CSV)
                  </span>
                  <button
                    onClick={() => {
                      setIsBulkUploadOpen(false);
                      setParsedBulkTeachers([]);
                      setBulkUploadError(null);
                    }}
                    className="text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded-lg p-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                  
                  {/* Instructions Checklist & Download Template */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 leading-relaxed flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="font-bold mb-1 flex items-center gap-1 text-indigo-950">
                        💡 Panduan Format Impor Data:
                      </h4>
                      <ul className="list-disc list-inside space-y-0.5 text-indigo-850 font-medium">
                        <li>Kolom wajib: <strong className="text-indigo-950">NIP</strong> dan <strong className="text-indigo-950">Nama</strong> (Case-Insensitive).</li>
                        <li>Kolom opsional: <strong>Jabatan</strong>, <strong>Email</strong>, <strong>Sisa Cuti</strong>, <strong>Password</strong>, dan <strong>No WhatsApp</strong>.</li>
                        <li>Format file harus berakhiran <code className="bg-indigo-100 px-1 border border-indigo-200 rounded text-[11px] font-bold">.csv</code> (Nilai Terpisah Koma / Semicolon).</li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={downloadBulkTemplate}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Template CSV
                    </button>
                  </div>

                  {/* Drag-and-Drop / Browse File area */}
                  {parsedBulkTeachers.length === 0 ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px] ${
                        dragOver
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="p-3 bg-indigo-50 rounded-full text-indigo-600 mb-3 border border-indigo-100">
                        <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800">Tarik & Letakkan file CSV di sini</h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4">Atau klik untuk menjelajahi berkas komputer Anda</p>
                      
                      <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors shadow-xs">
                        Pilih Berkas CSV
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleBulkFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    // Parsed preview status
                    <div className="bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-850 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex p-1.5 bg-emerald-100 rounded-lg text-emerald-700 shrink-0">
                          <Check className="w-4 h-4 font-bold" />
                        </span>
                        <div>
                          <p className="font-bold text-emerald-900">Format file terbaca dengan sukses!</p>
                          <p className="text-[11px] text-emerald-600">Terdeteksi <strong className="font-mono">{parsedBulkTeachers.length} baris</strong> data guru siap diimpor.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setParsedBulkTeachers([]);
                          setBulkUploadError(null);
                        }}
                        className="text-[11px] font-bold text-rose-650 hover:text-rose-800 bg-white border border-slate-200 hover:bg-rose-50/50 px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Ganti File
                      </button>
                    </div>
                  )}

                  {/* Bulk parse error indicator */}
                  {bulkUploadError && (
                    <div className="bg-rose-50 border border-rose-100 p-3.5 text-xs text-rose-700 rounded-xl flex items-start gap-2.5 animate-pulse shrink-0">
                      <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold block">Gagal Membaca File:</span>
                        <span className="leading-relaxed mt-0.5 block text-rose-600">{bulkUploadError}</span>
                      </div>
                    </div>
                  )}

                  {/* Interactive parsed table preview */}
                  {parsedBulkTeachers.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                        👁️ PRATINJAU DATA GURU ({parsedBulkTeachers.length} Baris):
                      </span>
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                        <table className="w-full text-[11px] text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono font-bold uppercase tracking-wider text-[10px]">
                              <th className="p-2.5">NIP</th>
                              <th className="p-2.5">Nama</th>
                              <th className="p-2.5">Jabatan</th>
                              <th className="p-2.5">Email</th>
                              <th className="p-2.5 text-center">Cuti (Default: 12)</th>
                              <th className="p-2.5 font-mono">Password</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {parsedBulkTeachers.map((tch, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 font-mono font-bold text-slate-800">{tch.nip || <span className="text-rose-600 font-sans italic">Kosong</span>}</td>
                                <td className="p-2.5 font-semibold text-slate-800">{tch.nama || <span className="text-rose-600 italic">Kosong</span>}</td>
                                <td className="p-2.5 text-slate-600">{tch.jabatan}</td>
                                <td className="p-2.5 text-slate-500 font-mono">{tch.email}</td>
                                <td className="p-2.5 text-center font-mono">{tch.sisaCuti} Hari</td>
                                <td className="p-2.5 font-mono text-slate-400">{tch.password}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-slate-500 italic mt-1 bg-amber-50 border border-amber-100 p-2 rounded-lg">
                        ⚠️ <strong>Catatan Duplikasi:</strong> Jika ada NIP guru yang sudah ada dalam sistem atau duplikat dalam lembar file, sistem akan melewati baris tersebut secara otomatis untuk menjaga integritas data Anda.
                      </p>
                    </div>
                  )}

                </div>

                {/* Modal footer control panel */}
                <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkUploadOpen(false);
                      setParsedBulkTeachers([]);
                      setBulkUploadError(null);
                    }}
                    className="bg-white border border-gray-300 hover:bg-slate-50 text-gray-700 text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-colors active:scale-95"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmBulkImport}
                    disabled={parsedBulkTeachers.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 px-5 rounded-lg cursor-pointer transition-all active:scale-95"
                  >
                    Impor Sekarang ({parsedBulkTeachers.length} Guru)
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: GEOFENCE MAP ROUTING / CONFIG */}
      {activeTab === 'geofence' && (
        <div id="school-location-setup">
          <LocationSelector
            schoolConfig={schoolConfig}
            onChangeSchoolConfig={onUpdateSchoolConfig}
            simulatedUserLat={simulatedUserLat}
            simulatedUserLng={simulatedUserLng}
            onSimulatedLocationChange={onSimulatedLocationChange}
            isAdminMode={true} // Permits full latency adjusting
          />
        </div>
      )}

      {/* TAB 3: ATTENDANCE RECAP FILTER */}
      {activeTab === 'reports' && (
        <div id="reports-setup" className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-150 pb-4 mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wide">
                🧾 REKAPITULASI PELAPORAN PRESENSI GURU
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Saring, periksa, serta ekspor rekap absensi guru kedalam bentuk PDF / Excel.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
                title="Unduh dalam format CSV Excel"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download Excel (CSV)
              </button>
              <button
                onClick={() => setIsPrintLayoutOpen(true)}
                className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
                title="Buka Lembar PDF Cetak"
              >
                <Printer className="w-4 h-4" /> Cetak PDF Resmi
              </button>
            </div>
          </div>

          {/* Filtering Widget options */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">JENIS REKAP LAPORAN:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setReportType('harian')}
                  className={`py-1.5 px-3 rounded font-bold text-xs text-center transition-all ${
                    reportType === 'harian' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-gray-700 border hover:bg-gray-100'
                  }`}
                >
                  Roster Harian
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('bulanan')}
                  className={`py-1.5 px-3 rounded font-bold text-xs text-center transition-all ${
                    reportType === 'bulanan' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-gray-700 border hover:bg-gray-100'
                  }`}
                >
                  Roster Bulanan
                </button>
              </div>
            </div>

            {reportType === 'harian' ? (
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Saring Berdasarkan Tanggal:</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded text-xs px-2 py-1.5 font-mono focus:outline-emerald-500"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Saring Berdasarkan Bulan Akademik:</label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded text-xs px-2 py-1.5 font-mono focus:outline-emerald-500"
                />
              </div>
            )}

            <div className="flex items-end justify-start text-[11px] text-gray-500 italic pb-1">
              *Tabel di bawah memperbarui data secara dinamis berdasarkan parameter pilihan diatas.
            </div>
          </div>

          {/* SPECIAL SECTION: UNDUH LAPORAN REKAP BULANAN FORMAT DINAS */}
          <div className="bg-gradient-to-r from-emerald-50/80 to-indigo-50/80 border border-emerald-150 rounded-xl p-5 mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-xs">
            <div className="flex-1">
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                🏛️ DUKUNGAN SURAT DINAS RESMI
              </span>
              <h4 className="font-bold text-slate-800 text-xs mt-2 flex items-center gap-1.5 uppercase font-display tracking-wide">
                Unduh Laporan Rekap Bulanan (Format Excel / PDF Dinas)
              </h4>
              <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                Unduh lembar pertanggungjawaban kehadiran guru untuk periode bulan akademik <strong className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded">{filterMonth}</strong>. File ekspor secara otomatis dilengkapi dengan <strong>Kepala Surat (Kop Surat) Dinas Pendidikan Resmi</strong>, batas garis pimpinan, serta kolom tanda tangan Kepala Sekolah yang sah.
              </p>
            </div>
            <div className="flex flex-row sm:flex-nowrap gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={handleDownloadExcelDinas}
                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                title="Unduh Lembar Microsoft Excel (.CSV) dengan format template dinas resmi"
              >
                <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel Dinas
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportType('bulanan');
                  setIsPrintLayoutOpen(true);
                }}
                className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Unduh atau Cetak PDF Lembar Dinas yang rapi"
              >
                <Printer className="w-4 h-4" /> Cetak PDF Dinas
              </button>
            </div>
          </div>

          {/* SPECIAL SECTION 2: UNDUH FOTO SWAFOTO ABSENSI (ZIP) DENGAN PILIHAN BULAN BEBAS */}
          <div className="bg-gradient-to-r from-teal-55/60 to-emerald-55/60 border border-teal-200 rounded-xl p-5 mb-6 shadow-xs">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    📸 BACKUP LAMPIRAN SWAFOTO (SELFIE) GURU
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs mt-2 uppercase font-display tracking-wide">
                  Ekspor & Unduh Arsip Foto Presensi (ZIP)
                </h4>
                <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                  Ambil berkas autentikasi gambar swafoto <em>(Check-in & Check-out)</em> serta foto profil guru. Anda dapat mendownload seluruh waktu sekaligus, atau **memilih bulan akademik mana saja yang ingin Anda ekspor** menggunakan alat pemilih bulan di samping.
                </p>
              </div>

              {/* Selection Controls & Actions specifically for Photos */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full lg:w-auto self-stretch lg:self-auto shadow-xs">
                <div className="w-full sm:w-auto">
                  <label className="text-[10px] font-extrabold text-teal-800 block mb-1.5 uppercase tracking-wide">
                    📅 PILIH BULAN FOTO:
                  </label>
                  <input
                    type="month"
                    value={photoExportMonth}
                    onChange={(e) => setPhotoExportMonth(e.target.value)}
                    className="w-full sm:w-44 bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-700 focus:outline-emerald-500 cursor-pointer shadow-inner"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => handleDownloadAllPhotos(true, photoExportMonth)}
                    disabled={isZipping}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
                    title={`Unduh khusus foto presensi guru pada bulan ${getSelectedMonthLabel(photoExportMonth)}`}
                  >
                    {isZipping ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-100" />
                        <span>Mengepak ({zipProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <FileImage className="w-3.5 h-3.5 text-emerald-105" />
                        <span>Download Bulan Pilihan ({getSelectedMonthLabel(photoExportMonth)})</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadAllPhotos(false)}
                    disabled={isZipping}
                    className="flex-1 sm:flex-initial bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white font-bold text-xs py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
                    title="Unduh semua foto presensi & profil guru dari seluruh waktu"
                  >
                    {isZipping ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-100" />
                        <span>Mengepak ({zipProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <FileImage className="w-3.5 h-3.5 text-slate-105" />
                        <span>Semua Waktu (ZIP)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dinamically calculated summary table */}
          <div className="overflow-x-auto border rounded-xl bg-gray-50/20">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-500 font-mono font-bold uppercase tracking-wider">
                  <th className="p-3">NIP</th>
                  <th className="p-3">Nama Guru</th>
                  {reportType === 'bulanan' && <th className="p-3">Tanggal Absen</th>}
                  <th className="p-3 text-center">Check-In Terdaftar</th>
                  <th className="p-3 text-center">Check-Out Terdaftar</th>
                  <th className="p-3 text-center">Asosiasi GPS Jarak</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reportType === 'harian' ? (
                  // Harian roster of all teachers
                  teachers.map((teacher) => {
                    const foundLog = attendanceHistory.find(h => h.teacherId === teacher.id && h.date === filterDate);
                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-gray-700">{teacher.nip}</td>
                        <td className="p-3 font-semibold text-slate-800">{teacher.nama}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {foundLog?.checkInTime ? foundLog.checkInTime : '--:--:--'}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {foundLog?.checkOutTime ? foundLog.checkOutTime : '--:--:--'}
                        </td>
                        <td className="p-3 text-center font-mono text-gray-500">
                          {foundLog?.checkInDistanceMeters !== undefined ? `${foundLog.checkInDistanceMeters}m` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded font-mono ${
                              !foundLog || foundLog.status === 'Alpa'
                                ? 'bg-rose-100 text-rose-800'
                                : foundLog.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : foundLog.status === 'Terlambat'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {foundLog ? foundLog.status : 'Alpa (Belum Absen)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // Bulanan records matching filter month
                  (() => {
                    const [year, month] = filterMonth.split('-');
                    const monthlyFiltered = attendanceHistory.filter(h => h.date.startsWith(`${year}-${month}`));
                    if (monthlyFiltered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400">
                            Tidak ditemukan log bersangkutan pada bulan akademik terkait.
                          </td>
                        </tr>
                      );
                    }
                    return monthlyFiltered
                      .sort((a,b) => b.date.localeCompare(a.date))
                      .map((log) => {
                        const tr = teachers.find(t => t.id === log.teacherId);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-gray-500">{tr?.nip || 'Alpa'}</td>
                            <td className="p-3 font-semibold text-slate-800">{log.teacherName}</td>
                            <td className="p-3 font-mono font-semibold">{log.date}</td>
                            <td className="p-3 text-center font-mono">{log.checkInTime || '--:--:--'}</td>
                            <td className="p-3 text-center font-mono">{log.checkOutTime || '--:--:--'}</td>
                            <td className="p-3 text-center font-mono">{log.checkInDistanceMeters !== undefined ? `${log.checkInDistanceMeters}m` : '-'}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded font-mono ${
                                  log.status === 'Hadir'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.status === 'Terlambat'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORMAL ACADEMIC REPORT POPUP FOR PDF PRINT PREVIEW */}
      {isPrintLayoutOpen && (
        <div className="fixed inset-0 bg-neutral-900/90 z-50 overflow-y-auto p-4 md:p-8 flex items-start justify-center">
          <div className="bg-white max-w-4xl w-full text-black p-6 md:p-10 rounded-lg shadow-2xl flex flex-col gap-6 relative">
            
            {/* Control panel wrapper (hidden inside print) */}
            <div className="flex justify-between items-center bg-gray-100 rounded-lg p-3 -mx-6 -mt-10 mb-4 print:hidden text-gray-800">
              <span className="text-xs font-bold text-gray-700">Tampilan Pracetak PDF GuruPresence</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-3 rounded flex items-center gap-1 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Sekarang
                </button>
                <button
                  onClick={() => setIsPrintLayoutOpen(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs py-1.5 px-3 rounded transition-all"
                >
                  Tutup Roster
                </button>
              </div>
            </div>

            {/* FORMAL DOC HEADER */}
            <div className="text-center font-serif border-b-4 border-double border-black pb-4">
              <h1 className="text-xl md:text-2xl font-bold tracking-wide uppercase">DINAS PENDIDIKAN DAN KEBUDAYAAN KOTA</h1>
              <h2 className="text-lg md:text-xl font-bold tracking-normal uppercase mt-0.5">{schoolConfig.schoolName}</h2>
              <p className="text-xs italic mt-1 text-gray-600 font-sans">{schoolConfig.address}</p>
            </div>

            {/* Sub-Title */}
            <div className="text-center font-sans">
              <h3 className="text-sm font-bold tracking-wider underline uppercase">LAPORAN REKAPITULASI KEHADIRAN AKTIF</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Filter: {reportType === 'harian' ? `Harian (Tanggal ${filterDate})` : `Bulanan (Periode ${filterMonth})`}
              </p>
            </div>

            {/* Structured Table */}
            <table className="w-full text-[11px] text-left border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 border-b border-black">
                  <th className="border border-black p-2 font-bold font-mono">NIP</th>
                  <th className="border border-black p-2 font-bold font-sans">Nama Tenaga Pendidik</th>
                  {reportType === 'bulanan' && <th className="border border-black p-2 font-bold font-mono">Tanggal</th>}
                  <th className="border border-black p-2 text-center font-bold font-mono">Jam Masuk</th>
                  <th className="border border-black p-2 text-center font-bold font-mono">Jam Pulang</th>
                  <th className="border border-black p-2 text-center font-bold font-mono">Status Absens</th>
                </tr>
              </thead>
              <tbody>
                {reportType === 'harian' ? (
                  teachers.map((teacher, idx) => {
                    const foundLog = attendanceHistory.find(h => h.teacherId === teacher.id && h.date === filterDate);
                    return (
                      <tr key={idx} className="border-b border-black">
                        <td className="border border-black p-2 font-mono">{teacher.nip}</td>
                        <td className="border border-black p-2 font-bold">{teacher.nama}</td>
                        <td className="border border-black p-2 text-center font-mono">{foundLog?.checkInTime || '-'}</td>
                        <td className="border border-black p-2 text-center font-mono">{foundLog?.checkOutTime || '-'}</td>
                        <td className="border border-black p-2 text-center uppercase font-bold font-mono">{foundLog?.status || 'Alpa'}</td>
                      </tr>
                    );
                  })
                ) : (
                  (() => {
                    const [year, month] = filterMonth.split('-');
                    const monthlyFiltered = attendanceHistory.filter(h => h.date.startsWith(`${year}-${month}`));
                    if (monthlyFiltered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="border border-black p-4 text-center">Nihil data kehadiran.</td>
                        </tr>
                      );
                    }
                    return monthlyFiltered.map((log, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="border border-black p-2 font-mono">
                          {teachers.find(t => t.id === log.teacherId)?.nip || '-'}
                        </td>
                        <td className="border border-black p-2 font-bold">{log.teacherName}</td>
                        <td className="border border-black p-2 font-mono">{log.date}</td>
                        <td className="border border-black p-2 text-center font-mono">{log.checkInTime || '-'}</td>
                        <td className="border border-black p-2 text-center font-mono">{log.checkOutTime || '-'}</td>
                        <td className="border border-black p-2 text-center uppercase font-bold font-mono">{log.status}</td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>

            {/* DIGITAL SIGNATURE AREA */}
            <div className="flex justify-between items-stretch mt-10 text-xs font-sans">
              <div>
                <p>Operator Pengolah Data,</p>
                <div className="h-16"></div>
                <p className="font-bold underline">Operator Sekolah</p>
                <p className="text-[10px] text-gray-500 font-mono">GuruPresence Digital Sign</p>
              </div>
              
              <div className="text-right">
                <p>Kota Pendidikan, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p>Kepala Sekolah,</p>
                <div className="h-16"></div>
                <p className="font-bold underline">Drs. H. Bambang Hermawan, M.Si</p>
                <p className="text-[10px] text-gray-500 font-mono">NIP: 197508112002121001</p>
              </div>
            </div>

            <p className="text-[9px] text-gray-400 text-center font-mono italic mt-6 border-t pt-2 border-slate-100">
              *Dokumen resmi dikeluarkan secara otomatis oleh Aplikasi GuruPresence.
            </p>

          </div>
        </div>
      )}

      {/* TAB 4: SCHOOL CALENDAR & FLEXIBLE HOURS CONFIG */}
      {activeTab === 'calendar' && (
        <div id="school-calendar-setup" className="flex flex-col gap-6">
          
          {/* Section Introduction */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold font-display uppercase tracking-wider flex items-center gap-2">
              📅 KONTROL KALENDER SEKOLAH & JAM FLEXIBEL
            </h3>
            <p className="text-xs text-emerald-100/85 mt-2 max-w-3xl leading-relaxed">
              Modul ini memungkinkan Operator menetapkan hari libur resmi sekolah (bebas absen) serta mengatur dispensasi waktu masuk/pulang fleksibel untuk tanggal tertentu (seperti ujian, rapat pleno, atau KBM pendek bulan Ramadan).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMN 1: HARI LIBUR SEKOLAH (HOLIDAYS) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-5">
              <div>
                <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5 uppercase">
                  🎉 Hari Libur Sekolah Resmi
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Tanggal yang didaftarkan di bawah membebaskan guru dari kewajiban melakukan presensi.</p>
              </div>

              {/* Form Tambah Libur */}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newHolidayDate || !newHolidayName) return;
                const currentHolidays = schoolConfig.holidays || [];
                if (currentHolidays.some(h => h.date === newHolidayDate)) {
                  alert("Tanggal libur tersebut sudah didaftarkan.");
                  return;
                }
                const updatedHolidays = [
                  ...currentHolidays,
                  {
                    id: `holiday-${Date.now()}`,
                    date: newHolidayDate,
                    name: newHolidayName,
                    isActive: true
                  }
                ].sort((a, b) => a.date.localeCompare(b.date));

                onUpdateSchoolConfig({
                  ...schoolConfig,
                  holidays: updatedHolidays
                });
                setNewHolidayDate('');
                setNewHolidayName('');
              }} className="bg-slate-50 border border-gray-150 rounded-lg p-3.5 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono">Form Pendaftaran Hari Libur</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">TANGGAL LIBUR:</label>
                    <input 
                      type="date" 
                      required
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="w-full text-xs border border-gray-250 bg-white hover:bg-neutral-50 focus:bg-white rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">NAMA HARI LIBUR / CATATAN:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Libur Semester Ganjil"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="w-full text-xs border border-gray-250 bg-white hover:bg-neutral-50 focus:bg-white rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 mt-1 transition-all active:scale-95 cursor-pointer max-w-max self-end"
                >
                  <Calendar className="w-3.5 h-3.5" /> Tambah Hari Libur
                </button>
              </form>

              {/* List Hari Libur */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Daftar Libur Terjadwal</span>
                
                {(!schoolConfig.holidays || schoolConfig.holidays.length === 0) ? (
                  <div className="border border-dashed border-gray-200 text-center py-8 rounded-xl text-xs text-gray-400">
                    Belum ada tanggal libur yang didaftarkan.
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto border border-gray-150 rounded-xl divide-y divide-gray-100">
                    {schoolConfig.holidays.map((hol) => (
                      <div key={hol.id} className="p-3 hover:bg-neutral-50 transition-colors flex justify-between items-center bg-white">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-slate-800">{hol.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                            📅 {hol.date}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: "Konfirmasi Hapus",
                              message: `Hapus hari libur ${hol.name}?`,
                              onConfirm: () => {
                                const updatedHolidays = (schoolConfig.holidays || []).filter(h => h.id !== hol.id);
                                onUpdateSchoolConfig({
                                  ...schoolConfig,
                                  holidays: updatedHolidays
                                });
                              }
                            });
                          }}
                          className="hover:bg-red-50 p-1.5 rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Hapus Libur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: JAM KERJA FLEKSIBEL (SPECIAL SCHEDULES) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-5">
              <div>
                <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5 uppercase">
                  🕒 Jam Kerja Khusus & Fleksibel
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Sesuaikan batas jam masuk dan minimal jam pulang untuk tanggal khusus tertentu.</p>
              </div>

              {/* Form Tambah Jam Fleksibel */}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newFlexDate || !newFlexLabel || !newFlexStart || !newFlexEnd || !newFlexOut) return;
                const currentSchedules = schoolConfig.flexibleSchedules || [];
                if (currentSchedules.some(s => s.date === newFlexDate)) {
                  alert("Tanggal jadwal khusus tersebut sudah didaftarkan.");
                  return;
                }
                const updatedSchedules = [
                  ...currentSchedules,
                  {
                    id: `flex-${Date.now()}`,
                    date: newFlexDate,
                    label: newFlexLabel,
                    checkInStart: newFlexStart,
                    checkInEnd: newFlexEnd,
                    checkOutStart: newFlexOut
                  }
                ].sort((a, b) => a.date.localeCompare(b.date));

                onUpdateSchoolConfig({
                  ...schoolConfig,
                  flexibleSchedules: updatedSchedules
                });
                setNewFlexDate('');
                setNewFlexLabel('');
                setNewFlexStart('06:00');
                setNewFlexEnd('07:30');
                setNewFlexOut('14:00');
              }} className="bg-slate-50 border border-gray-150 rounded-lg p-3.5 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider font-mono">Atur Perubahan Jam Khusus</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">TANGGAL GUNA:</label>
                    <input 
                      type="date" 
                      required
                      value={newFlexDate}
                      onChange={(e) => setNewFlexDate(e.target.value)}
                      className="w-full text-xs border border-gray-250 bg-white hover:bg-neutral-50 focus:bg-white rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">ALASAN KONDISI (LABEL):</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ujian KBM Pendek"
                      value={newFlexLabel}
                      onChange={(e) => setNewFlexLabel(e.target.value)}
                      className="w-full text-xs border border-gray-250 bg-white hover:bg-neutral-50 focus:bg-white rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t pt-2 border-dashed border-gray-200">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 block mb-1">MULAI MASUK:</label>
                    <input 
                      type="time" 
                      required
                      value={newFlexStart}
                      onChange={(e) => setNewFlexStart(e.target.value)}
                      className="w-full text-xs border border-gray-250 bg-white rounded-lg px-2 py-1 flex items-center justify-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 block mb-1">BATAS TELAT:</label>
                    <input 
                      type="time" 
                      required
                      value={newFlexEnd}
                      onChange={(e) => setNewFlexEnd(e.target.value)}
                      className="w-full text-xs border border-gray-250 bg-white rounded-lg px-2 py-1 flex items-center justify-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 block mb-1">MULAI PULANG:</label>
                    <input 
                      type="time" 
                      required
                      value={newFlexOut}
                      onChange={(e) => setNewFlexOut(e.target.value)}
                      className="w-full text-xs border border-gray-250 bg-white rounded-lg px-2 py-1 flex items-center justify-center font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 mt-1 transition-all active:scale-95 cursor-pointer max-w-max self-end"
                >
                  <Clock className="w-3.5 h-3.5" /> Simpan Penyesuaian
                </button>
              </form>

              {/* List Jam Kerja Fleksibel */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Daftar Dispensasi Waktu Aktif</span>
                
                {(!schoolConfig.flexibleSchedules || schoolConfig.flexibleSchedules.length === 0) ? (
                  <div className="border border-dashed border-gray-200 text-center py-8 rounded-xl text-xs text-gray-400">
                    Belum ada pengaturan jam kerja fleksibel yang didaftarkan.
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto border border-gray-150 rounded-xl divide-y divide-gray-100">
                    {schoolConfig.flexibleSchedules.map((sched) => (
                      <div key={sched.id} className="p-3 hover:bg-neutral-50 transition-colors flex justify-between items-center bg-white">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{sched.label}</span>
                            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono px-1.5 py-0.5 rounded">
                              {sched.date}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                            <span>🕒 Masuk: {sched.checkInStart} - {sched.checkInEnd}</span>
                            <span>•</span>
                            <span>Pulang: Sekurangnya {sched.checkOutStart}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: "Konfirmasi Hapus",
                              message: `Hapus jadwal kerja khusus ${sched.label}?`,
                              onConfirm: () => {
                                const updatedSchedules = (schoolConfig.flexibleSchedules || []).filter(s => s.id !== sched.id);
                                onUpdateSchoolConfig({
                                  ...schoolConfig,
                                  flexibleSchedules: updatedSchedules
                                });
                              }
                            });
                          }}
                          className="hover:bg-red-50 p-1.5 rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Hapus Jadwal Khusus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB: WHATSAPP BLAST & BROADCAST */}
      {activeTab === 'waBlast' && (
        <div id="wablast-panel" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
          <div className="border-b border-gray-155 pb-4 mb-6">
            <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wide flex items-center gap-2">
              📢 SIARAN & NOTIFIKASI WHATSAPP
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Kirim pengumuman massal, pengingat jurnal guru, dan rekapitulasi harian kehadiran ke Kepala Sekolah.</p>
          </div>

          {!schoolConfig.whatsappConfig?.enabled && (
             <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-semibold flex items-center gap-3">
               <span className="text-xl">⚠️</span>
               Fitur WhatsApp API saat ini Nonaktif. Silakan aktifkan dan atur token provider di tab <b onClick={() => setActiveTab('adminSettings')} className="cursor-pointer underline hover:text-red-900">Pengaturan Admin</b>.
             </div>
          )}

          {waBroadcastStatus && (
            <div className={`mb-6 p-4 rounded-xl text-xs font-semibold flex items-center gap-3 border ${
              waBroadcastStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              waBroadcastStatus.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {waBroadcastStatus.loading && <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full flex-shrink-0" />}
              {!waBroadcastStatus.loading && <span className="text-base">{waBroadcastStatus.type === 'success' ? '✅' : '❌'}</span>}
              <span>{waBroadcastStatus.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Panel 1: Broadcast Custom */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-2 flex items-center gap-2">
                💬 PENGUMUMAN MASSAL (BROADCAST)
              </h4>
              <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">Pesan ini akan dikirimkan ke <b>semua Guru</b> yang nomor WhatsApp-nya terdaftar di sistem. Cocok untuk jadwal rapat, seragam, dll.</p>
              
              <textarea 
                value={waBroadcastMsg}
                onChange={(e) => setWaBroadcastMsg(e.target.value)}
                placeholder="Ketik isi pengumuman massal di sini..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-emerald-500 resize-none font-mono"
                disabled={waBroadcastStatus?.loading}
              />
              
              <button
                onClick={handleSendBroadcast}
                disabled={!waBroadcastMsg.trim() || waBroadcastStatus?.loading || !schoolConfig.whatsappConfig?.enabled}
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-all"
              >
                Kirim Siaran ke Semua Guru
              </button>
            </div>

            {/* Panel 2: Otomasi Laporan */}
            <div className="flex flex-col gap-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                <h4 className="text-xs font-bold text-orange-800 uppercase mb-2 flex items-center gap-2">
                  📝 PENGINGAT JURNAL MENGAJAR
                </h4>
                <p className="text-[11px] text-orange-700 mb-4 leading-relaxed">Kirim WA otomatis ke guru yang <b>sudah absen masuk hari ini</b> namun <b>belum mengisi jurnal agenda</b>.</p>
                <button
                  onClick={handleSendReminderJurnal}
                  disabled={waBroadcastStatus?.loading || !schoolConfig.whatsappConfig?.enabled}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-all"
                >
                  Kirim Pengingat Jurnal
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex-1">
                <h4 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-2">
                  📊 LAPORAN KEHADIRAN KEPSEK
                </h4>
                <p className="text-[11px] text-blue-700 mb-4 leading-relaxed">Kirim laporan rekap singkat presensi hari ini (Berapa Hadir, Terlambat, Absen) ke WhatsApp <b>Kepala Sekolah</b>.</p>
                <button
                  onClick={handleSendDailyRekap}
                  disabled={waBroadcastStatus?.loading || !schoolConfig.whatsappConfig?.enabled}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-all mt-auto"
                >
                  Kirim Rekap Hari Ini
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: ADMIN PROFILE AND CREDENTIALS SETTINGS */}
      {activeTab === 'adminSettings' && (
        <div id="admin-settings-panel" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-3xl mx-auto">
          <div className="border-b border-gray-155 pb-4 mb-6">
            <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wide flex items-center gap-2">
              ⚙️ PENGATURAN PROFIL & AKUN ADMINISTRATOR
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Ubah nama operator, username login, kata sandi, serta pas foto / avatar profil admin.</p>
          </div>

          {adminSaveSuccess && (
            <div className="mb-5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 font-semibold">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Perubahan informasi profil dan kredensial administrasi berhasil disimpan ke database!</span>
            </div>
          )}

          {adminSaveError && (
            <div className="mb-5 bg-rose-50 border border-rose-100 text-rose-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 font-semibold font-mono">
              <span className="text-rose-600 font-bold">!</span>
              <span>Gagal menyimpan data: {adminSaveError}</span>
            </div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            setAdminSaveSuccess(false);
            setAdminSaveError(null);

            if (!adminName.trim() || !adminNip.trim() || !adminPassword.trim()) {
              setAdminSaveError("Nama Admin, Username/NIP, dan Kata Sandi tidak boleh kosong.");
              return;
            }

            if (onUpdateAdminProfile) {
              onUpdateAdminProfile({
                nama: adminName.trim(),
                nip: adminNip.trim(),
                password: adminPassword.trim(),
                fotoUrl: adminAvatar
              });
              setAdminSaveSuccess(true);
              setTimeout(() => setAdminSaveSuccess(false), 5000);
            } else {
              setAdminSaveError("Handler sinkronisasi database tidak ditemukan.");
            }
          }} className="flex flex-col gap-6">

            {/* AVATAR SELECTOR SECTION */}
            <div className="flex flex-col md:flex-row gap-6 items-center border-b border-slate-100 pb-6">
              
              {/* CURRENT PHOTO PREVIEW */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Foto Aktif</span>
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-white shadow-md relative group bg-slate-50">
                  <img
                    src={adminAvatar}
                    alt="Pratinjau Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* SELECTION GRID AND FILE UPLOAD */}
              <div className="flex-grow flex flex-col gap-3">
                <label className="text-xs font-bold text-slate-700 block">PILIH FOTO PROFIL ATAU UNGGAH:</label>
                
                {/* Preset Options list */}
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_AVATARS.map((avUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAdminAvatar(avUrl)}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                        adminAvatar === avUrl ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-slate-200 opacity-80'
                      }`}
                    >
                      <img src={avUrl} className="w-full h-full object-cover" alt={`Avatar preset option ${i+1}`} referrerPolicy="no-referrer" />
                    </button>
                  ))}

                  {/* CUSTOM FILE UPLOAD TRIGGER */}
                  <label className="w-12 h-12 rounded-full border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-500 hover:text-slate-700 shrink-0" title="Unggah Pas Foto Kustom">
                    <Upload className="w-4 h-4" />
                    <span className="text-[8px] font-semibold mt-0.5 tracking-tighter">UPLOAD</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            if (reader.result) {
                              try {
                                const compressedStr = await compressImage(reader.result as string, 160, 160);
                                setAdminAvatar(compressedStr);
                              } catch (compressErr) {
                                console.error("Gagal melakukan kompresi foto admin:", compressErr);
                                setAdminAvatar(reader.result as string);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-gray-500">Anda dapat memilih salah satu foto preset di atas atau mengunggah pas foto kustom berformat PNG / JPG Anda sendiri.</p>
              </div>

            </div>

            {/* CREDENTIAL FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-gap-5">
              
              <div>
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Nama Lengkap Admin / Operator
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Contoh: Operator Sekolah Utama"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-emerald-500 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Username NIP Login (Pengenal)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <UserPlus className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={adminNip}
                    onChange={(e) => setAdminNip(e.target.value)}
                    placeholder="Contoh: admin"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-emerald-500 text-xs font-semibold font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Kata Sandi Baru (Kredensial Akses)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-400">
                    <Settings className="w-4 h-4" />
                  </span>
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan sandi kunci panel admin"
                    className="w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-xl focus:outline-emerald-500 text-xs font-semibold font-mono text-slate-800 tracking-wide"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-2.5 hover:bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded text-[10px] uppercase font-mono tracking-wider transition-all cursor-pointer"
                  >
                    {showAdminPassword ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Harap catat baik-baik kata sandi baru Anda untuk menghindari kendala kegagalan login administrator berikutnya.</p>
              </div>

            </div>

            {/* FORM OPERATIONS CONTROL PANEL */}
            <div className="border-t border-slate-100 pt-5 mt-2 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-2.5 px-6 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Simpan Konfigurasi Profil
              </button>
            </div>

          </form>

          {/* WHATSAPP INTEGRATION PANEL */}
          <div className="mt-10 border-t border-gray-200 pt-8">
            <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wide flex items-center gap-2 mb-1">
              💬 INTEGRASI NOTIFIKASI WHATSAPP PENGESAHAN
            </h3>
            <p className="text-xs text-gray-500 mb-5">Aktifkan modul API pihak ketiga untuk mengirim notifikasi persetujuan cuti kepada Kepala Sekolah dan pemberitahuan hasil akhir kepada Guru.</p>

            {waSaveSuccess && (
              <div className="mb-5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 font-semibold">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Konfigurasi API WhatsApp berhasil disimpan ke sistem!</span>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              setWaSaveSuccess(false);

              onUpdateSchoolConfig({
                ...schoolConfig,
                whatsappConfig: {
                  enabled: waEnabled,
                  provider: waProvider,
                  apiKey: waApiKey,
                  kepsekPhone: waKepsekPhone,
                }
              });

              setWaSaveSuccess(true);
              setTimeout(() => setWaSaveSuccess(false), 5000);
            }} className="flex flex-col gap-4">
              
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="waEnabled"
                  checked={waEnabled}
                  onChange={(e) => setWaEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="waEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Aktifkan Layanan Notifikasi Background via WhatsApp
                </label>
              </div>

              {waEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Penyedia / Provider API
                    </label>
                    <select
                      value={waProvider}
                      onChange={(e) => setWaProvider(e.target.value as 'fonnte' | 'wablas')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-emerald-500 text-xs font-semibold text-slate-800"
                    >
                      <option value="fonnte">Fonnte API (Rekomendasi)</option>
                      <option value="wablas">Wablas API</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      API Token / Authorization Key
                    </label>
                    <input
                      type="text"
                      value={waApiKey}
                      onChange={(e) => setWaApiKey(e.target.value)}
                      placeholder="Masukkan Token dari Provider"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-emerald-500 text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Nomor WhatsApp Kepala Sekolah (Tujuan Cuti)
                    </label>
                    <input
                      type="text"
                      value={waKepsekPhone}
                      onChange={(e) => setWaKepsekPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-emerald-500 text-xs font-mono text-slate-800"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Nomor ini akan menerima pesan ringkasan rincian apabila ada pengajuan izin cuti masuk dari barisan Guru.</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs py-2.5 px-6 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  Simpan Sistem Integrasi API
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* GLOBAL CONFIRMATION MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2 text-rose-800">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-bold font-display uppercase tracking-wider">{confirmDialog.title}</span>
            </div>
            <div className="p-5 text-gray-700 text-sm">
              {confirmDialog.message}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
              <button
                type="button"
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
