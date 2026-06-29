const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.get("/", (req, res) => {
  res.send("Bot de Mitsue funcionando ✅");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== "page") {
      return res.sendStatus(404);
    }

    for (const entry of body.entry) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender.id;

        if (event.message && event.message.text) {
          const userMessage = event.message.text;
          const reply = await crearRespuesta(userMessage);
          await enviarMensaje(senderId, reply);
        }
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Error en webhook:", error.message);
    res.status(200).send("EVENT_RECEIVED");
  }
});

async function crearRespuesta(mensajeCliente) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Eres el asistente de Mitsue, agente inmobiliaria en Aichi, Japón. Responde de forma amable, clara y profesional. Atiende en español o portugués según el idioma del cliente. Ayuda con casas en venta, precios, ubicación, visitas, préstamos y dudas generales. Si el cliente quiere agendar una visita, pide día, hora, nombre y teléfono. El teléfono de Mitsue es 070-5430-3345."
      },
      {
        role: "user",
        content: mensajeCliente
      }
    ],
    max_tokens: 200
  });

  return completion.choices[0].message.content;
}

async function enviarMensaje(senderId, texto) {
  await axios.post(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: senderId },
      message: { text: texto }
    }
  );
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor funcionando en puerto ${PORT}`);
});
