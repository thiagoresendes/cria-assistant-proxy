
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { OpenAI } from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/assistant", async (req, res) => {
  try {
    const { assistant_id, user_input } = req.body;
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: user_input,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id,
    });

    let status = "queued";
    let runResult;
    while (status !== "completed" && status !== "failed") {
      runResult = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = runResult.status;
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (status === "failed") {
      return res.status(500).json({ error: "Run failed" });
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find((m) => m.role === "assistant");
    res.json({ response: lastMessage?.content[0]?.text?.value || "" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Unexpected error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy running on port ${port}`);
});
