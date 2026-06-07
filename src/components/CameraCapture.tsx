import React, { useRef, useState, useEffect } from 'react';
import { Camera, AlertCircle, RefreshCw, Check, Image as ImageIcon } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  savedPhoto?: string;
  isProcessing?: boolean;
}

export default function CameraCapture({ onCapture, savedPhoto, isProcessing }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<boolean>(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(savedPhoto || null);

  useEffect(() => {
    if (savedPhoto) {
      setPhotoPreview(savedPhoto);
      setCaptured(true);
    }
  }, [savedPhoto]);

  // Handle active camera streaming
  useEffect(() => {
    if (photoPreview) {
      stopCamera();
      return;
    }

    async function startCamera() {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 640 }, facingMode: 'user' },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setHasCamera(true);
        }
      } catch (err: any) {
        console.warn('Camera blocked or unavailable:', err);
        setHasCamera(false);
        setCameraError('Gagal mengakses kamera langsung (karena aturan keamanan iframe sandbox atau tidak ada webcam).');
      }
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [photoPreview]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const videoWidth = videoRef.current.videoWidth || 640;
          const videoHeight = videoRef.current.videoHeight || 480;
          const targetRatio = 3 / 4;
          const sourceRatio = videoWidth / videoHeight;
          
          let sWidth, sHeight, sx, sy;
          if (sourceRatio > targetRatio) {
            // Source is wider than target (e.g. landscape stream, portrait canvas)
            sHeight = videoHeight;
            sWidth = videoHeight * targetRatio;
            sx = (videoWidth - sWidth) / 2;
            sy = 0;
          } else {
            // Source is taller than target
            sWidth = videoWidth;
            sHeight = videoWidth / targetRatio;
            sx = 0;
            sy = (videoHeight - sHeight) / 2;
          }

          // Move registration point to top right, flip horizontal for mirror effect
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          
          // Draw the cropped center portion of the video feed
          ctx.drawImage(videoRef.current, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
          
          // Reset transformation matrices
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          
          // Draw verification watermark at the bottom of the portrait 3:4 canvas
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
          ctx.font = 'bold 13px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`GuruPresence Terverifikasi ● ${new Date().toLocaleString('id-ID')}`, 15, canvas.height - 15);

          const dataUrl = canvas.toDataURL('image/jpeg');
          setPhotoPreview(dataUrl);
          setCaptured(true);
          stopCamera();
          onCapture(dataUrl);
        }
      } catch (err) {
        console.error('Error rendering canvas', err);
      }
    }
  };

  const handleReset = () => {
    setCaptured(false);
    setPhotoPreview(null);
    onCapture('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        // Let's create a beautiful watermarked version of the uploaded image
        const img = new Image();
        img.src = base64String;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 480;
          canvas.height = 640;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imgWidth = img.width || 400;
            const imgHeight = img.height || 300;
            const targetRatio = 3 / 4;
            const sourceRatio = imgWidth / imgHeight;
            
            let sWidth, sHeight, sx, sy;
            if (sourceRatio > targetRatio) {
              sHeight = imgHeight;
              sWidth = imgHeight * targetRatio;
              sx = (imgWidth - sWidth) / 2;
              sy = 0;
            } else {
              sWidth = imgWidth;
              sHeight = imgWidth / targetRatio;
              sx = 0;
              sy = (imgHeight - sHeight) / 2;
            }
            
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            
            // Draw verification watermark
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
            ctx.font = 'bold 13px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`GuruPresence Terverifikasi ● ${new Date().toLocaleString('id-ID')}`, 15, canvas.height - 15);
            
            const watermarkedData = canvas.toDataURL('image/jpeg');
            setPhotoPreview(watermarkedData);
            setCaptured(true);
            onCapture(watermarkedData);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div id="camera-section" className="flex flex-col items-center bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between w-full mb-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 font-display">
          <Camera className="w-4.5 h-4.5 text-emerald-600" /> Verifikasi Swafoto (3:4 Portrait)
        </h4>
        
        {captured && (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs font-mono font-bold">
            <Check className="w-3.5 h-3.5" /> Terverifikasi
          </span>
        )}
      </div>

      {/* Main Viewfinder Frame - Styled into 3:4 Portrait aspect ratio */}
      <div className="relative w-full max-w-[300px] aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden border border-gray-250 flex flex-col items-center justify-center">
        {photoPreview ? (
          <img
            src={photoPreview}
            alt="Selfie captured"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : hasCamera === false ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-slate-50 text-slate-700">
            <AlertCircle className="w-7 h-7 text-amber-500 mb-2.5" />
            <span className="text-xs font-bold text-slate-800">Akses Kamera Diblokir</span>
            <p className="text-[10px] text-gray-500 mt-1 mb-4 leading-relaxed max-w-[240px]">
              Silakan ambil swafoto menggunakan kamera depan ponsel Anda melalui tombol unggah foto di bawah:
            </p>
            <label className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm active:scale-95">
              <ImageIcon className="w-4 h-4" /> Ambil / Unggah Foto
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}

        {/* Shutter Loading Bar */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mb-1 text-emerald-400" />
            Menyimpan swafoto ke sistem...
          </div>
        )}
      </div>

      {/* Capture Actions */}
      <div className="mt-4 flex gap-3 w-full max-w-[300px]">
        {!photoPreview ? (
          <button
            type="button"
            onClick={handleCapture}
            disabled={hasCamera === false}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" /> Ambil Swafoto Sekarang
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" /> Ambil Ulang Foto
          </button>
        )}
      </div>

      {cameraError && !photoPreview && hasCamera !== false && (
        <div className="mt-2.5 text-[10.5px] text-amber-700 bg-amber-50 p-2 border border-amber-200 rounded-lg text-center w-full max-w-[300px] font-medium leading-relaxed">
          {cameraError}
        </div>
      )}
    </div>
  );
}
