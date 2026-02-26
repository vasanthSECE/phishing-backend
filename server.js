require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());



// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// Schema
const MessageSchema = new mongoose.Schema({
  text: String,
  prediction: String,
  reason: String,
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", MessageSchema);



// =======================
// ML MODEL ROUTE
// =======================
app.post("/predict", (req, res) => {
  const { text } = req.body;

  exec(`python ml/predict.py "${text}"`, async (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });

    const [prediction, confidence] = stdout.trim().split(",");

    res.json({
      prediction: prediction == 1 ? "Phishing" : "Legitimate",
      confidence: parseFloat(confidence),
    });
  });
});



// =======================
// GEMINI ROUTE
// =======================
app.post("/predict-gemini", async (req, res) => {
  const { text } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are a cybersecurity expert.

Classify the following message as:
- Phishing
- Legitimate

Respond strictly in JSON:
{
  "prediction": "",
  "reason": ""
}

Message:
${text}
                  `,
                },
              ],
            },
          ],
        }),
      }
    );

   const data = await response.json();

console.log("FULL GEMINI RESPONSE:", JSON.stringify(data, null, 2));

 
const rawText =
  data.candidates[0].content.parts[0].text;

console.log("Gemini Raw:", rawText);

if (!rawText || rawText.trim() === "") {
  return res.status(500).json({
    error: "Gemini returned empty response",
    fullResponse: data,
  });
}

const jsonStart = rawText.indexOf("{");
const jsonEnd = rawText.lastIndexOf("}") + 1;

if (jsonStart === -1 || jsonEnd === -1) {
  return res.status(500).json({
    error: "Gemini did not return JSON format",
    rawText,
  });
}

const jsonString = rawText.substring(jsonStart, jsonEnd);

const parsed = JSON.parse(jsonString);

res.json(parsed);

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Gemini API error" });
  }
});
app.get("/list-models", async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(5000, () => console.log("Server running on port 5000"));