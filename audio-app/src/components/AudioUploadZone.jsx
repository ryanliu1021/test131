import { useState, useRef } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AudioUploadZone = ({ onFilesUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      toast.error('Please drop audio files only');
      return;
    }

    handleFiles(audioFiles);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = async (files) => {
    setIsUploading(true);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('myFile', file);
        formData.append('speed', '1.0'); // Default speed

        // const response = await fetch('http://52.8.201.196:80/my_files', {
        const response = await fetch('/my_files', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          toast.success(`${file.name} uploaded successfully`);
          if (onFilesUploaded) {
            onFilesUploaded(file);
          }
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Error uploading ${file.name}`);
      }
    }

    setIsUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-all duration-200
        ${isDragging
          ? 'border-green-400 bg-green-100'
          : 'border-green-300 hover:border-green-400 hover:bg-green-100/50 bg-green-50/30'
        }
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading ? (
        <div>
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-base text-[#86868b] font-medium">Uploading...</p>
        </div>
      ) : (
        <>
          <FiUploadCloud className="mx-auto h-14 w-14 text-[#86868b] mb-4" />
          <p className="text-base text-[#1d1d1f] font-semibold mb-2">
            Drop audio files here
          </p>
          <p className="text-sm text-[#86868b]">
            or click to browse
          </p>
        </>
      )}
    </div>
  );
};

export default AudioUploadZone;
