import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiVolume2, FiVolumeX, FiX, FiMusic } from 'react-icons/fi';
import { MdDragIndicator } from 'react-icons/md';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { BsFileEarmarkMusic, BsCheckCircle } from 'react-icons/bs';

const FileQueueItem = ({ item, isActive, onRemove, onSelect, isSelected, onToggleSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Extract file format from filename
  const getFileFormat = (fileName) => {
    const extension = fileName.split('.').pop().toUpperCase();
    return extension;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get format color
  const getFormatColor = (format) => {
    const colors = {
      'MP3': 'bg-purple-100 text-purple-700',
      'WAV': 'bg-blue-100 text-blue-700',
      'M4A': 'bg-green-100 text-green-700',
      'OGG': 'bg-orange-100 text-orange-700',
      'FLAC': 'bg-pink-100 text-pink-700',
    };
    return colors[format] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'ready':
        return (
          <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#2e7d32] rounded text-xs font-medium">
            Ready
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-1 font-medium">
            <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 bg-[#fff9e6] text-[#f57c00] rounded text-xs font-medium">
            Pending
          </span>
        );
      case 'error':
        return (
          <span className="px-2 py-0.5 bg-[#ffebee] text-[#c62828] rounded text-xs font-medium">
            Error
          </span>
        );
      default:
        return null;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fileFormat = getFileFormat(item.fileName);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`
        relative bg-white rounded-lg p-3 cursor-pointer transition-all
        border-2 shadow-sm hover:shadow-lg
        ${isActive
          ? 'border-blue-500 ring-2 ring-blue-200 shadow-blue-100'
          : isSelected
          ? 'border-purple-400 ring-2 ring-purple-100'
          : 'border-[#d2d2d7] hover:border-[#a8a8a8]'
        }
        ${isActive ? 'animate-pulse-border' : ''}
      `}
    >
      {/* Pulse animation overlay for active track */}
      {isActive && (
        <div className="absolute inset-0 rounded-lg bg-blue-500 opacity-10 animate-pulse pointer-events-none" />
      )}

      <div className="flex items-start gap-3 relative z-10">
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="flex-shrink-0 mt-1"
          >
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all
              ${isSelected
                ? 'bg-purple-500 border-purple-500'
                : 'border-gray-300 hover:border-purple-400'
              }
            `}>
              {isSelected && <BsCheckCircle className="w-4 h-4 text-white" />}
            </div>
          </div>
        )}

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="text-[#86868b] cursor-move mt-1 hover:text-[#1d1d1f] transition flex-shrink-0"
        >
          <MdDragIndicator className="w-5 h-5" />
        </div>

        {/* File Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${isActive
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-600'
            }
          `}>
            <BsFileEarmarkMusic className="w-5 h-5" />
          </div>
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <p className={`font-semibold truncate ${isActive ? 'text-blue-600' : 'text-[#1d1d1f]'}`}>
              {item.fileName}
            </p>
          </div>

          {/* Metadata Row 1 - Format and Size */}
          <div className="flex items-center gap-2 mb-1.5 text-xs flex-wrap">
            <span className={`px-2 py-0.5 rounded font-bold ${getFormatColor(fileFormat)}`}>
              {fileFormat}
            </span>
            <span className="text-[#86868b] font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#86868b]" />
              {formatFileSize(item.fileSize)}
            </span>
            <span className="text-[#86868b] font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#86868b]" />
              {formatDuration(item.duration)}
            </span>
          </div>

          {/* Metadata Row 2 - Status and Speed */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {getStatusBadge()}
            <span className="px-2 py-0.5 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 rounded font-bold border border-blue-200">
              {item.speed}× Speed
            </span>
            {item.processedFileName && (
              <span className="text-[#86868b] font-medium flex items-center gap-1">
                <BsCheckCircle className="w-3 h-3 text-green-600" />
                Processed
              </span>
            )}
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-[#86868b] hover:text-[#c62828] hover:bg-red-50 p-1.5 rounded-lg transition flex-shrink-0"
          title="Remove from queue"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default FileQueueItem;
