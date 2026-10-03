const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const dataFile = path.join(__dirname, 'data.json');
const settingsFile = path.join(__dirname, 'settings.json');

if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify([]));
}

if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({ title: 'Pandinha Deck', background: '' }));
}

// Aumenta o limite para aceitar arquivos de áudio em formato Base64 sem erro
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rota especial para o OBS abrir
app.get('/obs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'obs.html'));
});

// Rotas de Áudios (Salva os dados de forma permanente no JSON)
app.get('/api/audios', (req, res) => {
    try {
        const data = fs.readFileSync(dataFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/audios', (req, res) => {
    try {
        const { name, audioData } = req.body;
        if (!audioData) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        const newAudio = { id: Date.now().toString(), name: name || 'Áudio', url: audioData };
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

// Configurações
app.get('/api/settings', (req, res) => {
    try {
        const settings = fs.readFileSync(settingsFile, 'utf8');
        res.json(JSON.parse(settings));
    } catch (err) {
        res.json({ title: 'Pandinha Deck', background: '' });
    }
});

app.post('/api/settings', (req, res) => {
    try {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        const { title, backgroundUrl } = req.body;

        if (title !== undefined) settings.title = title;
        if (backgroundUrl !== undefined) settings.background = backgroundUrl;

        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});

// Comunicação em tempo real via Socket.io
io.on('connection', (socket) => {
    socket.on('tocar-audio', (audioUrl) => {
        io.emit('disparar-som', audioUrl);
    });
});

server.listen(PORT, () => {
    console.log(`Pandinha Deck Blindado rodando na porta ${PORT}`);
});
