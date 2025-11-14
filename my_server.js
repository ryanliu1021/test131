/*
  npm install express multer socket.io
*/

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://52.8.201.196",
    methods: ["GET", "POST"]
  }
});

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://52.8.201.196');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const domain_name = "52.8.201.196";
const port = 80;

const name_of_file_folder = "my_files";
const path_to_file_folder = path.join(__dirname, name_of_file_folder);

// Create the folder if it doesn't exist
if (!fs.existsSync(path_to_file_folder)) {
    fs.mkdirSync(path_to_file_folder, { recursive: true });
    console.log(`Created folder: ${path_to_file_folder}`);
}

// Serve static files (uploaded files, HTML, JS, CSS)
app.use('/' + name_of_file_folder, express.static(path_to_file_folder));
app.use(express.static(__dirname)); // serve upload.html and download.html

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path_to_file_folder),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Serve upload page
app.get('/upload.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'upload.html'));
});

// Serve download page
app.get('/download.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'download.html'));
});

// Delete file and all its processed versions
app.delete('/my_files/delete', express.json(), (req, res) => {
    const { fileName } = req.body;

    if (!fileName) {
        return res.status(400).json({ error: 'Missing fileName' });
    }

    const filepath = path.join(path_to_file_folder, fileName);

    // Security check: prevent directory traversal
    const rel = path.relative(path_to_file_folder, filepath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    const deletedFiles = [];
    const errors = [];

    // Delete the original file
    if (fs.existsSync(filepath)) {
        try {
            fs.unlinkSync(filepath);
            deletedFiles.push(fileName);
            console.log(`Deleted: ${fileName}`);
        } catch (err) {
            console.error(`Error deleting ${fileName}:`, err);
            errors.push({ file: fileName, error: err.message });
        }
    }

    // Find and delete all processed versions of this file
    try {
        const allFiles = fs.readdirSync(path_to_file_folder);

        // Match files like: faster_filename.mp3, speed_1.5x_filename.mp3, speed_2x_filename.mp3
        const processedFiles = allFiles.filter(file => {
            return file.includes(fileName) && (file.startsWith('faster_') || file.startsWith('speed_'));
        });

        processedFiles.forEach(file => {
            const processedPath = path.join(path_to_file_folder, file);
            try {
                fs.unlinkSync(processedPath);
                deletedFiles.push(file);
                console.log(`Deleted processed file: ${file}`);
            } catch (err) {
                console.error(`Error deleting ${file}:`, err);
                errors.push({ file, error: err.message });
            }
        });
    } catch (err) {
        console.error('Error reading directory:', err);
        errors.push({ error: 'Failed to read directory' });
    }

    if (deletedFiles.length > 0) {
        io.emit('file-deleted', fileName);
        res.json({
            success: true,
            deletedFiles,
            message: `Deleted ${deletedFiles.length} file(s)`
        });
    } else if (errors.length > 0) {
        res.status(500).json({ error: 'Failed to delete files', errors });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

//Extracting metadata from file.
app.get('/file-metadata/:filename', (req, res) => {
    const filepath = path.join(path_to_file_folder, req.file.filename);
    if (!fs.existsSync(filepath)) {
        console.error("File does not exist.");
        res.send("The requested file doesn't exist.");
    }
    ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) {
            console.log(err);
            res.send("An error has occurred while attempting to fetch metadata.");
        } else {
            res.send(`Metadata:` +
                `Name: ${metadata.filename}`
                `\nDuration: ${metadata.duration}`
                `\nBitrate: ${metadata.bitrate}`
                `\nSpeed: ${metadata.speed}`
            );
        }
    });
});

// Handle file upload and modify speed
app.post('/my_files', upload.single('myFile'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    io.emit('processing-start', req.file.filename);
    let speed;
    if (req.body.speed === undefined) {
        speed = 1.0;
    } else {
        if (parseFloat(req.body.speed) < 0.25 || parseFloat(req.body.speed) > 4.0) {
            console.log(`Invalid speed. The entered speed was: ${parseFloat(req.body.speed)}`);
            io.emit('processing-error', req.file.filename, Error('ERRINVSPD'));
            res.send(`Invalid speed. You entered: ${parseFloat(req.body.speed)}.
            The speed has to be between 0.25 and 4.0(inclusive).`);
        } else {
            speed = parseFloat(req.body.speed);
        }
    }

    console.log(`Received file: ${req.file.filename}, Speed: ${speed}x`);
    io.emit('file-received', req.file.filename); // notify browser

    const inputPath = path.join(path_to_file_folder, req.file.filename);

    // If speed is 1.0, no need to process - just use the original file
    if (speed === 1.0) {
        console.log(`Speed is 1.0x - using original file without processing`);
        // Immediately emit file-processed with the original filename
        io.emit('file-processed', { fileName: req.file.filename, outputFilename: req.file.filename, speed: 1.0 });
        res.send(`File uploaded successfully! No processing needed at 1.0x speed.`);
        return;
    }

    const outputFilename = `speed_${speed}x_${req.file.filename}`;
    const outputPath = path.join(path_to_file_folder, outputFilename);

    // Handle atempo filter for speeds outside ffmpeg's native range (0.5-2.0)
    let filterString;
    if (speed >= 0.5 && speed <= 2.0) {
        filterString = `atempo=${speed}`;
    } else if (speed < 0.5) {
        // Chain atempo filters for very slow speeds
        const factor1 = 0.5;
        const factor2 = speed / factor1;
        filterString = `atempo=${factor1},atempo=${factor2}`;
    } else {
        // Chain atempo filters for very fast speeds
        const factor1 = 2.0;
        const factor2 = speed / factor1;
        filterString = `atempo=${factor1},atempo=${factor2}`;
    }

    ffmpeg(inputPath)
        .audioFilter(filterString)
        .on('end', () => {
            console.log(`Audio speed modified to ${speed}x: ${outputPath}`);
            io.emit('file-processed', { fileName: req.file.filename, outputFilename, speed });
        })
        .on('error', (err) => {
            console.error('Error modifying audio:', err);
            io.emit('processing-error', err.message);
        })
        .save(outputPath);

    res.send(`File uploaded successfully! Processing at ${speed}x speed.`);
});


// Handle file download
app.get('/my_files/download', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).send('Missing ?name=');

    const abs = path.resolve(path_to_file_folder, name);
    const rel = path.relative(path_to_file_folder, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return res.status(400).send('Bad filename');
    if (!fs.existsSync(abs)) return res.status(404).send('Not found');

    res.download(abs, name, err => {
        if (err && !res.headersSent) res.status(500).send('Server error');
    });

    console.log(`Client downloaded file: ${name}`);
});

