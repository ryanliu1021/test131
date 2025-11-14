import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import AudioUploadZone from './components/AudioUploadZone';
import AudioPlayer from './components/AudioPlayer';
import FileQueue from './components/FileQueue';

// Initialize Socket.io connection
// const socket = io('http://52.8.201.196:80');
// const socket = io();

// 統一 API base URL（注意加 :3000）
const API_BASE = 'http://software-engineering-home-directory.com:3000';
// Socket.io 也指到同一個 Node server
const socket = io(API_BASE);

function App() {
  const [queue, setQueue] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Generate mock waveform data
  const generateMockWaveform = () => {
    return Array.from({ length: 40 }, () => Math.random() * 100);
  };

  useEffect(() => {
    // Listen for file upload notifications from server
    socket.on('file-received', (fileName) => {
      console.log('File received:', fileName);

      // Add the new file to the queue
      const newFile = {
        id: Date.now().toString() + Math.random(),
        fileName: fileName,
        originalFileName: fileName,
        duration: null,
        status: 'processing',
        speed: 1.0, // Default speed
        processedFileName: null, // Will be set when processing is complete
        fileSize: Math.floor(Math.random() * 5000000) + 1000000, // Mock size 1-6MB
        waveformData: generateMockWaveform(),
      };

      setQueue((prevQueue) => [...prevQueue, newFile]);
    });

    // Listen for file processing completion
    socket.on('file-processed', (data) => {
      console.log('File processed:', data);
      const { fileName, outputFilename, speed } = data;

      setQueue((prevQueue) =>
        prevQueue.map((item) =>
          item.fileName === fileName
            ? {
                ...item,
                status: 'ready',
                speed: speed,
                processedFileName: outputFilename,
                originalSize: item.fileSize,
                processedSize: Math.floor(item.fileSize * 0.7), // Mock compression
              }
            : item
        )
      );
    });

    // Listen for processing errors
    socket.on('processing-error', (errorMsg) => {
      console.error('Processing error:', errorMsg);
      toast.error('Error processing audio file');
    });

    // Fetch existing files on mount
    fetchExistingFiles();

    return () => {
      socket.off('file-received');
      socket.off('file-processed');
      socket.off('processing-error');
    };
  }, []);

  const fetchExistingFiles = async () => {
    try {
      // const response = await fetch('http://52.8.201.196:80/list-files');
      const response = await fetch(`${API_BASE}/list-files`);
      const files = await response.json();

      // Helper to check if a file is a processed version
      const isProcessedFile = (file) => file.startsWith('faster_') || file.startsWith('speed_');

      // Helper to extract speed from filename (e.g., "speed_1.5x_file.mp3" -> 1.5)
      const extractSpeed = (filename) => {
        const match = filename.match(/speed_([\d.]+)x_/);
        if (match) return parseFloat(match[1]);
        if (filename.startsWith('faster_')) return 2.0; // Old format was always 2x
        return 1.0;
      };

      // Filter and create queue items
      const queueItems = files
        .filter((file) => !isProcessedFile(file)) // Only show original files
        .map((fileName, index) => {
          // Find processed versions of this file
          const processedVersions = files.filter(
            (f) => isProcessedFile(f) && f.includes(fileName)
          );

          // Use the most recent processed version (last in array after sorting)
          const processedFileName = processedVersions.length > 0 ? processedVersions[processedVersions.length - 1] : null;
          const speed = processedFileName ? extractSpeed(processedFileName) : 1.0;
          const fileSize = Math.floor(Math.random() * 5000000) + 1000000; // Mock size

          return {
            id: Date.now().toString() + index,
            fileName: fileName,
            originalFileName: fileName,
            duration: null,
            status: processedFileName ? 'ready' : 'pending',
            speed: speed,
            processedFileName: processedFileName,
            fileSize: fileSize,
            originalSize: fileSize,
            processedSize: processedFileName ? Math.floor(fileSize * 0.7) : null,
            waveformData: generateMockWaveform(),
          };
        });

      setQueue(queueItems);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const handleFileUploaded = (file) => {
    // File will be added via socket event
    console.log('File uploaded:', file.name);
  };

  const handleReorder = (newQueue) => {
    setQueue(newQueue);
    toast.success('Queue reordered');
  };

  const handleRemove = async (fileId) => {
    const fileToRemove = queue.find((item) => item.id === fileId);

    if (!fileToRemove) return;

    if (window.confirm(`Delete ${fileToRemove.fileName} permanently? This will remove it from the server.`)) {
      try {
        // Call backend to delete the file
        // const response = await fetch('http://52.8.201.196:80/my_files/delete', {
        const response = await fetch(`${API_BASE}/my_files/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          // body: JSON.stringify({
          //   fileName: fileToRemove.fileName,
          // }),
          body: JSON.stringify({ fileName: fileToRemove.fileName }),
        });

        const result = await response.json();

        if (response.ok) {
          // Remove from queue only after successful deletion
          setQueue((prevQueue) => prevQueue.filter((item) => item.id !== fileId));

          // Adjust current file index if needed
          const removedIndex = queue.findIndex((item) => item.id === fileId);
          if (removedIndex <= currentFileIndex && currentFileIndex > 0) {
            setCurrentFileIndex(currentFileIndex - 1);
          }

          toast.success(`Deleted ${result.deletedFiles?.length || 1} file(s)`);
        } else {
          toast.error(result.error || 'Failed to delete file');
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete file from server');
      }
    }
  };

  const handleSelect = (fileId) => {
    const index = queue.findIndex((item) => item.id === fileId);
    if (index !== -1) {
      setCurrentFileIndex(index);
    }
  };

  const handleNext = () => {
    if (currentFileIndex < queue.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  const handleSpeedChange = async (fileId, newSpeed) => {
    const file = queue.find((item) => item.id === fileId);
    if (!file) return;

    try {
      // Update queue state immediately to show the new speed
      setQueue((prevQueue) =>
        prevQueue.map((item) =>
          item.id === fileId
            ? { ...item, speed: newSpeed, status: 'processing' }
            : item
        )
      );

      // Send request to backend to re-process file
      // const response = await fetch('http://52.8.201.196:80/my_files/change-speed', {
      const response = await fetch(`${API_BASE}/my_files/change-speed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.fileName,
          speed: newSpeed,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update queue with the new processed file name
        setQueue((prevQueue) =>
          prevQueue.map((item) =>
            item.id === fileId
              ? {
                  ...item,
                  speed: newSpeed,
                  status: 'ready',
                  processedFileName: result.outputFilename,
                }
              : item
          )
        );
        toast.success(`Speed changed to ${newSpeed}x`);
      } else {
        // Revert on error
        setQueue((prevQueue) =>
          prevQueue.map((item) =>
            item.id === fileId
              ? { ...item, status: 'ready' }
              : item
          )
        );
        toast.error(result.error || 'Failed to change speed');
      }
    } catch (error) {
      console.error('Speed change error:', error);
      // Revert on error
      setQueue((prevQueue) =>
        prevQueue.map((item) =>
          item.id === fileId
            ? { ...item, status: 'ready' }
            : item
        )
      );
      toast.error('Failed to change speed');
    }
  };

  const currentFile = queue[currentFileIndex] || null;
  const hasNext = currentFileIndex < queue.length - 1;
  const hasPrevious = currentFileIndex > 0;

  return (
    <div className="min-h-screen bg-green-50 flex flex-col">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#1d1d1f',
            fontWeight: '500',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }}
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 via-green-500 to-teal-500 border-b border-green-700 shadow-lg relative overflow-hidden">
        {/* Animated background shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-slow" />

        <div className="relative px-8 py-6 flex items-center justify-between">
          {/* Left: Logo and Brand */}
          <div className="flex items-center gap-4">
            {/* Animated Sound Bars Logo */}
            <div className="flex items-end gap-1 h-12 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
              <div className="w-1.5 bg-white rounded-full animate-wave-bar-1" style={{ height: '50%' }} />
              <div className="w-1.5 bg-white rounded-full animate-wave-bar-2" style={{ height: '80%' }} />
              <div className="w-1.5 bg-white rounded-full animate-wave-bar-3" style={{ height: '100%' }} />
              <div className="w-1.5 bg-white rounded-full animate-wave-bar-4" style={{ height: '70%' }} />
              <div className="w-1.5 bg-white rounded-full animate-wave-bar-5" style={{ height: '90%' }} />
            </div>

            {/* Brand Text */}
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                Team Spotify Audio
                <span className="text-lg font-normal text-white/80">🎵</span>
              </h1>
              <p className="text-sm text-white/90 font-medium mt-0.5">
                Professional Audio Speed Control
              </p>
            </div>
          </div>

          {/* Right: Decorative Badge */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-white">Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout - Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Main Area (Playback Zone) */}
        <main className="flex-1 flex flex-col bg-green-50">
          {/* Main content area - Centered */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-3xl">
              {/* File Title at Top */}
              <div className="text-center mb-12">
                <h2 className="text-lg font-medium text-[#1d1d1f]">
                  {currentFile ? currentFile.fileName : 'No audio file selected'}
                </h2>
                {currentFile && (
                  <p className="text-sm text-[#86868b] mt-1">
                    {currentFile.status === 'ready' ? 'Ready to play' : 'Processing...'}
                  </p>
                )}
              </div>

              {/* Audio Player in Middle - Card */}
              <div className="bg-white rounded-xl shadow-sm border border-[#d2d2d7]">
                <AudioPlayer
                  currentFile={currentFile}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  onSpeedChange={handleSpeedChange}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Right: Sidebar (Queue + Upload Zone) */}
        <aside className="w-[480px] border-l border-green-200 bg-green-50 flex flex-col shadow-lg">
          {/* Queue Section */}
          <FileQueue
            queue={queue}
            currentFileId={currentFile?.id}
            onReorder={handleReorder}
            onRemove={handleRemove}
            onSelect={handleSelect}
            onFilesUploaded={handleFileUploaded}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
