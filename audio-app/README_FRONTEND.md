# Audio Speed Controller - Frontend

A modern React + Tailwind CSS web application for uploading, managing, and playing audio files with speed control.

## Features

- **Drag & Drop Upload**: Upload audio files with a beautiful drag-and-drop interface
- **Audio Player**: Full-featured audio player with seek controls
- **Playback Controls**: Play, pause, skip forward/backward
- **Loop Mode**: Toggle between looping current file or auto-advancing to next
- **Speed Control**: Adjust playback speed (0.25x - 4.0x) with custom input
- **File Queue**: Manage multiple files with drag-to-reorder functionality
- **Real-time Updates**: Socket.io integration for instant upload notifications
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **React**
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - Real-time communication
- **@dnd-kit** - Drag and drop functionality
- **React Icons** - Icon library
- **React Hot Toast** - Toast notifications

## Installation & Usage

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open browser at http://localhost:5173

Make sure backend is running on port 3000!
