app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.content || "Mensagem não recebida";
    console.log("🔹 Mensagem recebida:", message);

    const thread = await openai.beta.threads.create();
    console.log("✅ Thread criada:", thread.id);

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });
    console.log("✉️ Mensagem enviada para o thread.");

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });
    console.log("▶️ Run iniciado:", run.id);

    let result;
    while (true) {
      result = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log("⏳ Status atual:", result.status);
      if (result.status === "completed") break;
      if (result.status === "failed") {
        console.error("❌ Run falhou:", result);
        return res.status(500).json({ error: "Assistant run failed." });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const last = messages.data.find((msg) => msg.role === "assistant");
    const resposta = last?.content?.[0]?.text?.value || "Sem resposta gerada.";
    console.log("✅ Resposta do Assistant:", resposta);

    return res.status(200).json({ reply: resposta });
  } catch (err) {
    console.error("❌ Erro no proxy:", err.message);
    return res.status(500).json({ error: "Erro interno no proxy." });
  }
});
