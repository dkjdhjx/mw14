const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, imageBase64 } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let contents = [];
    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contents = [
        prompt || "عدل هذه الصورة",
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          }
        }
      ];
    } else {
      contents = [prompt];
    }

    const result = await model.generateContent(contents);
    const response = await result.response;
    res.json({ result: response.text() });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message || "حدث خطأ في السيرفر" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
