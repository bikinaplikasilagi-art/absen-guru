/**
 * Types definition for GuruPresence (Aplikasi Absensi Guru Digital)
 */

export type UserRole = 'admin' | 'kepsek' | 'guru';

export interface Teacher {
  id: string;
  nip: string; // NIP or NUPTK
  nama: string;
  jabatan: string;
  email: string;
  phone?: string; // Optional WhatsApp Number
  sisaCuti: number;
  fotoUrl: string; // Base64 or Avatar SVG/URL
  password?: string;
  customAdded?: boolean;
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // HH:MM:SS
  checkInPhoto?: string; // Base64 representation
  checkInLocation?: { lat: number; lng: number };
  checkInDistanceMeters?: number;
  checkOutTime?: string; // HH:MM:SS
  checkOutPhoto?: string; // Base64 representation
  checkOutLocation?: { lat: number; lng: number };
  status: 'Hadir' | 'Terlambat' | 'Alpa' | 'Izin' | 'Sakit' | 'Dinas Luar' | 'Pelatihan';
  isVerified: boolean;
}

export interface LeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  type: 'Sakit' | 'Izin Pribadi' | 'Dinas Luar' | 'Pelatihan' | 'Cuti Tahunan';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  attachmentName?: string;
  attachmentData?: string; // Base64 representation of attached image/doc
  status: 'Pending' | 'Approved' | 'Rejected';
  comments?: string;
  timestamp: string;
}

export interface SchoolHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string; // Holiday label e.g., "Hari Raya Idul Fitri"
  isActive: boolean;
}

export interface FlexibleSchedule {
  id: string;
  date: string; // YYYY-MM-DD
  label: string; // e.g., "Rapat Guru", "Selesai Lebih Cepat"
  checkInStart: string; // HH:MM
  checkInEnd: string; // HH:MM
  checkOutStart: string; // HH:MM
}

export interface WhatsappConfig {
  enabled: boolean;
  apiKey: string;
  provider: 'fonnte' | 'wablas';
  kepsekPhone: string;
}

export interface SchoolConfig {
  schoolName: string;
  address: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  checkInStart: string; // e.g. "06:00"
  checkInEnd: string; // e.g. "07:30" (after this is late)
  checkOutStart: string; // e.g. "14:00"
  holidays?: SchoolHoliday[];
  flexibleSchedules?: FlexibleSchedule[];
  logoData?: string; // Base64 encoding of school logo icon
  whatsappConfig?: WhatsappConfig;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'request';
}

export interface TeacherJournal {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  kelas: string; // e.g. "X-A"
  mataPelajaran: string; // e.g. "Matematika"
  materiPokok: string; // e.g. "Aljabar"
  jamKe: string; // e.g. "1-2"
  jumlahSiswaHadir: number;
  jumlahSiswaAbsen: number;
  catatanSiswaAbsen?: string;
  hambatanDanSolusi?: string;
  feedbackKepsek?: string; // Optional feedback from Headmaster
  timestamp: string; // ISO String
}

