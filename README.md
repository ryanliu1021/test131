# Audio Speed Controller - Quick Start Guide

## Overview

This project consists of:
- **Backend**: Node.js + Express server with FFmpeg audio processing
- **Frontend**: React + Tailwind CSS single-page application

## Quick Start

### 1. Start the Backend Server

Open a terminal in the project root:

```bash
# Install backend dependencies (if not already done)
npm install

# Start the backend server
node my_server.js
```

You should see:
```
Server running at http://localhost:3000
Waiting for file uploads...
```

### 2. Start the Frontend Application

Open a NEW terminal and navigate to the frontend:

```bash
cd audio-app

# Install frontend dependencies (if not already done)
npm install

# Start the frontend server
npm run dev

# Access frontend server

Input "localhost:5173" into your browser of choice. NOTE: Backend server must be running for the program to do anything.
