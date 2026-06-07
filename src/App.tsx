import React, { useState, useEffect } from 'react';
import {
  School,
  LogOut,
  Bell,
  ShieldCheck,
  UserCheck,
  Info,
  Calendar,
  Sparkles,
  ChevronDown,
  Navigation,
  BookOpen,
  Check,
  X,
  Compass
} from 'lucide-react';
import { Teacher, AttendanceRecord, LeaveRequest, SchoolConfig, AppNotification, TeacherJournal } from './types';
import {
  PRESET_TEACHERS,
  PRESET_KEPSEK,
  PRESET_ADMIN,
  DEFAULT_SCHOOL_CONFIG,
  PRESET_ATTENDANCE,
  PRESET_LEAVE_REQUESTS,
  PRESET_NOTIFICATIONS,
  PRESET_JOURNALS
} from './data';

import LoginScreen from './components/LoginScreen';
import GuruDashboard from './components/GuruDashboard';
import KepsekDashboard from './components/KepsekDashboard';
import AdminDashboard from './components/AdminDashboard';

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { sendWhatsappMessage } from './lib/whatsapp';

export default function App() {
  // Authentication states
  const [userRole, setUserRole] = useState<'admin' | 'kepsek' | 'guru' | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [adminProfile, setAdminProfile] = useState<any>(PRESET_ADMIN);
  const [kepsekProfile, setKepsekProfile] = useState<any>(PRESET_KEPSEK);

  // Database core states loaded from Firestore real-time snapshot engines
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(DEFAULT_SCHOOL_CONFIG);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [journals, setJournals] = useState<TeacherJournal[]>([]);

  // Real-time synchronization of currently logged-in admin / kepsek details when modified
  useEffect(() => {
    if (userRole === 'admin' && adminProfile) {
      setCurrentUser(adminProfile);
    } else if (userRole === 'kepsek' && kepsekProfile) {
      setCurrentUser(kepsekProfile);
    }
  }, [adminProfile, kepsekProfile, userRole]);

  // Real-time synchronization of currently logged-in teacher details when updated in database
  useEffect(() => {
    if (userRole === 'guru' && currentUser) {
      const matched = teachers.find(t => t.id === currentUser.id);
      if (matched && JSON.stringify(matched) !== JSON.stringify(currentUser)) {
        setCurrentUser(matched);
      }
    }
  }, [teachers, userRole, currentUser]);

  // Live device GPS coordinate trackers (Initially set to matching school center as fallback)
  const [simulatedUserLat, setSimulatedUserLat] = useState<number>(DEFAULT_SCHOOL_CONFIG.lat);
  const [simulatedUserLng, setSimulatedUserLng] = useState<number>(DEFAULT_SCHOOL_CONFIG.lng);
  const isDemoMode = false;

  // React Active Geolocation Senders (Continuous Hardware GPS Watcher)
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    // Acquire immediate coordinate snapshot
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSimulatedUserLat(pos.coords.latitude);
        setSimulatedUserLng(pos.coords.longitude);
      },
      (err) => console.warn("Pencarian lokasi GPS awal gagal:", err),
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // Watch position adjustments continuously to keep GPS exact
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setSimulatedUserLat(position.coords.latitude);
        setSimulatedUserLng(position.coords.longitude);
      },
      (err) => console.warn("Pembaruan GPS real-time diblokir atau gagal:", err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // UI state controllers
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isQuickUserSwapOpen, setIsQuickUserSwapOpen] = useState(false);

  // Initial Real-time Database Sync Loader
  useEffect(() => {
    // 1. School Settings
    const unsubSchool = onSnapshot(doc(db, 'config', 'school'), async (documentSnapshot) => {
      try {
        if (!documentSnapshot.exists()) {
          await setDoc(doc(db, 'config', 'school'), DEFAULT_SCHOOL_CONFIG);
        } else {
          const data = documentSnapshot.data() as SchoolConfig;
          setSchoolConfig(data);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'config/school');
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'config/school'));

    // 1b. Admin Settings
    const unsubAdmin = onSnapshot(doc(db, 'config', 'admin'), async (documentSnapshot) => {
      try {
        if (!documentSnapshot.exists()) {
          await setDoc(doc(db, 'config', 'admin'), PRESET_ADMIN);
        } else {
          const data = documentSnapshot.data();
          setAdminProfile(data);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'config/admin');
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'config/admin'));

    // 1c. Kepsek Settings
    const unsubKepsek = onSnapshot(doc(db, 'config', 'kepsek'), async (documentSnapshot) => {
      try {
        if (!documentSnapshot.exists()) {
          await setDoc(doc(db, 'config', 'kepsek'), PRESET_KEPSEK);
        } else {
          const data = documentSnapshot.data();
          setKepsekProfile(data);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'config/kepsek');
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'config/kepsek'));

    // 2. Teachers
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), async (snapshot) => {
      try {
        if (snapshot.empty) {
          // Bulk seed preset teachers
          for (const teacher of PRESET_TEACHERS) {
            await setDoc(doc(db, 'teachers', teacher.id), teacher);
          }
        } else {
          const list: Teacher[] = [];
          for (const d of snapshot.docs) {
            const data = d.data() as Teacher;
            if (!data.customAdded) {
              // Automatically delete legacy mock/simulation teachers from Firestore to keep database pure
              await deleteDoc(doc(db, 'teachers', data.id));
            } else {
              list.push(data);
            }
          }
          setTeachers(list);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'teachers');
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'teachers'));

    // 3. Attendance History
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), async (snapshot) => {
      try {
        if (snapshot.empty) {
          // Bulk seed preset attendance records
          for (const att of PRESET_ATTENDANCE) {
            await setDoc(doc(db, 'attendance', att.id), att);
          }
        } else {
          const list: AttendanceRecord[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as AttendanceRecord);
          });
          // Sort chronicle
          list.sort((a, b) => {
            const compDate = b.date.localeCompare(a.date);
            if (compDate !== 0) return compDate;
            const timeA = a.checkInTime || '';
            const timeB = b.checkInTime || '';
            return timeB.localeCompare(timeA);
          });
          setAttendanceHistory(list);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'attendance');
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));

    // 4. Leave Requests
    const unsubLeaves = onSnapshot(collection(db, 'leaves'), async (snapshot) => {
      try {
        if (snapshot.empty) {
          // Bulk seed preset leave requests
          for (const leave of PRESET_LEAVE_REQUESTS) {
            await setDoc(doc(db, 'leaves', leave.id), leave);
          }
        } else {
          const list: LeaveRequest[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as LeaveRequest);
          });
          // Sort by timestamp desc
          list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setLeaveRequests(list);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'leaves');
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'leaves'));

    // 5. Notifications
    const unsubNotifs = onSnapshot(collection(db, 'notifications'), async (snapshot) => {
      try {
        if (snapshot.empty) {
          // Bulk seed notifications
          for (const notif of PRESET_NOTIFICATIONS) {
            await setDoc(doc(db, 'notifications', notif.id), notif);
          }
        } else {
          const list: AppNotification[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as AppNotification);
          });
          // Sort by timestamp desc
          list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setNotifications(list);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    // 6. Teaching Journals
    const unsubJournals = onSnapshot(collection(db, 'journals'), async (snapshot) => {
      try {
        if (snapshot.empty) {
          for (const journal of PRESET_JOURNALS) {
            await setDoc(doc(db, 'journals', journal.id), journal);
          }
        } else {
          const list: TeacherJournal[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as TeacherJournal);
          });
          // Sort by timestamp desc
          list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setJournals(list);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'journals');
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'journals'));

    return () => {
      unsubSchool();
      unsubAdmin();
      unsubKepsek();
      unsubTeachers();
      unsubAttendance();
      unsubLeaves();
      unsubNotifs();
      unsubJournals();
    };
  }, []);

  // Auth logins handler
  const handleLoginSuccess = (role: 'admin' | 'kepsek' | 'guru', userObj: any) => {
    setUserRole(role);
    setCurrentUser(userObj);
    setIsQuickUserSwapOpen(false);

    // If teacher logging in, sync GPS to school center initially so they are within range
    if (role === 'guru') {
      setSimulatedUserLat(schoolConfig.lat);
      setSimulatedUserLng(schoolConfig.lng);
    }
  };

  // Auth logouts handler
  const handleLogout = () => {
    setUserRole(null);
    setCurrentUser(null);
    setIsNotifDropdownOpen(false);
    setIsQuickUserSwapOpen(false);
  };

  // Notifications clear
  const handleClearNotifications = async () => {
    try {
      for (const n of notifications) {
        if (!n.isRead) {
          await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  };

  // 1. ADD NEW ATTENDANCE RECORD (CHECK-IN)
  const handleAddAttendance = async (record: AttendanceRecord) => {
    try {
      await setDoc(doc(db, 'attendance', record.id), record);

      // Trigger WA if late
      if (record.status === 'Terlambat' && schoolConfig.whatsappConfig?.enabled) {
        const teacherObj = teachers.find(t => t.id === record.teacherId);
        if (teacherObj && teacherObj.phone) {
          const waMsg = `*PERINGATAN KETERLAMBATAN* ⏰\n\nBapak/Ibu ${record.teacherName}, Anda tercatat absen masuk pada pukul ${record.checkInTime} WIB. Status Anda *Terlambat*.\n\nHarap diusahakan hadir tepat waktu kedepannya.`;
          sendWhatsappMessage(teacherObj.phone, waMsg, schoolConfig.whatsappConfig).catch(console.error);
        }
      }

      // Fire notifications trigger
      const newNotif: AppNotification = {
        id: `notif-run-${Date.now()}`,
        title: 'Absensi Masuk Baru',
        message: `${record.teacherName} telah melakukan absensi masuk pukul ${record.checkInTime} WIB.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'info'
      };
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'attendance');
    }
  };

  // 2. UPDATE ATTENDANCE RECORD (CHECK-OUT)
  const handleUpdateAttendance = async (updatedRecord: AttendanceRecord) => {
    try {
      await setDoc(doc(db, 'attendance', updatedRecord.id), updatedRecord);

      // Notification alert to principal
      const newNotif: AppNotification = {
        id: `notif-run-${Date.now()}`,
        title: 'Absensi Pulang Baru',
        message: `${updatedRecord.teacherName} telah melakukan absensi pulang pukul ${updatedRecord.checkOutTime} WIB.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'success'
      };
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'attendance');
    }
  };

  // 3. SUBMIT NEW LEAVE REQUEST
  const handleAddLeaveRequest = async (leave: LeaveRequest) => {
    try {
      await setDoc(doc(db, 'leaves', leave.id), leave);

      // Fire notification alert to Kepsek dashboard
      const newNotif: AppNotification = {
        id: `notif-run-${Date.now()}`,
        title: 'Pengajuan Cuti / Izin Baru',
        message: `${leave.teacherName} mengajukan permohonan ${leave.type} untuk tanggal ${leave.startDate}.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'request'
      };
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);

      // Trigger Background WhatsApp Notification to Kepsek
      if (schoolConfig.whatsappConfig?.enabled && schoolConfig.whatsappConfig.kepsekPhone) {
        const waMsg = `*PENGAJUAN IZIN/CUTI BARU* 📝\n\nNama: ${leave.teacherName}\nJenis: ${leave.type}\nMulai: ${leave.startDate}\nSampai: ${leave.endDate}\nAlasan: ${leave.reason}\n\nSilakan cek aplikasi untuk menyetujui/menolak.`;
        sendWhatsappMessage(schoolConfig.whatsappConfig.kepsekPhone, waMsg, schoolConfig.whatsappConfig).catch(console.error);
      }

    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'leaves');
    }
  };

  // 4. KEPSEK PERSERUJUAN DECISION HANDLER (APPROVE / REJECT)
  const handleApproveLeave = async (leaveId: string, isApproved: boolean, comments?: string) => {
    try {
      const leaveItem = leaveRequests.find(l => l.id === leaveId);
      if (!leaveItem) return;

      // A. Update Leave Item Status
      await updateDoc(doc(db, 'leaves', leaveId), {
        status: isApproved ? 'Approved' : 'Rejected',
        comments: comments || ''
      });

      // B. Subtract Teacher's Sisa Cuti if approved and type is 'Cuti Tahunan'
      if (isApproved && leaveItem.type === 'Cuti Tahunan') {
        const start = new Date(leaveItem.startDate);
        const end = new Date(leaveItem.endDate);
        const lengthDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const teacherObj = teachers.find(t => t.id === leaveItem.teacherId);
        if (teacherObj) {
          await updateDoc(doc(db, 'teachers', leaveItem.teacherId), {
            sisaCuti: Math.max(0, teacherObj.sisaCuti - lengthDays)
          });
        }
      }

      // C. If approved, Auto fill today/leave-range dates as Sick/Izin in daily attendance history
      if (isApproved) {
        const start = new Date(leaveItem.startDate);
        const end = new Date(leaveItem.endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          const existing = attendanceHistory.some(h => h.teacherId === leaveItem.teacherId && h.date === dateStr);
          if (!existing) {
            const autoId = `att-auto-leave-${Date.now()}-${dateStr}`;
            await setDoc(doc(db, 'attendance', autoId), {
              id: autoId,
              teacherId: leaveItem.teacherId,
              teacherName: leaveItem.teacherName,
              date: dateStr,
              status: leaveItem.type as any,
              isVerified: true
            });
          }
        }
      }

      // D. Raise custom decision notification
      const newNotif: AppNotification = {
        id: `notif-run-${Date.now()}`,
        title: isApproved ? 'Permohonan Cuti Disetujui' : 'Permohonan Cuti Ditolak',
        message: `Permohonan ${leaveItem.type} Anda (${leaveItem.startDate}) telah ${
          isApproved ? 'disetujui' : 'ditolak'
        } oleh Kepala Sekolah.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: isApproved ? 'success' : 'warning'
      };
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);

      // E. Trigger WhatsApp Decision to Teacher
      if (schoolConfig.whatsappConfig?.enabled) {
        const teacherObj = teachers.find(t => t.id === leaveItem.teacherId);
        if (teacherObj && teacherObj.phone) {
          const waMsg = `*INFO IZIN/CUTI GURU* 🔔\n\nPermohonan ${leaveItem.type} pada tanggal ${leaveItem.startDate} telah *${isApproved ? 'DISETUJUI ✅' : 'DITOLAK ❌'}* oleh Kepala Sekolah.\n\nCatatan Kepsek: ${comments || '-'}`;
          sendWhatsappMessage(teacherObj.phone, waMsg, schoolConfig.whatsappConfig).catch(console.error);
        }
      }

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'leaves');
    }
  };

  // 4b. TEACHER JOURNAL HANDLERS
  const handleAddJournal = async (journal: TeacherJournal) => {
    try {
      await setDoc(doc(db, 'journals', journal.id), journal);

      const newNotif: AppNotification = {
        id: `notif-run-${Date.now()}`,
        title: 'Jurnal Mengajar Baru',
        message: `${journal.teacherName} telah mengisi jurnal harian untuk kelas ${journal.kelas} (${journal.mataPelajaran}).`,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'info'
      };
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'journals');
    }
  };

  const handleUpdateJournal = async (updated: TeacherJournal) => {
    try {
      await setDoc(doc(db, 'journals', updated.id), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'journals');
    }
  };

  const handleDeleteJournal = async (journalId: string) => {
    try {
      await deleteDoc(doc(db, 'journals', journalId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'journals');
    }
  };

  // 5. ADMIN CRUDS HANDLERS
  const handleAddTeacher = async (newTeacher: Teacher) => {
    try {
      await setDoc(doc(db, 'teachers', newTeacher.id), newTeacher);

      // Push system notification
      const newNotif: AppNotification = {
        id: `notif-run-${Date.now()}`,
        title: 'Guru Baru Terdaftar',
        message: `Data guru baru ${newTeacher.nama} dengan NIP ${newTeacher.nip} telah ditambahkan ke database sekolah.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'success'
      };
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'teachers');
    }
  };

  const handleAddTeachers = async (newTeachers: Teacher[]) => {
    try {
      for (const t of newTeachers) {
        await setDoc(doc(db, 'teachers', t.id), t);
      }

      // Push system notification for bulk excel/csv upload
      const newNotif: AppNotification = {
        id: `notif-run-${Date.now()}`,
        title: 'Unggah Guru Massal Sukses',
        message: `Sebanyak ${newTeachers.length} guru berhasil ditambahkan sekaligus ke database sekolah via Excel/CSV.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'success'
      };
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'teachers');
    }
  };

  const handleUpdateTeacher = async (updatedTeacher: Teacher) => {
    try {
      await setDoc(doc(db, 'teachers', updatedTeacher.id), updatedTeacher);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teachers');
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await deleteDoc(doc(db, 'teachers', teacherId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'teachers');
    }
  };

  const handleClearAllData = async () => {
    try {
      for (const t of teachers) {
        await deleteDoc(doc(db, 'teachers', t.id));
      }
      for (const att of attendanceHistory) {
        await deleteDoc(doc(db, 'attendance', att.id));
      }
      for (const leave of leaveRequests) {
        await deleteDoc(doc(db, 'leaves', leave.id));
      }
      for (const notif of notifications) {
        await deleteDoc(doc(db, 'notifications', notif.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'bulk_clear');
    }
  };

  // ADMIN UPDATE SCHOOL CONFIG
  const handleUpdateSchoolConfig = async (newConfig: SchoolConfig) => {
    try {
      await setDoc(doc(db, 'config', 'school'), newConfig);

      const newNotif: AppNotification = {
        id: `notif-run-${Date.now()}`,
        title: 'Geofencing Diperbarui',
        message: `Pusat koordinat dan radius geofence sekolah berhasil diubah oleh Admin.`,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'warning'
      };
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/school');
    }
  };

  // ADMIN UPDATE ADMIN PROFILE
  const handleUpdateAdminProfile = async (newProfile: any) => {
    try {
      await setDoc(doc(db, 'config', 'admin'), newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/admin');
    }
  };

  // KEPSEK UPDATE PROFILE
  const handleUpdateKepsekProfile = async (newProfile: any) => {
    try {
      await setDoc(doc(db, 'config', 'kepsek'), newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/kepsek');
    }
  };

  // Unread notification badge count
  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center pb-12 antialiased">
      
      {/* DYNAMIC PORTAL HEADER WITH ACCENTS */}
      <header className="w-full bg-white border-b border-gray-200 py-3.5 px-4 md:px-8 shadow-xs flex items-center justify-between sticky top-0 z-30 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-gray-150 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {schoolConfig.logoData ? (
              <img src={schoolConfig.logoData} alt="School Logo" className="max-w-full max-h-full object-contain p-1" />
            ) : (
              <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white">
                <School className="w-5 h-5" />
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display font-black text-xl tracking-tight text-gray-950">GuruPresence</h1>
            <p className="text-[9.5px] font-mono text-emerald-700 tracking-wider font-extrabold uppercase -mt-0.5">Aplikasi Presensi Guru & Staf Digital</p>
          </div>
        </div>

        {userRole && (
          <div className="flex items-center gap-4">
            
            {/* Real-time Hardware GPS Position Tracker (Float indicator) */}
            {userRole === 'guru' && (
              <div className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-800 font-semibold font-mono">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>Lokasi Anda (GPS): {simulatedUserLat.toFixed(5)}, {simulatedUserLng.toFixed(5)}</span>
              </div>
            )}



            {/* User Logged Info */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 border rounded-xl pl-2 px-3 py-1">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300">
                <img
                  src={currentUser?.fotoUrl}
                  alt={currentUser?.nama}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-left font-sans">
                <span className="text-xs font-bold text-gray-800 block truncate max-w-[120px]">{currentUser?.nama?.split(',')[0]}</span>
                <span className="text-[9.5px] text-gray-500 font-mono uppercase font-bold text-emerald-800 block tracking-wider -mt-0.5">{userRole.toUpperCase()}</span>
              </div>
            </div>

            {/* Logout Trigger button */}
            <button
               onClick={handleLogout}
               className="p-2 border border-rose-250 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors flex items-center justify-center"
               title="Log keluar sistem"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </header>

       {/* MAIN CONTAINER PANEL */}
      <main className="w-full max-w-6xl px-4 md:px-8 mt-6 flex-grow flex flex-col">
        {!userRole ? (
          <LoginScreen
            teachers={teachers}
            schoolConfig={schoolConfig}
            adminProfile={adminProfile}
            kepsekProfile={kepsekProfile}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <div className="w-full">
            {/* Guru Dashboard screen */}
            {userRole === 'guru' && currentUser && (
              <GuruDashboard
                currentTeacher={currentUser}
                attendanceHistory={attendanceHistory}
                leaveRequests={leaveRequests}
                schoolConfig={schoolConfig}
                simulatedUserLat={simulatedUserLat}
                simulatedUserLng={simulatedUserLng}
                onSimulatedLocationChange={(lat, lng) => {
                  setSimulatedUserLat(lat);
                  setSimulatedUserLng(lng);
                }}
                onAddAttendance={handleAddAttendance}
                onUpdateAttendance={handleUpdateAttendance}
                onAddLeaveRequest={handleAddLeaveRequest}
                onUpdateTeacher={handleUpdateTeacher}
                journals={journals}
                onAddJournal={handleAddJournal}
              />
            )}

            {/* Kepsek Dashboard screen */}
            {userRole === 'kepsek' && currentUser && (
              <KepsekDashboard
                currentKepsek={currentUser}
                onUpdateKepsekProfile={handleUpdateKepsekProfile}
                teachers={teachers}
                attendanceHistory={attendanceHistory}
                leaveRequests={leaveRequests}
                onApproveLeave={handleApproveLeave}
                journals={journals}
                onUpdateJournal={handleUpdateJournal}
              />
            )}

            {/* Admin Dashboard screen */}
            {userRole === 'admin' && (
              <AdminDashboard
                teachers={teachers}
                attendanceHistory={attendanceHistory}
                journals={journals}
                schoolConfig={schoolConfig}
                onUpdateSchoolConfig={handleUpdateSchoolConfig}
                onAddTeacher={handleAddTeacher}
                onAddTeachers={handleAddTeachers}
                onUpdateTeacher={handleUpdateTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onClearAllData={handleClearAllData}
                simulatedUserLat={simulatedUserLat}
                simulatedUserLng={simulatedUserLng}
                onSimulatedLocationChange={(lat, lng) => {
                  setSimulatedUserLat(lat);
                  setSimulatedUserLng(lng);
                }}
                adminProfile={adminProfile}
                onUpdateAdminProfile={handleUpdateAdminProfile}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="mt-16 w-full text-center text-xs text-gray-400 font-mono border-t border-gray-200/60 pt-6">
        <p>© 2026 GuruPresence System ● Kemendikbud Digitalization Standard</p>
        <span className="text-[10px] text-gray-300 block mt-0.5">Secured with Camera Verification & Geofence Sensor System</span>
      </footer>

    </div>
  );
}
