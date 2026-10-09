const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// قائمة بالنماذج المتاحة حسب الأولوية
const MODELS_PRIORITY = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

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

  let lastError = null;

  // المحاولة التلقائية التنقل بين النماذج في حال وجود ضغط (503)
  for (const modelName of MODELS_PRIORITY) {
    try {
      console.log(`Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(contents);
      const response = await result.response;
      
      // في حال النجاح نرجع النتيجة فوراً ونوقف المحاولات
      return res.json({ result: response.text() });
    } catch (error) {
      console.error(`Error with ${modelName}:`, error.message);
      lastError = error;
      // إذا كان الخطأ بسبب الضغط (503)، سيستمر السيرفر للمحاولة بالنموذج التالي
    }
  }

  // إذا فشلت كل النماذج بسبب الضغط العالي
  res.status(503).json({ 
    error: "السيرفرات تعاني من ضغط عالٍ حالياً، يرجى إعادة المحاولة بعد بضع ثوانٍ." 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
