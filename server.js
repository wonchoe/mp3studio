const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 8765);
const ROOT = __dirname;
const ENV_PATH = path.join(ROOT, ".env");
const MAX_BODY_BYTES = 300 * 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function loadEnvFile() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) {
    return env;
  }

  const raw = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

const envFile = loadEnvFile();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPEN_AI || envFile.OPENAI_API_KEY || envFile.OPEN_AI || "";
const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || envFile.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || envFile.OPENAI_IMAGE_MODEL || "gpt-image-1";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || envFile.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || envFile.TELEGRAM_CHAT_ID || "@wonchoe_music";
const OPENAI_TEXT_TIMEOUT_MS = Number(process.env.OPENAI_TEXT_TIMEOUT_MS || envFile.OPENAI_TEXT_TIMEOUT_MS || 90000);
const OPENAI_IMAGE_TIMEOUT_MS = Number(process.env.OPENAI_IMAGE_TIMEOUT_MS || envFile.OPENAI_IMAGE_TIMEOUT_MS || 120000);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(text);
}

function safeJoin(root, requestPath) {
  const normalized = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
  const resolved = path.join(root, normalized);
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

function serveStatic(request, response) {
  const requestPath = request.url === "/" ? "/index.html" : new URL(request.url, `http://${HOST}:${PORT}`).pathname;
  const filePath = safeJoin(ROOT, requestPath);
  if (!filePath) {
    sendText(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        sendText(response, 404, "File not found");
        return;
      }

      sendText(response, 500, "Server error");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) {
        return;
      }

      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error("Request body too large"));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (settled) {
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        settled = true;
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        settled = true;
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}

function openAiHeaders() {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is missing in .env");
  }

  return {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };
}

function extractResponseText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const texts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        texts.push(content.text);
      }
    }
  }
  return texts.join("\n").trim();
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model did not return JSON");
    }
    return JSON.parse(match[0]);
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.message === "timeout")) {
      throw new Error(`Upstream request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function openAiTextJson(systemPrompt, userPayload) {
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: openAiHeaders(),
    body: JSON.stringify({
      model: OPENAI_TEXT_MODEL,
      temperature: 0.5,
      max_output_tokens: 1400,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(userPayload, null, 2) }],
        },
      ],
    }),
  }, OPENAI_TEXT_TIMEOUT_MS);

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : {};
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI text request failed with ${response.status}`);
  }

  const text = extractResponseText(payload);
  return tryParseJson(text);
}

