import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FiTrash2, FiDownload, FiCheckSquare, FiSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import FileQueueItem from './FileQueueItem';
import AudioUploadZone from './AudioUploadZone';

const FileQueue = ({ queue, currentFileId, onReorder, onRemove, onSelect, onFilesUploaded }) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = queue.findIndex((item) => item.id === active.id);
      const newIndex = queue.findIndex((item) => item.id === over.id);

      const newQueue = arrayMove(queue, oldIndex, newIndex);
      onReorder(newQueue);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedItems(new Set());
    }
  };

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (selectedItems.size === queue.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queue.map(item => item.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedItems.size === 0) {
      toast.error('No files selected');
      return;
    }

    if (window.confirm(`Delete ${selectedItems.size} selected file(s) permanently from the server?`)) {
      const count = selectedItems.size;

      // Call onRemove for each selected item (it's async now)
      const deletePromises = Array.from(selectedItems).map(itemId => onRemove(itemId));

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      setSelectedItems(new Set());
      // Note: Individual success messages are shown by onRemove
    }
  };

  const downloadSelected = () => {
    if (selectedItems.size === 0) {
      toast.error('No files selected');
      return;
    }

    const selectedFiles = queue.filter(item => selectedItems.has(item.id));
    selectedFiles.forEach(item => {
      const fileName = item.processedFileName || item.fileName;
      // const downloadUrl = `http://52.8.201.196:80/my_files/download?name=${encodeURIComponent(fileName)}`;
      const downloadUrl = `/my_files/download?name=${encodeURIComponent(fileName)}`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    toast.success(`Downloading ${selectedItems.size} file(s)`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Queue Header */}
      <div className="p-4 border-b border-green-200 bg-green-50/80 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-[#1d1d1f]">
            Queue
            {queue.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[#86868b]">
                ({queue.length})
              </span>
            )}
          </h3>
          <button
            onClick={toggleSelectionMode}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              isSelectionMode
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSelectionMode ? 'Cancel' : 'Select'}
          </button>
        </div>

        {/* Batch Operations Bar */}
        {isSelectionMode && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white rounded-md hover:bg-gray-50 transition text-purple-700 border border-purple-300"
              title={selectedItems.size === queue.length ? 'Deselect all' : 'Select all'}
            >
              {selectedItems.size === queue.length ? (
                <>
                  <FiCheckSquare className="w-4 h-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <FiSquare className="w-4 h-4" />
                  Select All
                </>
              )}
            </button>

            <div className="flex-1 text-xs font-medium text-purple-700 text-center">
              {selectedItems.size} selected
            </div>

            <button
              onClick={downloadSelected}
              disabled={selectedItems.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download selected"
            >
              <FiDownload className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={deleteSelected}
              disabled={selectedItems.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete selected"
            >
              <FiTrash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Queue Items - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-green-50/50">
        {queue.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#86868b] font-medium">No files in queue</p>
            <p className="text-sm text-[#86868b] mt-2">Upload audio files to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={queue.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {queue.map((item) => (
                <FileQueueItem
                  key={item.id}
                  item={item}
                  isActive={item.id === currentFileId}
                  isSelected={selectedItems.has(item.id)}
                  onRemove={() => onRemove(item.id)}
                  onSelect={() => onSelect(item.id)}
                  onToggleSelect={isSelectionMode ? () => toggleItemSelection(item.id) : null}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Upload Zone - Fixed at bottom */}
      <div className="border-t border-green-200 p-4 bg-green-50/80 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <AudioUploadZone onFilesUploaded={onFilesUploaded} />
      </div>
    </div>
  );
};

export default FileQueue;
