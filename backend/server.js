import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ytSearch from 'yt-search';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.json({
                reply: "I am ready to be fully dynamic! To unlock my real AI brain, please paste your Gemini API Key into the backend/.env file and restart the server."
            });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are the Pratik AI Assistant. Reply concisely and helpfully. 
If the user asks you to generate, create, or show an image/photo/picture, DO NOT say you cannot. Instead, reply EXACTLY with the tag: [IMAGE: <highly detailed description of the image>]
If the user asks you to play a song or music, DO NOT say you cannot. Instead, reply EXACTLY with the tag: [MUSIC: <song name and artist>]
User says: ${message}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error('Error in chat API:', error);
        
        // Handle Gemini API 503 Service Unavailable
        if (error.status === 503 || error.message?.includes('503')) {
            return res.json({ 
                reply: "I am having trouble connecting to my AI brain right now (Gemini API is temporarily overloaded). Please try again in a few seconds!"
            });
        }
        
        res.status(500).json({ error: 'Failed to process request' });
    }
});

app.post('/api/execute', (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'No command' });

    // System execution for local assistant capability
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message, stderr });
        }
        res.json({ output: stdout, success: true });
    });
});

app.post('/api/music', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'No query provided' });
        
        const result = await ytSearch(query);
        const videos = result.videos.slice(0, 1);
        if (videos.length > 0) {
            const videoId = videos[0].videoId;
            res.json({ success: true, embedUrl: `https://www.youtube.com/embed/${videoId}` });
        } else {
            res.json({ success: false, message: 'No song found.' });
        }
    } catch (error) {
        console.error('Error fetching music:', error);
        res.status(500).json({ error: 'Failed to find music' });
    }
});

app.get('/api/image', async (req, res) => {
    try {
        const { prompt } = req.query;
        if (!prompt) return res.status(400).send('No prompt provided');

        const cleanPrompt = encodeURIComponent(prompt.substring(0, 500));
        const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=400&height=400&nologo=true`;

        const imageRes = await fetch(url);
        if (!imageRes.ok) {
            return res.status(imageRes.status).send('Generation failed');
        }

        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(buffer);
    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(500).send('Proxy Error');
    }
});


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
