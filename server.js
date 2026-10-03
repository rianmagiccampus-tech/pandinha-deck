const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// CONEXÃO OFICIAL COM O SUPABASE DA PANDINHA
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qiewqlompfnqfsdzfimz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZXdxbG9tcGZucWZzZHpmaW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5ODg3MzEsImV4cCI6MjEwNjU2NDczMX0.UjL7UBLNJb7o7qddLfIPT4BKPum8fVCyHl3XoNuUbt0';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rota para o OBS
app.get('/obs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'obs.html'));
});

// Funções para ler e gravar no Banco de Dados do Supabase
async function getAppData() {
    const { data, error } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'app_config')
        .single();
    
    if (error || !data) {
        return { title: 'Pandinha Deck', background: '', volume: 100, audios: [] };
    }
    return data.data;
}

async function saveAppData(newData) {
    await supabase
        .from('settings')
        .update({ data: newData })
        .eq('id', 'app_config');
}

// Rotas de Áudios integradas com o Supabase
app.get('/api/audios', async (req, res) => {
    try {
        const appData = await getAppData();
        res.json(appData.audios || []);
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/audios', async (req, res) => {
    try {
        const { name, audioData, loop } = req.body;
        if (!audioData) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

        const appData = await getAppData();
        if (!appData.audios) appData.audios = [];

        const newAudio = { 
            id: Date.now().toString(), 
            name: name || 'Áudio', 
            url: audioData, 
            loop: loop || false 
        };
        appData.audios.push(newAudio);

        await saveAppData(appData);
        res.json({ success: true, audio: newAudio });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar o áudio.' });
    }
});

app.put('/api/audios', async (req, res) => {
    try {
        const appData = await getAppData();
        appData.audios = req.body;
        await saveAppData(appData);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar dados.' });
    }
});

app.delete('/api/audios/:id', async (req, res) => {
    try {
        const audioId = req.params.id;
        const appData = await getAppData();
        if (!appData.audios) appData.audios = [];

        const index = appData.audios.findIndex(a => a.id === audioId);
        if (index !== -1) {
            appData.audios.splice(index, 1);
            await saveAppData(appData);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Áudio não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar.' });
    }
});

// Configurações (Incluindo Volume Geral)
app.get('/api/settings', async (req, res) => {
    try {
        const appData = await getAppData();
        res.json({ 
            title: appData.title || 'Pandinha Deck', 
            background: appData.background || '', 
            volume: appData.volume !== undefined ? appData.volume : 100 
        });
    } catch (err) {
        res.json({ title: 'Pandinha Deck', background: '', volume: 100 });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const appData = await getAppData();
        const { title, backgroundUrl, volume } = req.body;

        if (title !== undefined) appData.title = title;
        if (backgroundUrl !== undefined) appData.background = backgroundUrl;
        if (volume !== undefined) appData.volume = volume;

        await saveAppData(appData);
        res.json({ success: true, settings: appData });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});

io.on('connection', (socket) => {
    socket.on('tocar-audio', (audioData) => {
        io.emit('disparar-som', audioData);
    });
});

server.listen(PORT, () => {
    console.log(`Pandinha Deck Pro rodando na porta ${PORT}`);
});
