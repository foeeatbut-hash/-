import express from "express";
import path from "path";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { HVACLAB_SYSTEM_PROMPT } from "./ai_context";
import { getOfflineResponse } from "./offlineDb";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/chat/status", (req, res) => {
    const isApiActive = !!process.env.GEMINI_API_KEY;
    res.json({ active: isApiActive });
  });

  // API route for Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { query, imageBase64, history } = req.body;

      if (!query && !imageBase64) {
        return res.status(400).json({ error: "Missing query or image" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        // Fallback without API key
        let demoText = "";
        
        if (imageBase64) {
             demoText = `К сожалению, интеллектуальный анализ изображений и скриншотов доступен только в онлайн-режиме (когда активен серверный ИИ). Пожалуйста, задайте вопрос текстом, и я с удовольствием отвечу вам по формулам и функционалу!`;
        } else {
             demoText = getOfflineResponse(query, history);
        }
        
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Split into tokens (preserving whitespace) to stream naturally
        const tokens = demoText.match(/(\S+|\s+)/g) || [];
        for (const token of tokens) {
             const payload = JSON.stringify({ text: token });
             res.write(`data: ${payload}\n\n`);
             // sleep for streaming effect
             await new Promise(r => setTimeout(r, 4 + Math.random() * 6));
        }
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      const systemInstruction = HVACLAB_SYSTEM_PROMPT;

      // Filter out empty messages and ensure we build a clean alternating history.
      const validHistory = history ? history.filter((msg: any) => msg.text.trim() !== '' || msg.image) : [];
      // Usually, Gemini wants the first message to be from 'user'.
      // If the first message in our history is the default greeting ('ai'), we omit it.
      if (validHistory.length > 0 && validHistory[0].sender === 'ai' && validHistory[0].id === 'initial-msg') {
        validHistory.shift();
      }

      const contents = validHistory.length > 0
        ? [
            ...validHistory.map((msg: any) => {
              const parts: any[] = [];
              if (msg.image) {
                parts.push({
                  inlineData: {
                    data: msg.image.replace(/^data:image\/\w+;base64,/, ""),
                    mimeType: "image/png"
                  }
                });
              }
              if (msg.text) {
                parts.push({ text: msg.text });
              }
              return {
                role: msg.sender === 'user' ? 'user' : 'model',
                parts
              };
            })
          ]
        : [];
        
      // Append the current query
      const currentParts: any[] = [];
      if (imageBase64) {
        currentParts.push({
          inlineData: {
            data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
            mimeType: "image/png"
          }
        });
      }
      if (query) {
        currentParts.push({ text: query });
      } else {
        currentParts.push({ text: "Что на этом снимке экрана?" });
      }
      
      contents.push({ role: 'user', parts: currentParts });

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          const payload = JSON.stringify({ text: c.text });
          res.write(`data: ${payload}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Chat API error:", error);
      
      // If headers are already sent, we stream the error text
      if (res.headersSent) {
          const payload = JSON.stringify({ text: `\n\n**Ошибка AI:** ${error.message}` });
          res.write(`data: ${payload}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
      } else {
          // If headers aren't sent, we can still start a stream to display it nicely
          res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          const payload = JSON.stringify({ text: `**Ошибка подключения к ИИ.**\nУбедитесь в наличии интернет-соединения и повторите попытку.\n\nДетали: ${error.message}` });
          res.write(`data: ${payload}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await Function('return import("vite")')() as any;
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
