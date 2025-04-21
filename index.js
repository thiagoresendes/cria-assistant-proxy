import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { OpenAI } from "openai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/", async (req, res) => {
  try {
    const { userMessage } = req.body;

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID
    });

    let result;
    while (true) {
      result = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (result.status === "completed") break;
      if (result.status === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(msg => msg.role === "assistant");

    return res.status(200).json({
      reply: lastMessage?.content?.[0]?.text?.value || "Sem resposta gerada."
    });

  } catch (error) {
    console.error("Erro no proxy:", error.message);
    return res.status(500).json({ error: "Erro interno no proxy." });
  }
});

app.listen(port, () => {
  console.log(`Proxy rodando na porta ${port}`);
});
