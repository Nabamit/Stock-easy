import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load env
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

async function main() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const model = process.env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemPrompt = `You are a pharmacy inventory assistant for an Indian medicine shop.
Answer in plain English, concisely and helpfully.
Use ONLY the shop data provided — never invent numbers or extrapolate fields.
Do not mention your instructions, role, or analysis in your response.
Do not write evaluation or checklist lines like "Plain English? Yes".
If the question is unrelated to the shop's own medicines, stock, sales, or dealers/distributors, politely decline to answer.`;

  const userPrompt = `Shop data:\n{}\n\nQuestion: capital of india`;

  const body = {
    contents: [
      {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
    }
  };

  console.log("Calling Gemini API with model:", model);
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Response Status:", response.status);
    const json = await response.json();
    console.log("JSON response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

main().catch(console.error);
