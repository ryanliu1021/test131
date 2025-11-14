import { useState, useRef, useEffect } from 'react';
import {
  FiPlay,
  FiPause,
  FiSkipBack,
  FiSkipForward,
  FiRepeat,
  FiChevronDown,
  FiCheck,
  FiDownload
} from 'react-icons/fi';
import { BiArrowToRight } from 'react-icons/bi';
import toast from 'react-hot-toast';

const AudioPlayer = ({
  currentFile,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onSpeedChange
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopMode, setLoopMode] = useState('next'); // 'loop' or 'next'
  const [speed, setSpeed] = useState(1.0);
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const speedDropdownRef = useRef(null);

  useEffect(() => {
    if (currentFile && audioRef.current) {
      // audioRef.current.src = `http://52.8.201.196:80/my_files/${currentFile.processedFileName || currentFile.fileName}`;
      audioRef.current.src = `/my_files/${currentFile.processedFileName || currentFile.fileName}`;
      audioRef.current.load();
      // Sync speed state with current file
      if (currentFile.speed !== undefined) {
        setSpeed(currentFile.speed);
      }
    }
  }, [currentFile]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      if (loopMode === 'loop') {
        audio.currentTime = 0;
        audio.play();
      } else if (loopMode === 'next' && hasNext) {
        onNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [loopMode, hasNext, onNext, isDragging]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(event.target)) {
        setIsSpeedDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || !currentFile) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Play error:', err);
        toast.error('Failed to play audio');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !currentFile) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSliderMouseDown = () => {
    setIsDragging(true);
  };

  const handleSliderMouseUp = (e) => {
    setIsDragging(false);
    handleSeek(e);
  };

  const toggleLoopMode = () => {
    const newMode = loopMode === 'loop' ? 'next' : 'loop';
    setLoopMode(newMode);
    toast.success(`${newMode === 'loop' ? 'Looping current file' : 'Playing next file after current'}`);
  };

  const handleSpeedChange = async (newSpeed) => {
    setSpeed(newSpeed);
    setIsSpeedDropdownOpen(false);

    if (!currentFile || !onSpeedChange) return;

    // Call the parent's speed change handler
    onSpeedChange(currentFile.id, newSpeed);
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const handleDownload = () => {
    if (!currentFile) return;

    const fileName = currentFile.processedFileName || currentFile.fileName;
    // const downloadUrl = `http://52.8.201.196:80/my_files/download?name=${encodeURIComponent(fileName)}`;
    const downloadUrl = `/my_files/download?name=${encodeURIComponent(fileName)}`;

    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Download started');
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Show disabled player when no file is selected
  const isDisabled = !currentFile;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="p-6">
      <audio ref={audioRef} />

      {/* Compact Player Controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="p-2.5 bg-blue-500 rounded-full hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-blue-500 flex-shrink-0"
          disabled={isDisabled}
        >
          {isPlaying ? (
            <FiPause className="w-5 h-5 text-white" />
          ) : (
            <FiPlay className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Progress Bar and Time */}
        <div className="flex-1 min-w-0">
          <div
            className={`relative h-1 bg-[#e8e8ed] rounded-full transition-all group ${
              isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
            onClick={isDisabled ? undefined : handleSeek}
            onMouseDown={isDisabled ? undefined : handleSliderMouseDown}
            onMouseUp={isDisabled ? undefined : handleSliderMouseUp}
          >
            <div
              className="absolute h-full bg-[#1d1d1f] rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
            <div
              className="absolute h-3 w-3 bg-[#1d1d1f] rounded-full -top-1 shadow-sm transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#86868b] mt-1.5 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Navigation and Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Previous Button */}
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="p-2 rounded-lg hover:bg-[#f5f5f7] disabled:opacity-30 disabled:cursor-not-allowed transition text-[#1d1d1f]"
            title="Previous"
          >
            <FiSkipBack className="w-4 h-4" />
          </button>

          {/* Next Button */}
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-2 rounded-lg hover:bg-[#f5f5f7] disabled:opacity-30 disabled:cursor-not-allowed transition text-[#1d1d1f]"
            title="Next"
          >
            <FiSkipForward className="w-4 h-4" />
          </button>

          {/* Loop Toggle */}
          <button
            onClick={toggleLoopMode}
            className={`p-2 rounded-lg hover:bg-[#f5f5f7] transition ${
              loopMode === 'loop' ? 'text-blue-500' : 'text-[#86868b]'
            }`}
            title={loopMode === 'loop' ? 'Loop current' : 'Play next'}
          >
            {loopMode === 'loop' ? (
              <FiRepeat className="w-4 h-4" />
            ) : (
              <BiArrowToRight className="w-4 h-4" />
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDisabled}
            className="p-2 rounded-lg hover:bg-[#f5f5f7] disabled:opacity-30 disabled:cursor-not-allowed transition text-[#1d1d1f]"
            title="Download audio file"
          >
            <FiDownload className="w-4 h-4" />
          </button>

          {/* Speed Control */}
          <div className="relative ml-1" ref={speedDropdownRef}>
            <button
              onClick={() => setIsSpeedDropdownOpen(!isSpeedDropdownOpen)}
              className="px-3 py-1.5 border border-[#d2d2d7] rounded-md hover:bg-[#f5f5f7] transition text-xs font-medium text-[#1d1d1f] flex items-center gap-1"
              title="Playback speed"
            >
              {speed}×
              <FiChevronDown className={`w-3 h-3 transition-transform ${isSpeedDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Speed Dropdown */}
            {isSpeedDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-[#d2d2d7] rounded-lg shadow-lg py-1 min-w-[100px] z-10">
                {speedOptions.map((speedOption) => (
                  <button
                    key={speedOption}
                    onClick={() => handleSpeedChange(speedOption)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[#f5f5f7] transition flex items-center justify-between ${
                      speed === speedOption ? 'text-blue-600 font-semibold' : 'text-[#1d1d1f]'
                    }`}
                  >
                    <span>{speedOption}×</span>
                    {speed === speedOption && <FiCheck className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
