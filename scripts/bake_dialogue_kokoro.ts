import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KokoroTTS } from 'kokoro-js';
import manifest from '../src/dialogueManifest.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../public/assets/audio/dialogue');
const appVoicesDir = '/app/voices';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(appVoicesDir)) {
  fs.mkdirSync(appVoicesDir, { recursive: true });
}

// Accent & Voice Mapping:
// White Team -> British (en-gb)
// Black Team -> American (en-us)
const TEAM_VOICE_MAP: Record<'w' | 'b', Record<string, string>> = {
  w: {
    pawn: 'bm_george',    // British soldier
    knight: 'bm_lewis',    // British knight herald
    bishop: 'bm_fable',    // British cathedral cleric
    rook: 'bm_daniel',     // Deep British heavy fortress
    queen: 'bf_isabella',  // British regal queen
    king: 'bm_lewis',      // British monarch
  },
  b: {
    pawn: 'am_adam',       // American infantry grunt
    knight: 'am_fenrir',   // American aggressive cavalry
    bishop: 'am_michael',  // American zealous inquisitor
    rook: 'am_onyx',       // American deep juggernaut
    queen: 'af_bella',     // American commanding imperator
    king: 'am_puck',       // American battlefield king
  }
};

async function ensureVoiceBin(voiceId: string) {
  const target = path.join(appVoicesDir, `${voiceId}.bin`);
  if (fs.existsSync(target)) return;

  console.log(`Downloading voice embedding: ${voiceId}.bin ...`);
  const url = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${voiceId}.bin`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download voice ${voiceId}: ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(target, buf);
  console.log(`Saved ${voiceId}.bin to ${appVoicesDir}`);
}

async function main() {
  console.log('=== Pre-Baking Team Differentiated Dialogue with Kokoro TTS ===');

  // Collect all unique voices required across both teams
  const allVoices = new Set<string>();
  for (const teamCfg of Object.values(TEAM_VOICE_MAP)) {
    for (const v of Object.values(teamCfg)) {
      allVoices.add(v);
    }
  }

  for (const v of allVoices) {
    await ensureVoiceBin(v);
  }

  console.log('Initializing KokoroTTS (ONNX 82M)...');
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', { dtype: 'q8' });

  type ManifestItem = { id: string; text: string; ttsText?: string; file: string };

  for (const [teamColor, teamData] of Object.entries(manifest)) {
    if (teamColor !== 'w' && teamColor !== 'b') continue;
    const voiceCfg = TEAM_VOICE_MAP[teamColor as 'w' | 'b'];

    for (const [pieceType, actions] of Object.entries(teamData)) {
      if (pieceType === 'accent') continue;
      const voice = voiceCfg[pieceType] || (teamColor === 'w' ? 'bm_george' : 'am_adam');

      for (const [actionName, items] of Object.entries(actions as Record<string, ManifestItem[]>)) {
        for (const item of items) {
          const outPath = path.join(outputDir, `${item.id}.wav`);
          const textToSpeak = item.ttsText || item.text;
          console.log(`[Team ${teamColor.toUpperCase()} | ${pieceType} ${actionName}] Voice ${voice}: "${textToSpeak}"`);
          const audio = await tts.generate(textToSpeak, { voice, speed: 1.0 });
          await audio.save(outPath);
          console.log(`  -> Saved ${item.id}.wav`);
        }
      }
    }
  }

  console.log('All team-differentiated dialogue beats successfully baked!');
}

main().catch(console.error);