// Change speed for existing file
app.post('/my_files/change-speed', express.json(), (req, res) => {
    const { fileName, speed } = req.body;

    if (!fileName || !speed) {
        return res.status(400).json({ error: 'Missing fileName or speed' });
    }

    const speedValue = parseFloat(speed);
    if (isNaN(speedValue) || speedValue < 0.25 || speedValue > 4.0) {
        return res.status(400).json({ error: 'Speed must be between 0.25 and 4.0' });
    }

    const inputPath = path.join(path_to_file_folder, fileName);

    if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    const outputFilename = `speed_${speedValue}x_${fileName}`;
    const outputPath = path.join(path_to_file_folder, outputFilename);

    console.log(`Re-processing file: ${fileName} at ${speedValue}x speed`);
    io.emit('processing-start', fileName);

    // Handle atempo filter for speeds outside ffmpeg's native range (0.5-2.0)
    let filterString;
    if (speedValue >= 0.5 && speedValue <= 2.0) {
        filterString = `atempo=${speedValue}`;
    } else if (speedValue < 0.5) {
        // Chain atempo filters for very slow speeds
        const factor1 = 0.5;
        const factor2 = speedValue / factor1;
        filterString = `atempo=${factor1},atempo=${factor2}`;
    } else {
        // Chain atempo filters for very fast speeds
        const factor1 = 2.0;
        const factor2 = speedValue / factor1;
        filterString = `atempo=${factor1},atempo=${factor2}`;
    }

    ffmpeg(inputPath)
        .audioFilter(filterString)
        .on('end', () => {
            console.log(`Audio speed modified to ${speedValue}x: ${outputPath}`);
            io.emit('file-processed', { fileName, outputFilename, speed: speedValue });
            res.json({ success: true, outputFilename, speed: speedValue });
        })
        .on('error', (err) => {
            console.error('Error modifying audio:', err);
            io.emit('processing-error', err.message);
            res.status(500).json({ error: 'Processing failed', message: err.message });
        })
        .save(outputPath);
});

// List all files
app.get('/list-files', (req, res) => {
    fs.readdir(path_to_file_folder, (err, files) => {
        if (err) return res.status(500).json([]);
        res.json(files);
    });
});

// Return the last modified processed audio file (any speed)
app.get('/latest-faster-file', (req, res) => {
    fs.readdir(path_to_file_folder, (err, files) => {
        if (err) return res.status(500).json({ filename: null });

        // Match both old 'faster_' and new 'speed_1.5x_' style files
        const processedFiles = files.filter(f =>
            f.startsWith('faster_') || f.startsWith('speed_')
        );

        if (processedFiles.length === 0) return res.json({ filename: null });

        processedFiles.sort((a, b) => {
            const aTime = fs.statSync(path.join(path_to_file_folder, a)).mtimeMs;
            const bTime = fs.statSync(path.join(path_to_file_folder, b)).mtimeMs;
            return bTime - aTime; // newest first
        });

        res.json({ filename: processedFiles[0] });
    });
});


// Start server
server.listen(port, () => {
    console.log(`Server running at http://${domain_name}:${port}`);
    console.log('Waiting for file uploads...');
});
