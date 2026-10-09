const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// قائمة بالنماذج الأكثر استقراراً حسب الأولوية
const MODELS_TO_TRY = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro"
];

// دالة تأخير بين المحاولات عند وجود ضغط
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.post('/api/generate', async (req, res) => {
  const { prompt, imageBase64 } = req.body;

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

  // تجربة كل نموذج مرتين مع الانتظار
  for (const modelName of MODELS_TO_TRY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Trying ${modelName} - Attempt ${attempt}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(contents);
        const response = await result.response;

        return res.json({ result: response.text() });
      } catch (error) {
        console.error(`Error with ${modelName} (attempt ${attempt}):`, error.message);
        // إذا كان خطأ ضغط (503)، ننتظر ثانيتين ثم نكرر أو ننتقل للنموذج التالي
        await sleep(2000);
      }
    }
  }

  res.status(503).json({
    error: "سيرفرات جوجل تشهد ضغطاً كبيراً جداً الآن، يرجى الانتظار دقيقة والمحاولة مرة أخرى."
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
