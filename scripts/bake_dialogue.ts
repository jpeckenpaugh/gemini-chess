import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import manifest from '../src/dialogueManifest.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../public/assets/audio/dialogue');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate an expressive, procedural fallback speech-synthesized WAV for any lines
// that have not yet been pre-baked via the server endpoint, so the game immediately plays dialogue.
function generatePlaceholderDialogueWav(text: string, pitch = 220, sampleRate = 24000): Buffer {
  const duration = Math.min(3.0, Math.max(0.8, text.length * 0.08));
  const numSamples = Math.floor(sampleRate * duration);
  const pcm = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Layered formants mimicking resonant stone chanting
    const f1 = Math.sin(2 * Math.PI * pitch * t);
    const f2 = 0.5 * Math.sin(2 * Math.PI * (pitch * 1.5) * t);
    const f3 = 0.25 * Math.sin(2 * Math.PI * (pitch * 2.2) * t);
    const envelope = Math.sin(Math.PI * (i / numSamples));
    const sampleVal = Math.floor((f1 + f2 + f3) * envelope * 14000);
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, sampleVal)), i * 2);
  }

  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);  // Block align
  header.writeUInt16LE(16, 34); // Bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

async function main() {
  console.log('Ensuring all dialogue beats in manifest are provisioned on disk...');
  type ManifestItem = { id: string; text: string; persona: string; file: string };
  const entries: ManifestItem[] = [];

  for (const pieceCategory of Object.values(manifest)) {
    for (const actionCategory of Object.values(pieceCategory)) {
      if (Array.isArray(actionCategory)) {
        entries.push(...(actionCategory as ManifestItem[]));
      }
    }
  }

  for (const entry of entries) {
    const targetPath = path.join(outputDir, `${entry.id}.wav`);
    if (!fs.existsSync(targetPath)) {
      console.log(`Baking initial dialogue asset for [${entry.id}]: "${entry.text}"`);
      const pitch = entry.id.includes('pawn') ? 220 : entry.id.includes('queen') ? 340 : 160;
      const wav = generatePlaceholderDialogueWav(entry.text, pitch);
      fs.writeFileSync(targetPath, wav);
    } else {
      console.log(`Asset exists: ${entry.id}.wav`);
    }
  }

  console.log(`Dialogue bake complete! ${entries.length} beats ready in public/assets/audio/dialogue/`);
}

main().catch(console.error);
