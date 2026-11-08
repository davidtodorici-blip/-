import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Cloud Sync Storage Directory
import fs from 'fs';
const STORAGE_DIR = path.resolve(__dirname, '.sync-data');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function getStorageFilePath(email: string): string {
  const safeEmail = email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  return path.join(STORAGE_DIR, `${safeEmail}.json`);
}

// In-memory sync codes for cross-device one-tap pairing
const pairingCodes: Record<string, { email: string; expiresAt: number }> = {};

// API: Get tasks for account
app.get('/api/sync/tasks', (req, res) => {
  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const filePath = getStorageFilePath(email);
  if (!fs.existsSync(filePath)) {
    return res.json({ success: true, tasks: null, lastSyncedAt: null });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    res.json({
      success: true,
      tasks: data.tasks || [],
      lastSyncedAt: data.lastSyncedAt || Date.now(),
    });
  } catch (err: any) {
    console.error('Error reading sync data:', err);
    res.status(500).json({ error: 'Failed to read cloud tasks' });
  }
});

// API: Save tasks for account
app.post('/api/sync/tasks', (req, res) => {
  const { email, tasks } = req.body;
  if (!email || !Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Email and tasks array are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const filePath = getStorageFilePath(cleanEmail);
  const now = Date.now();

  try {
    const dataToSave = {
      email: cleanEmail,
      tasks,
      lastSyncedAt: now,
    };
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    res.json({
      success: true,
      lastSyncedAt: now,
      count: tasks.length,
    });
  } catch (err: any) {
    console.error('Error writing sync data:', err);
    res.status(500).json({ error: 'Failed to save cloud tasks' });
  }
});

// API: Create a 6-digit Device Pairing Code (e.g. for HP Google Book or new phone)
app.post('/api/sync/pairing-code', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Generate 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pairingCodes[code] = {
    email: String(email).trim().toLowerCase(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
  };

  res.json({ success: true, code });
});

// API: Resolve a 6-digit Device Pairing Code
app.post('/api/sync/resolve-code', (req, res) => {
  const { code } = req.body;
  if (!code || !pairingCodes[code]) {
    return res.status(404).json({ error: 'Неверный или устаревший код синхронизации' });
  }

  const entry = pairingCodes[code];
  if (Date.now() > entry.expiresAt) {
    delete pairingCodes[code];
    return res.status(410).json({ error: 'Срок действия кода истек' });
  }

  res.json({ success: true, email: entry.email });
});

// Endpoint: Parse voice or natural language text into an Eisenhower Matrix task
app.post('/api/gemini/parse-task', async (req, res) => {
  const text = req.body?.text;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text prompt is required' });
  }

  try {

    const prompt = `Пользователь надиктовал или написал задачу для Матрицы Эйзенхауэра:
"${text}"

Твоя задача — извлечь:
1. Чистое название задачи (title) на русском языке без лишних командных слов.
2. Целевой квадрант (quadrant):
   - "q1" (Сделать / Выполнить / Срочно и Важно / Сделать сейчас)
   - "q2" (Запланировать / План / Важно но не срочно / В календарь)
   - "q3" (Делегировать / Поручить / Срочно но не важно)
   - "q4" (Отложить / Отбросить / Удалить / Не срочно и не важно)
   Если приоритет явно не указан, определи наиболее подходящий квадрант по смыслу или поставь "q1" для срочных дел, "q2" для стратегических, "q3" для рутины, "q4" для второстепенного.
3. Дата и время выполнения (dueDate) в формате ISO (например "2026-11-09T18:00"), если в тексте упомянуты сроки (сегодня, завтра, в пятницу, в 15:00, через два часа и т.д.). Текущая дата для контекста: ${new Date().toISOString()}. Если срок не указан, верни null.
4. Краткое пояснение (reasoning) в 1 коротком предложении.`;

    if (!ai) {
      throw new Error('Gemini API key is not configured');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Очищенное название задачи',
            },
            quadrant: {
              type: Type.STRING,
              description: 'Квадрант: q1, q2, q3 или q4',
            },
            dueDate: {
              type: Type.STRING,
              description: 'ISO строка даты и времени или null',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Краткое объяснение распределения',
            },
          },
          required: ['title', 'quadrant'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    let targetQuadrant = parsed.quadrant || 'q1';
    if (!['q1', 'q2', 'q3', 'q4'].includes(targetQuadrant)) {
      targetQuadrant = 'q1';
    }

    res.json({
      title: parsed.title || text,
      quadrant: targetQuadrant,
      dueDate: parsed.dueDate || null,
      reasoning: parsed.reasoning || 'Обработано Gemini AI',
    });
  } catch (err: any) {
    console.warn('Gemini API error, falling back to smart local rule parser:', err.message);

    // Smart local fallback parser
    const lower = text.toLowerCase();
    let targetQuadrant = 'q1';
    let reasoning = 'Определено: Сделать сейчас';

    if (lower.includes('отложить') || lower.includes('отбросить') || lower.includes('не важно') || lower.includes('потом')) {
      targetQuadrant = 'q4';
      reasoning = 'Определен приоритет: Отложить / Отбросить (Q4)';
    } else if (lower.includes('делегировать') || lower.includes('поручить') || lower.includes('передать')) {
      targetQuadrant = 'q3';
      reasoning = 'Определен приоритет: Делегировать (Q3)';
    } else if (lower.includes('запланировать') || lower.includes('план') || lower.includes('календар')) {
      targetQuadrant = 'q2';
      reasoning = 'Определен приоритет: Запланировать (Q2)';
    } else if (lower.includes('сделать') || lower.includes('выполнить') || lower.includes('срочно')) {
      targetQuadrant = 'q1';
      reasoning = 'Определен приоритет: Сделать (Q1)';
    }

    // Clean leading keywords
    let cleanTitle = text
      .replace(/^(сделать|запланировать|делегировать|отложить|отбросить|выполнить|поручить)\s*[:\-–—]?\s*/i, '')
      .trim();

    if (!cleanTitle) cleanTitle = text;

    // Detect simple dates (e.g. завтра в 15:00)
    let detectedDueDate: string | null = null;
    const now = new Date();
    if (lower.includes('завтра')) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeMatch = lower.match(/в\s*(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        tomorrow.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
      } else {
        tomorrow.setHours(18, 0, 0, 0);
      }
      const tzOffset = tomorrow.getTimezoneOffset() * 60000;
      detectedDueDate = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    } else if (lower.includes('сегодня')) {
      const today = new Date();
      const timeMatch = lower.match(/в\s*(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        today.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
      } else {
        today.setHours(18, 0, 0, 0);
      }
      const tzOffset = today.getTimezoneOffset() * 60000;
      detectedDueDate = new Date(today.getTime() - tzOffset).toISOString().slice(0, 16);
    }

    res.json({
      title: cleanTitle,
      quadrant: targetQuadrant,
      dueDate: detectedDueDate,
      reasoning,
    });
  }
});

// Mount Vite middleware in development or static in production
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
