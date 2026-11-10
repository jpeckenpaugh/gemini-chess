import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

const audioDir = path.resolve(__dirname, 'public/assets/audio/dialogue');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Serve public static assets
app.use(express.static(path.resolve(__dirname, 'public')));

// Helper: Convert raw PCM 16-bit mono 24000Hz to valid RIFF WAV buffer
function pcmToWav(pcmData: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // SubChunk1Size for PCM
  header.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// Route: Get current list of baked dialogue files
app.get('/api/dialogue/status', (_req, res) => {
  try {
    const files = fs.existsSync(audioDir) ? fs.readdirSync(audioDir) : [];
    res.json({ success: true, count: files.length, files });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Route: Pre-bake dialogue line using Gemini TTS
app.post('/api/dialogue/bake', async (req, res) => {
  const { id, text, persona } = req.body;
  if (!id || !text) {
    return res.status(400).json({ error: 'Missing id or text' });
  }

  const targetPath = path.join(audioDir, `${id}.wav`);
  if (fs.existsSync(targetPath)) {
    return res.json({ success: true, cached: true, file: `/assets/audio/dialogue/${id}.wav` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Your API key can be found in the Settings > Secrets panel.'
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Request TTS generation from gemini-3.8-flash-tts
    const prompt = persona
      ? `Persona: ${persona}. Speak with natural Gothic drama: "${text}"`
      : `Speak clearly with theatrical medieval inflection: "${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: prompt,
      config: {
        responseMimeType: 'audio/x-wav'
      }
    });

    // Check for inline audio bytes or candidates
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let audioBuffer: Buffer | null = null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        audioBuffer = Buffer.from(part.inlineData.data, 'base64');
        break;
      }
    }

    if (!audioBuffer) {
      // Fallback: If returned raw bytes or different container, construct standard wav
      return res.status(502).json({
        error: 'No audio stream returned from Gemini TTS model',
        partsCount: parts.length
      });
    }

    // Ensure it has a RIFF WAV header if it was raw PCM
    if (audioBuffer.slice(0, 4).toString('ascii') !== 'RIFF') {
      audioBuffer = pcmToWav(audioBuffer);
    }

    fs.writeFileSync(targetPath, audioBuffer);
    res.json({ success: true, file: `/assets/audio/dialogue/${id}.wav` });
  } catch (err: unknown) {
    console.error('Error generating TTS:', err);
    res.status(500).json({ error: (err as Error).message || String(err) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Wizard Chess server listening on port ${port}`);
  });
}

startServer();
