import { useState } from 'react';
import { FiX } from 'react-icons/fi';

const SpeedControlModal = ({ currentSpeed, onSpeedChange, onClose }) => {
  const [customSpeed, setCustomSpeed] = useState(currentSpeed.toString());
  const presetSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const handleApply = () => {
    const speed = parseFloat(customSpeed);
    if (isNaN(speed) || speed < 0.25 || speed > 4.0) {
      alert('Please enter a speed between 0.25 and 4.0');
      return;
    }
    onSpeedChange(speed);
  };

  const handlePresetClick = (speed) => {
    setCustomSpeed(speed.toString());
    onSpeedChange(speed);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Playback Speed</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Preset Speeds */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Presets:</p>
          <div className="grid grid-cols-3 gap-2">
            {presetSpeeds.map((speed) => (
              <button
                key={speed}
                onClick={() => handlePresetClick(speed)}
                className={`px-4 py-2 rounded-lg border-2 transition ${
                  parseFloat(customSpeed) === speed
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Custom Speed Input */}
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-2">
            Custom Speed (0.25 - 4.0):
          </label>
          <input
            type="number"
            min="0.25"
            max="4.0"
            step="0.25"
            value={customSpeed}
            onChange={(e) => setCustomSpeed(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 1.75"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Apply
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Note: Changing speed will re-process the audio file
        </p>
      </div>
    </div>
  );
};

export default SpeedControlModal;
