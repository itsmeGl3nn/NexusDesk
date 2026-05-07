import { useState, useEffect } from 'react';
import { Phone, PhoneOff, ArrowRightLeft, MoreHorizontal, Headphones } from 'lucide-react';

type CallState = 'idle' | 'connected' | 'ringing';

export default function CallCenterWidget() {
  const [callState, setCallState] = useState<CallState>('connected');
  const [callDuration, setCallDuration] = useState(2);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Call Center</h3>
            <p className="text-xs text-gray-500">
              Agent connected to <span className="text-orange-500">🤙</span> Amazon Connect
            </p>
          </div>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Call actions */}
      <div className="space-y-2.5">
        {/* Call Customer button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCallState(callState === 'idle' ? 'connected' : 'connected')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call Customer
          </button>
          {callState === 'connected' && (
            <span className="text-sm font-mono text-gray-600 w-14 text-center">
              {formatDuration(callDuration)}
            </span>
          )}
        </div>

        {/* End Call button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCallState('idle');
              setCallDuration(0);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </button>
          <span className="text-gray-400 text-sm w-14 text-center">›</span>
        </div>

        {/* Transfer Call button */}
        <button className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-lg transition-colors">
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Call
          </span>
          <span className="text-gray-400">›</span>
        </button>
      </div>
    </div>
  );
}
