import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Info, Settings, ShieldAlert, CheckCircle, HelpCircle, RefreshCw, Image, Upload, X } from 'lucide-react';
import { SchoolConfig } from '../types';

interface LocationSelectorProps {
  schoolConfig: SchoolConfig;
  onChangeSchoolConfig?: (newVal: SchoolConfig) => void;
  // Shared simulation values
  simulatedUserLat: number;
  simulatedUserLng: number;
  onSimulatedLocationChange: (lat: number, lng: number) => void;
  isAdminMode?: boolean; // Admin can modify school coordinates / configurations
}

// Coordinate maths using Haversine formula
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export default function LocationSelector({
  schoolConfig,
  onChangeSchoolConfig,
  simulatedUserLat,
  simulatedUserLng,
  onSimulatedLocationChange,
  isAdminMode = false,
}: LocationSelectorProps) {
  // Distance in meters
  const distance = getHaversineDistance(
    schoolConfig.lat,
    schoolConfig.lng,
    simulatedUserLat,
    simulatedUserLng
  );

  const isInRange = distance <= schoolConfig.radiusMeters;

  // Manual GPS coords and school info edit
  const [tempSchoolName, setTempSchoolName] = useState<string>(schoolConfig.schoolName);
  const [tempAddress, setTempAddress] = useState<string>(schoolConfig.address || '');
  const [tempSchoolLat, setTempSchoolLat] = useState<string>(schoolConfig.lat.toString());
  const [tempSchoolLng, setTempSchoolLng] = useState<string>(schoolConfig.lng.toString());
  const [tempRadius, setTempRadius] = useState<number>(schoolConfig.radiusMeters);
  const [tempCheckInStart, setTempCheckInStart] = useState<string>(schoolConfig.checkInStart || '06:00');
  const [tempCheckInEnd, setTempCheckInEnd] = useState<string>(schoolConfig.checkInEnd || '07:30');
  const [tempCheckOutStart, setTempCheckOutStart] = useState<string>(schoolConfig.checkOutStart || '14:00');
  const [tempLogoData, setTempLogoData] = useState<string>(schoolConfig.logoData || '');

  // Auto Geolocate in production mode
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const triggerRealGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation tidak didukung oleh browser Anda.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSimulatedLocationChange(position.coords.latitude, position.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        console.warn("Gagal mendapatkan lokasi asli:", err);
        setGpsError("Izin lokasi diblokir atau sinyal lemah. Pastikan GPS aktif dan berikan izin.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    // Initial fetch of GPS coordinate snapshot when loaded
    triggerRealGPS();
  }, []);

  useEffect(() => {
    setTempSchoolName(schoolConfig.schoolName);
    setTempAddress(schoolConfig.address || '');
    setTempSchoolLat(schoolConfig.lat.toString());
    setTempSchoolLng(schoolConfig.lng.toString());
    setTempRadius(schoolConfig.radiusMeters);
    setTempCheckInStart(schoolConfig.checkInStart || '06:00');
    setTempCheckInEnd(schoolConfig.checkInEnd || '07:30');
    setTempCheckOutStart(schoolConfig.checkOutStart || '14:00');
    setTempLogoData(schoolConfig.logoData || '');
  }, [schoolConfig]);

  const handleUpdateSchoolConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSchoolName.trim()) {
      alert("Nama sekolah tidak boleh kosong!");
      return;
    }
    if (onChangeSchoolConfig) {
      onChangeSchoolConfig({
        schoolName: tempSchoolName.trim(),
        address: tempAddress.trim(),
        lat: parseFloat(tempSchoolLat) || -6.2100,
        lng: parseFloat(tempSchoolLng) || 106.8450,
        radiusMeters: tempRadius,
        checkInStart: tempCheckInStart,
        checkInEnd: tempCheckInEnd,
        checkOutStart: tempCheckOutStart,
        logoData: tempLogoData,
        holidays: schoolConfig.holidays || [],
        flexibleSchedules: schoolConfig.flexibleSchedules || []
      });
      alert("Profil dan Konfigurasi GPS sekolah berhasil disimpan!");
    }
  };

  // Convert coordinate displacements into a small visual container's percentage to render an SVG Radar
  // Center of container is School (50%, 50%)
  // Bounds is approx 200m from school
  const maxVisualRange = Math.max(schoolConfig.radiusMeters * 2.2, 220); // Scale factor
  const dLat = simulatedUserLat - schoolConfig.lat;
  const dLng = simulatedUserLng - schoolConfig.lng;
  // Approximations of degrees to meters
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 40075000 * Math.cos((schoolConfig.lat * Math.PI) / 180) / 360;
  
  const yMeters = dLat * metersPerDegreeLat;
  const xMeters = dLng * metersPerDegreeLng;

  // Relative positions in SVG viewport (100x100)
  // Center is 50, 50
  const markerX = 50 + (xMeters / maxVisualRange) * 40;
  const markerY = 50 - (yMeters / maxVisualRange) * 40; // Invert SVG coordinates

  // Clamp within SVG bounds (2 to 98)
  const clampedX = Math.max(8, Math.min(92, markerX));
  const clampedY = Math.max(8, Math.min(92, markerY));

  // Geofence circle radius on viewport
  const visualRadius = (schoolConfig.radiusMeters / maxVisualRange) * 40;

  return (
    <div id="geolocation-block" className="bg-white border text-gray-800 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 font-display">
          <Navigation className="w-4.5 h-4.5 text-emerald-600 animate-pulse" /> Radar & Geofencing GPS Sekolah
        </h4>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
            isInRange
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {isInRange ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Di Dalam Area
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-bounce" /> Di Luar Radius
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Radar Map Panel */}
        <div className="flex flex-col items-center justify-center bg-gray-900 text-white rounded-xl p-4 relative aspect-[4/3] overflow-hidden border border-gray-800 shadow-inner">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:24px_24px] opacity-25"></div>
          
          <svg className="w-full h-full min-w-[200px]" viewBox="0 0 100 100">
            {/* Range helper circles */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="0.5" strokeDasharray="3 3"/>
            <circle cx="50" cy="50" r="25" fill="none" stroke="#2c3542" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="10" fill="none" stroke="#2c3542" strokeWidth="0.5" />

            {/* School Geofence Area */}
            <circle
              cx="50"
              cy="50"
              r={visualRadius}
              fill="rgba(16, 185, 129, 0.12)"
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray={isInRange ? "none" : "2 2"}
              className="transition-all duration-300"
            />

            {/* School Center Marker */}
            <circle cx="50" cy="50" r="2.5" fill="#10b981" />
            <g transform="translate(50, 50) translate(-4, -9)">
              <path
                d="M4 0C1.79 0 0 1.79 0 4C0 7 4 10 4 10C4 10 8 7 8 4C8 1.79 6.21 0 4 0ZM4 5.5C3.17 5.5 2.5 4.83 2.5 4C2.5 3.17 3.17 2.5 4 2.5C4.83 2.5 5.5 3.17 5.5 4C5.5 4.83 4.83 5.5 4 5.5Z"
                fill="#f59e0b"
              />
            </g>

            {/* User Pointer (Teacher) */}
            <circle cx={clampedX} cy={clampedY} r="3" fill="#3b82f6" className="animate-ping" />
            <circle cx={clampedX} cy={clampedY} r="2" fill="#3b82f6" />
            
            {/* Visual Vector Connector */}
            <line
              x1="50"
              y1="50"
              x2={clampedX}
              y2={clampedY}
              stroke={isInRange ? "#10b981" : "#ef4444"}
              strokeWidth="0.75"
              strokeDasharray="2 1"
            />
          </svg>

          {/* SVG Labels */}
          <div className="absolute top-2 left-2 bg-gray-800/80 backdrop-blur-xs text-[10px] py-1 px-2 rounded font-mono text-gray-300 pointer-events-none">
            Center: N {schoolConfig.lat.toFixed(5)}, E {schoolConfig.lng.toFixed(5)}
          </div>
          
          <div className="absolute bottom-2 right-2 bg-gray-800/80 backdrop-blur-xs text-[10px] py-1 px-2 rounded font-mono pointer-events-none flex flex-col text-right">
            <span className="text-amber-400 font-semibold">🏠 {schoolConfig.schoolName}</span>
            <span className="text-sky-300 font-semibold">👥 Guru: {distance.toFixed(0)}m jauh</span>
          </div>
        </div>

        {/* Informational Details & Live GPS status */}
        <div id="simulation-cont" className="flex flex-col gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Titik Pusat Sekolah:</span>
              <span className="font-mono text-gray-800 font-semibold">{schoolConfig.lat.toFixed(5)}, {schoolConfig.lng.toFixed(5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Lokasi Anda (GPS Perangkat):</span>
              <span className="font-mono text-gray-800 font-semibold">{simulatedUserLat.toFixed(5)}, {simulatedUserLng.toFixed(5)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-1">
              <span className="text-gray-500 font-semibold">Radius Batas Absen:</span>
              <span className="font-bold text-gray-900 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">{schoolConfig.radiusMeters} Meter</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Jarak dari Sekolah:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded ${isInRange ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'}`}>
                {distance.toFixed(1)} Meter
              </span>
            </div>
          </div>

          <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-emerald-850 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              GPS Hardware Terhubung & Aktif
            </span>
            <p className="text-[10.5px] text-gray-600 leading-relaxed">
              Sinyal lokasi saat ini sedang dipantau secara langsung dari browser atau modul GPS smartphone Anda. Jarak dihitung secara presisi dari titik pusat koordinat sekolah.
            </p>

            <button
              type="button"
              onClick={triggerRealGPS}
              disabled={gpsLoading}
              className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {gpsLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Menyinkronkan GPS...
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  Perbarui Koordinat GPS Sekarang
                </>
              )}
            </button>

            {gpsError && (
              <span className="text-[10.0px] text-rose-600 bg-rose-50 text-center font-bold px-2 py-1 rounded border border-rose-100">
                ⚠️ {gpsError}
              </span>
            )}
          </div>

          {/* ADMIN ONLY CONFIGURATOR PANEL */}
          {isAdminMode && (
            <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-3 mt-1 flex flex-col gap-2">
              <span className="text-xs font-bold text-indigo-850 flex items-center gap-1 border-b border-indigo-100 pb-1 mb-1">
                <Settings className="w-3.5 h-3.5 text-indigo-700" /> Profil Sekolah & Konfigurasi Jam Kerja
              </span>
              <form onSubmit={handleUpdateSchoolConfig} className="flex flex-col gap-3">
                {/* School Name & Address */}
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-[9.5px] font-bold text-indigo-800 block mb-0.5">NAMA SEKOLAH:</label>
                    <input
                      type="text"
                      value={tempSchoolName}
                      onChange={(e) => setTempSchoolName(e.target.value)}
                      placeholder="Contoh: SDN 01 Pagi Jakarta"
                      className="w-full bg-white border border-indigo-200 text-xs px-2 py-1.5 rounded focus:outline-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-bold text-indigo-800 block mb-0.5">ALAMAT SEKOLAH:</label>
                    <textarea
                      value={tempAddress}
                      onChange={(e) => setTempAddress(e.target.value)}
                      placeholder="Jalan Kebon Raya No. 12, DKI Jakarta"
                      rows={1}
                      className="w-full bg-white border border-indigo-200 text-xs px-2 py-1.5 rounded focus:outline-indigo-500 font-medium resize-none"
                    />
                  </div>

                  {/* Logo Sekolah */}
                  <div className="border border-indigo-150 bg-white p-3 rounded-lg flex flex-col gap-2 mt-1">
                    <span className="text-[9.5px] font-bold text-indigo-800 block uppercase tracking-wider font-mono flex items-center gap-1">
                      <Image className="w-3.5 h-3.5 text-indigo-600" /> Logo Resmi Sekolah
                    </span>
                    <div className="flex items-center gap-3.5">
                      {tempLogoData ? (
                        <div className="relative group w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-slate-50 flex items-center justify-center p-1 shrink-0">
                          <img src={tempLogoData} alt="School Logo Preview" className="max-w-full max-h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setTempLogoData('')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded cursor-pointer"
                            title="Hapus Logo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 font-medium shrink-0 bg-slate-50">
                          <Image className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-grow flex flex-col gap-0.5">
                        <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1 px-2.5 rounded cursor-pointer transition-colors text-center inline-flex items-center justify-center gap-1 max-w-max">
                          <Upload className="w-3 h-3" /> Unggah Logo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setTempLogoData(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <span className="text-[9.5px] text-gray-400 leading-normal">
                          Disarankan logo berbentuk persegi (.png / .jpg) transparan.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shift Schedule Customization */}
                <div className="border-t border-indigo-100/50 pt-2">
                  <span className="text-[10px] font-bold text-indigo-900 block mb-1.5">🕒 JAM OPERASIONAL PRESENSI:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-indigo-750 block mb-0.5" title="Mulai jam absensi pagi dibuka">MULAI ABSEN MASUK:</label>
                      <input
                        type="time"
                        value={tempCheckInStart}
                        onChange={(e) => setTempCheckInStart(e.target.value)}
                        className="w-full bg-white border border-indigo-200 text-xs px-2 py-1 rounded focus:outline-indigo-500 font-mono text-center font-bold text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-indigo-750 block mb-0.5" title="Batas toleransi masuk, lewat dari ini dihitung terlambat">BATAS TELAT MASUK:</label>
                      <input
                        type="time"
                        value={tempCheckInEnd}
                        onChange={(e) => setTempCheckInEnd(e.target.value)}
                        className="w-full bg-white border border-indigo-200 text-xs px-2 py-1 rounded focus:outline-indigo-500 font-mono text-center font-bold text-rose-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-indigo-750 block mb-0.5" title="Mulai tombol absen pulang dinonaktifkan / diaktifkan">MULAI ABSEN PULANG:</label>
                      <input
                        type="time"
                        value={tempCheckOutStart}
                        onChange={(e) => setTempCheckOutStart(e.target.value)}
                        className="w-full bg-white border border-indigo-200 text-xs px-2 py-1 rounded focus:outline-indigo-500 font-mono text-center font-bold text-indigo-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="border-t border-indigo-100/50 pt-2">
                  <span className="text-[10px] font-bold text-indigo-900 block mb-1.5">🛰️ GEOLOKASI (GPS PUSAT SEKOLAH):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-indigo-700 block mb-0.5">LATITUDE:</label>
                      <input
                        type="text"
                        value={tempSchoolLat}
                        onChange={(e) => setTempSchoolLat(e.target.value)}
                        className="w-full bg-white border border-indigo-200 text-xs px-2 py-1.5 rounded focus:outline-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-indigo-700 block mb-0.5">LONGITUDE:</label>
                      <input
                        type="text"
                        value={tempSchoolLng}
                        onChange={(e) => setTempSchoolLng(e.target.value)}
                        className="w-full bg-white border border-indigo-200 text-xs px-2 py-1.5 rounded focus:outline-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Radius */}
                <div className="border-t border-indigo-100/50 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-indigo-700 mb-0.5">
                    <span>RADIUS BATAS ABSEN (GEOFENCE):</span>
                    <span className="text-indigo-800 bg-white font-mono border border-indigo-250 rounded px-1.5 font-bold">{tempRadius} Meter</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="500"
                    step="10"
                    value={tempRadius}
                    onChange={(e) => setTempRadius(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-indigo-100 rounded-lg appearance-none"
                  />
                </div>

                <div className="flex justify-between items-center border-t border-indigo-100/50 pt-3 mt-1">
                  <p className="text-[9px] text-indigo-600/80 italic max-w-[60%]">
                    *Tenggat waktu & jangkauan GPS ini mempengaruhi seluruh validasi presensi guru.
                  </p>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-md cursor-pointer text-white font-bold text-xs py-2 px-4 rounded-lg text-center transition-all active:scale-95 shrink-0"
                  >
                    Simpan Perubahan Profil
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
