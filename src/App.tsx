import { useState } from 'react';
import { Camera } from './Camera';
import { ArrowLeft, Loader2 } from 'lucide-react';

type FingerType = 'index' | 'middle' | 'ring' | 'pinky' | 'thumb';

interface ApiResponse {
  message: string;
  data: {
    finger_type: string;
    original_image: string;
    print_image: string;
    device_info: string;
    created_at: string;
  };
}

type View = 'selection' | 'camera' | 'loading' | 'result';

function App() {
  const [currentView, setCurrentView] = useState<View>('selection');
  const [selectedFinger, setSelectedFinger] = useState<FingerType>('index');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');

  const fingerOptions: FingerType[] = ['index', 'middle', 'ring', 'pinky', 'thumb'];

  const handleProceedToCamera = () => {
    setCurrentView('camera');
    setError('');
  };

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setCurrentView('loading');
    setError('');

    try {
      const blob = await fetch(`data:image/png;base64,${imageData}`).then(r => r.blob());
      const file = new File([blob], 'fingerprint.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('finger_type', selectedFinger);
      formData.append('original_image', file);

      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      if (!baseUrl) {
        throw new Error('API base URL is not configured');
      }

      const response = await fetch(`${baseUrl}/finger/capture`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        if (errorData && typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return value.join(', ');
              }
              return String(value);
            })
            .join('. ');

          throw new Error(errorMessages || 'Failed to process fingerprint');
        }

        if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }

        throw new Error('Failed to process fingerprint. Please try again.');
      }

      const data: ApiResponse = await response.json();
      setResult(data);
      setCurrentView('result');
    } catch (err) {
      console.error('Upload error:', err);

      let errorMessage = 'An error occurred. Please try again.';

      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setCurrentView('camera');
    }
  };

  const handleRetake = () => {
    setResult(null);
    setCapturedImage('');
    setError('');
    setCurrentView('selection');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto p-4 min-h-screen flex flex-col">
        {currentView === 'selection' && (
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold text-center">Fingerprint Capture</h1>

              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <label htmlFor="finger-select" className="block text-sm font-medium text-gray-300">
                  Select Finger Type
                </label>
                <select
                  id="finger-select"
                  value={selectedFinger}
                  onChange={(e) => setSelectedFinger(e.target.value as FingerType)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {fingerOptions.map((finger) => (
                    <option key={finger} value={finger}>
                      {finger.charAt(0).toUpperCase() + finger.slice(1)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleProceedToCamera}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'camera' && (
          <div className="flex-1 flex flex-col space-y-4 py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('selection')}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="text-sm text-gray-400">
                {selectedFinger.charAt(0).toUpperCase() + selectedFinger.slice(1)} Finger
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200 text-sm">
                {error}
              </div>
            )}

            <Camera onCapture={handleCapture} />
          </div>
        )}

        {currentView === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-300">Processing fingerprint...</p>
          </div>
        )}

        {currentView === 'result' && result && (
          <div className="flex-1 flex flex-col py-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Capture Result</h2>
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={result.data.print_image}
                alt="Processed fingerprint"
                className="w-full h-auto"
              />
            </div>

            <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Finger Type:</span>
                <span className="text-white font-medium">
                  {result.data.finger_type.charAt(0).toUpperCase() + result.data.finger_type.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 font-medium">{result.message}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Captured:</span>
                <span className="text-white">
                  {new Date(result.data.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleRetake}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Start</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