async function generateCoverImage(prompt) {
  const response = await fetchWithTimeout("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: openAiHeaders(),
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      quality: "low",
    }),
  }, OPENAI_IMAGE_TIMEOUT_MS);

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : {};
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI image request failed with ${response.status}`);
  }

  const item = payload.data?.[0] || null;
  if (!item) {
    throw new Error("OpenAI image response did not include image data");
  }

  return {
    imageBase64: item.b64_json || null,
    imageUrl: item.url || null,
  };
}

async function handleAiFill(request, response) {
  const body = await readJsonBody(request);
  const systemPrompt = [
    "You fill MP3 release metadata for an audio publishing workflow.",
    "Return only valid JSON.",
    "IMPORTANT: The artist is ALWAYS 'The Ravonix and Voltaris'. Never change artist, composer, lyricist, producer, label, or copyright — they must all be 'The Ravonix and Voltaris'.",
    "IMPORTANT: You MUST always generate a creative, catchy, unique song title that matches the musical style/genre/mood. Never leave title empty or as 'Untitled'. Invent an original name.",
    "Keep other existing values if they are already present and stronger than guesses.",
    "Return this object shape: { fields: { title, version, artist, featured-artists, album, release-type, genres, subgenre, mood, language, bpm, key, label, composer, lyricist, producer, isrc, upc, year, copyright, tags, short-description, description, marketing-hook, distribution-notes } }.",
    "Do not include markdown fences.",
  ].join(" ");

  const result = await openAiTextJson(systemPrompt, body);
  sendJson(response, 200, result);
}

async function handleGenerateCover(request, response) {
  const body = await readJsonBody(request);
  const promptParts = [
    "Create a modern square album cover for a music release.",
    "Make it bright, luminous, bold, saturated, high-energy, premium and polished for streaming platforms.",
    "Avoid dark, gloomy, muddy, monochrome, black-dominant or horror-like imagery.",
    "Absolutely no text, no letters, no words, no title, no artist name, no logo, no watermark, no typography anywhere in the image.",
    "Focus on pure visual composition, strong shapes, vibrant lighting and clean professional artwork.",
    body.prompt ? `Creative brief: ${body.prompt}` : "Creative brief: bright modern music artwork with strong color and motion.",
  ];

  if (body.artist) {
    promptParts.push(`Artist vibe reference only, do not render text: ${body.artist}.`);
  }

  const prompt = promptParts.join(" ");

  const image = await generateCoverImage(prompt);
  sendJson(response, 200, image);
}

function telegramApiUrl(method) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("Telegram bot token is missing. Create one via @BotFather and add TELEGRAM_BOT_TOKEN to .env");
  }

  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
}

async function telegramRequest(method, formData) {
  const response = await fetch(telegramApiUrl(method), {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description || `Telegram ${method} failed with ${response.status}`);
  }

  return payload;
}

function base64ToBlob(base64, mimeType) {
  return new Blob([Buffer.from(base64, "base64")], { type: mimeType || "application/octet-stream" });
}

function sanitizeMetadataValue(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function buildComment(metadata) {
  const fields = [
    metadata.version,
    metadata["short-description"],
    metadata.description,
    metadata["marketing-hook"],
    metadata["distribution-notes"],
    metadata.tags,
  ]
    .map(sanitizeMetadataValue)
    .filter(Boolean);

  return fields.join(" | ").slice(0, 1000);
}

function appendMetadataArgs(ffmpegArgs, metadata = {}) {
  const pairs = [
    ["title", metadata.title],
    ["artist", metadata.artist],
    ["album", metadata.album],
    ["album_artist", metadata.artist],
    ["genre", Array.isArray(metadata.genres) ? metadata.genres.join(", ") : metadata.genres],
    ["date", metadata.year],
    ["copyright", metadata.copyright],
    ["composer", metadata.composer],
    ["publisher", metadata.label],
    ["track", metadata.version],
    ["isrc", metadata.isrc],
    ["TBPM", metadata.bpm],
    ["initialkey", metadata.key],
    ["comment", buildComment(metadata)],
  ];

  for (const [key, rawValue] of pairs) {
    const value = sanitizeMetadataValue(rawValue);
    if (!value) {
      continue;
    }

    ffmpegArgs.push("-metadata", `${key}=${value}`);
  }
}

async function transcodeAudioBufferToMp3({ sourceBuffer, sourceName, gainDb = 0, metadata = null, cover = null }) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "mp3suite-"));
  const sourceExtension = path.extname(sourceName || "") || ".bin";
  const sourcePath = path.join(tempDir, `source${sourceExtension}`);
  const outputPath = path.join(tempDir, "output.mp3");
  let coverPath = null;

  try {
    await fs.promises.writeFile(sourcePath, sourceBuffer);

    if (cover?.dataBase64) {
      const coverExtension = path.extname(cover.name || "") || (cover.mimeType === "image/png" ? ".png" : ".jpg");
      coverPath = path.join(tempDir, `cover${coverExtension}`);
      await fs.promises.writeFile(coverPath, Buffer.from(cover.dataBase64, "base64"));
      console.log("[ffmpeg] cover written to", coverPath, "size:", Buffer.from(cover.dataBase64, "base64").length, "bytes");
    } else {
      console.log("[ffmpeg] no cover data provided");
    }

    const ffmpegArgs = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      sourcePath,
    ];

    if (coverPath) {
      ffmpegArgs.push("-i", coverPath);
    }

    if (Number.isFinite(gainDb) && Math.abs(gainDb) > 0.001) {
      ffmpegArgs.push("-filter:a", `volume=${gainDb}dB`);
    }

    ffmpegArgs.push("-map", "0:a");

    if (coverPath) {
      ffmpegArgs.push(
        "-map",
        "1:v",
        "-c:v",
        "mjpeg",
        "-disposition:v",
        "attached_pic",
        "-metadata:s:v",
        "title=Album cover",
        "-metadata:s:v",
        "comment=Cover (front)",
      );
    }

    ffmpegArgs.push(
      "-c:a",
      "libmp3lame",
      "-b:a",
      "320k",
      "-id3v2_version",
      "3",
    );

    appendMetadataArgs(ffmpegArgs, metadata || {});
    ffmpegArgs.push(outputPath);

    console.log("[ffmpeg] args:", ffmpegArgs.join(" "));

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);
      let stderr = "";

      ffmpeg.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || `ffmpeg failed with code ${code}`));
          return;
        }

        resolve();
      });
    });

    return await fs.promises.readFile(outputPath);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

async function handleExportAudio(request, response) {
  const body = await readJsonBody(request);
  const mp3Buffer = await buildMp3FromBody(body);
  sendJson(response, 200, {
    ok: true,
    audioBase64: mp3Buffer.toString("base64"),
    mimeType: "audio/mpeg",
    fileName: (body.audio.name || "release").replace(/\.[^.]+$/, "") + ".mp3",
  });
}

function buildMp3FromBody(body) {
  if (!body.audio?.dataBase64) {
    throw new Error("Audio export payload is missing");
  }

  const sourceBuffer = Buffer.from(body.audio.dataBase64, "base64");
  const gainDb = Number(body.audio.gainDb || 0);
  const metadata = Object.assign({}, body.metadata || {});

  if (!metadata.artist) {
    metadata.artist = "The Ravonix and Voltaris";
  }

  console.log("[transcode] cover:", body.cover ? `yes (${(body.cover.dataBase64 || "").length} chars base64, mime=${body.cover.mimeType})` : "no");
  console.log("[transcode] metadata:", JSON.stringify(metadata).slice(0, 300));

  return transcodeAudioBufferToMp3({
    sourceBuffer,
    sourceName: body.audio.name,
    gainDb,
    metadata,
    cover: body.cover || null,
  });
}

async function makeTelegramThumbnail(coverBase64, coverMimeType) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "mp3thumb-"));
  const inputExt = coverMimeType === "image/png" ? ".png" : ".jpg";
  const inputPath = path.join(tempDir, `input${inputExt}`);
  const outputPath = path.join(tempDir, "thumb.jpg");

  try {
    await fs.promises.writeFile(inputPath, Buffer.from(coverBase64, "base64"));

    await new Promise((resolve, reject) => {
      const proc = spawn("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-vf", "scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=black",
        "-q:v", "5",
        outputPath,
      ]);
      let stderr = "";
      proc.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code !== 0) { reject(new Error(stderr.trim() || `ffmpeg thumb failed code ${code}`)); return; }
        resolve();
      });
    });

    const jpegBuffer = await fs.promises.readFile(outputPath);
    console.log("[telegram] thumbnail created:", jpegBuffer.length, "bytes (JPEG 320x320)");
    return jpegBuffer;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

async function handleSendTelegram(request, response) {
  const body = await readJsonBody(request);
  const caption = typeof body.caption === "string" ? body.caption.slice(0, 1000) : "New release";
  const chatId = TELEGRAM_CHAT_ID;

  const mp3Buffer = await buildMp3FromBody(body);
  const fileName = (body.audio.name || "release").replace(/\.[^.]+$/, "") + ".mp3";
  console.log("[telegram] mp3 ready, size:", mp3Buffer.length, "bytes, file:", fileName);

  const audioForm = new FormData();
  audioForm.set("chat_id", chatId);
  audioForm.set("caption", caption);
  audioForm.set("audio", new Blob([mp3Buffer], { type: "audio/mpeg" }), fileName);

  if (body.cover?.dataBase64) {
    try {
      const thumbBuffer = await makeTelegramThumbnail(body.cover.dataBase64, body.cover.mimeType);
      audioForm.set("thumbnail", new Blob([thumbBuffer], { type: "image/jpeg" }), "cover.jpg");
    } catch (err) {
      console.error("[telegram] thumbnail conversion failed, skipping:", err.message);
    }
  }

  if (body.metadata?.title) {
    audioForm.set("title", String(body.metadata.title).slice(0, 200));
  }

  if (body.metadata?.artist) {
    audioForm.set("performer", String(body.metadata.artist).slice(0, 200));
  } else {
    audioForm.set("performer", "The Ravonix and Voltaris");
  }

  await telegramRequest("sendAudio", audioForm);

  sendJson(response, 200, {
    ok: true,
    message: `Release sent to Telegram channel ${chatId}`,
  });
}

async function routeApi(request, response) {
  try {
    if (request.method === "GET" && request.url === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        service: "mp3studio",
        uptime: Math.round(process.uptime()),
      });
      return true;
    }

    if (request.method === "POST" && request.url === "/api/ai-fill") {
      await handleAiFill(request, response);
      return true;
    }

    if (request.method === "POST" && request.url === "/api/generate-cover") {
      await handleGenerateCover(request, response);
      return true;
    }

    if (request.method === "POST" && request.url === "/api/send-telegram") {
      await handleSendTelegram(request, response);
      return true;
    }

    if (request.method === "POST" && request.url === "/api/export-audio") {
      await handleExportAudio(request, response);
      return true;
    }

    if (request.url.startsWith("/api/")) {
      sendJson(response, 404, { error: "Unknown API route" });
      return true;
    }

    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = message === "Request body too large" ? 413 : 500;
    sendJson(response, statusCode, { error: message });
    return true;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const handled = await routeApi(request, response);
    if (handled) {
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: `Unsupported method ${request.method}` });
      return;
    }

    serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`MP3 Suite server running at http://${HOST}:${PORT}`);
});