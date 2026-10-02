const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'public', 'uploads');
const dataFile = path.join(__dirname, 'data.json');
const settingsFile = path.join(__dirname, 'settings.json');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify([]));
}

if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({ title: 'Pandinha Deck', background: '' }));
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// Rotas de Áudios
app.get('/api/audios', (req, res) => {
    try {
        const data = fs.readFileSync(dataFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/audios', upload.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        const name = req.body.name || 'Áudio';
        const fileUrl = `/uploads/${req.file.filename}`;
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        const newAudio = { id: Date.now().toString(), name: name, url: fileUrl };
        data.push(newAudio);
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        res.json({ success: true, audio: newAudio });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar o áudio.' });
    }
});

app.put('/api/audios', (req, res) => {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar dados.' });
    }
});

app.delete('/api/audios/:id', (req, res) => {
    try {
        const audioId = req.params.id;
        let data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        const audioIndex = data.findIndex(a => a.id === audioId);
        if (audioIndex !== -1) {
            const audioPath = path.join(__dirname, 'public', data[audioIndex].url);
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
            data.splice(audioIndex, 1);
            fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Áudio não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar.' });
    }
});

// Rotas de Configurações (Título e Papel de Parede por Upload ou Link)
app.get('/api/settings', (req, res) => {
    try {
        const settings = fs.readFileSync(settingsFile, 'utf8');
        res.json(JSON.parse(settings));
    } catch (err) {
        res.json({ title: 'Pandinha Deck', background: '' });
    }
});

app.post('/api/settings', upload.single('backgroundFile'), (req, res) => {
    try {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        
        if (req.body.title) {
            settings.title = req.body.title;
        }

        if (req.file) {
            settings.background = `/uploads/${req.file.filename}`;
        } else if (req.body.backgroundUrl !== undefined) {
            settings.background = req.body.backgroundUrl;
        }

        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});

app.listen(PORT, () => {
    console.log(`Pandinha Deck atualizado rodando na porta ${PORT}`);
});
