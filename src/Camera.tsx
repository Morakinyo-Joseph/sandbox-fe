import React, { useEffect, useRef, useState } from 'react';
import { Flashlight, Settings } from 'lucide-react';

interface CameraProps {
  onCapture: (imageData: string) => void;
}

export function Camera({ onCapture }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isMacroMode, setIsMacroMode] = useState(true);
  const [isFlashOn, setIsFlashOn] = useState(true);
  const [error, setError] = useState<string>('');
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const imageCaptureRef = useRef<any>(null);

  const [exposureMode, setExposureMode] = useState('manual');
  const [exposureTime, setExposureTime] = useState(2.5);
  const [exposureCompensation, setExposureCompensation] = useState(0);
  const [iso, setIso] = useState(400);

  const checkCameraCapabilities = (track: MediaStreamTrack) => {
    if ('ImageCapture' in window) {
      imageCaptureRef.current = new (window as any).ImageCapture(track);
    }
  };

  const startCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');

      if (cameras.length === 0) {
        throw new Error('No camera detected on this device');
      }

      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      trackRef.current = videoTrack;

      checkCameraCapabilities(videoTrack);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasPermission(true);
        setError('');
        await applySettings();
      }
    } catch (err) {
      console.error("Camera error:", err);
      let errorMessage = 'Error accessing camera. ';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage += 'Please grant camera permissions.';
        } else if (err.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage += 'Camera is already in use.';
        } else {
          errorMessage += err.message;
        }
      }

      setError(errorMessage);
      setHasPermission(false);
    }
  };

  const applySettings = async () => {
    if (!trackRef.current) return;

    try {
      try {
        await trackRef.current.applyConstraints({
          advanced: [{ torch: isFlashOn }]
        });
      } catch (flashError) {
        console.log('Flash not supported:', flashError);
      }

      if (isMacroMode) {
        try {
          const settings = {
            exposureMode: 'manual',
            exposureTime: exposureTime,
            exposureCompensation: exposureCompensation,
            iso: iso
          };

          await trackRef.current.applyConstraints({
            advanced: [settings]
          });

          if (imageCaptureRef.current) {
            await imageCaptureRef.current.setOptions(settings);
          }
        } catch (settingsError) {
          console.log('Some settings not supported:', settingsError);
        }
      } else {
        try {
          await trackRef.current.applyConstraints({
            advanced: [{
              exposureMode: 'continuous',
              exposureCompensation: 0
            }]
          });
        } catch (resetError) {
          console.log('Error resetting settings:', resetError);
        }
      }
    } catch (err) {
      console.error('Error applying camera settings:', err);
      setError('Some camera settings might not be supported on your device.');
    }
  };

  const captureImage = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/png').split(',')[1];
    onCapture(imageData);
  };

  const toggleMacroMode = async () => {
    const newMacroMode = !isMacroMode;
    setIsMacroMode(newMacroMode);

    if (newMacroMode) {
      setExposureTime(2.5);
      setIso(400);
      setExposureCompensation(0);
    }

    await applySettings();
  };

  const toggleFlash = async () => {
    setIsFlashOn(prev => !prev);
  };

  useEffect(() => {
    if (hasPermission) {
      applySettings();
    }
  }, [isFlashOn, isMacroMode]);

  useEffect(() => {
    if (hasPermission && isMacroMode) {
      applySettings();
    }
  }, [exposureTime, iso]);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      <div className="relative aspect-[4/3] bg-black">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-white bg-black/90 p-4 text-center z-10">
            <p className="text-sm">{error}</p>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {hasPermission && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={toggleFlash}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                isFlashOn
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Flashlight className="w-4 h-4" />
              <span>{isFlashOn ? 'Flash On' : 'Flash Off'}</span>
            </button>

            <button
              onClick={toggleMacroMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                isMacroMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{isMacroMode ? 'Manual' : 'Auto'}</span>
            </button>

            <button
              onClick={captureImage}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Capture
            </button>
          </div>

          {isMacroMode && (
            <div className="space-y-4 bg-gray-900 p-4 rounded-lg">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  ISO: {iso}
                </label>
                <input
                  type="range"
                  min={100}
                  max={800}
                  step={100}
                  value={iso}
                  onChange={(e) => setIso(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Shutter Speed: 1/{Math.round(1000/exposureTime)}s
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.1}
                  value={exposureTime}
                  onChange={(e) => setExposureTime(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
