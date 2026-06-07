import { Teacher, AttendanceRecord, LeaveRequest, SchoolConfig, AppNotification, TeacherJournal } from './types';

// Initial Preset Teachers (Emptied as requested)
export const PRESET_TEACHERS: Teacher[] = [];

export const PRESET_KEPSEK: Teacher = {
  id: 'kepsek1',
  nip: '197508112002121001',
  nama: 'Drs. H. Bambang Hermawan, M.Si',
  jabatan: 'Kepala Sekolah',
  email: 'bambang.hermawan@sekolah.sch.id',
  sisaCuti: 12,
  fotoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=120',
  password: 'kepsek123'
};

export const PRESET_ADMIN = {
  nip: 'admin',
  nama: 'Operator Utama / Admin',
  fotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
  password: 'admin'
};

// Default School Center Configuration
// Configured close to normal Indonesian schools (e.g., SMPN 1 Jakarta or standard coords)
export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'SMP Negeri 1 Merdeka',
  address: 'Jl. Pemuda No. 10, Kota Pendidikan, Indonesia',
  lat: -6.2100, // Central Jakarta area coordinate
  lng: 106.8450,
  radiusMeters: 100, // Allowed geofence perimeter
  checkInStart: '06:00',
  checkInEnd: '07:30', // In-time; past this is Terlambat
  checkOutStart: '14:00',
  holidays: [
    { id: 'h1', date: '2026-06-01', name: 'Hari Lahir Pancasila', isActive: true },
    { id: 'h2', date: '2026-08-17', name: 'Hari Kemerdekaan RI', isActive: true },
    { id: 'h3', date: '2026-12-25', name: 'Hari Raya Natal', isActive: true }
  ],
  flexibleSchedules: []
};

// Realistic Attendance History Seed (Emptied as requested)
export const PRESET_ATTENDANCE: AttendanceRecord[] = [];

// Seeded Leave Requests (Emptied as requested)
export const PRESET_LEAVE_REQUESTS: LeaveRequest[] = [];

// Seeding standard system notifications (Emptied as requested)
export const PRESET_NOTIFICATIONS: AppNotification[] = [];

// Realistic Preset Teaching Journals (Emptied as requested)
export const PRESET_JOURNALS: TeacherJournal[] = [];
