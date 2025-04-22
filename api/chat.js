import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  try {
    const userMessage = req.body.message;

    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let result;
    while (true) {
      result = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (result.status === "completed") break;
      if (result.status === "failed") {
        return res.status(500).json({ error: "Assistant run failed." });
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(m => m.role === "assistant");

    return res.status(200).json({
      reply: lastMessage?.content?.[0]?.text?.value || "⚠️ Sem resposta gerada."
    });
  } catch (err) {
    console.error("Erro no proxy:", err.message);
    return res.status(500).json({ error: "Erro interno no proxy." });
  }
}
