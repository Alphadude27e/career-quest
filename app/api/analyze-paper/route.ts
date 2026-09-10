import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const maxDuration = 60;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    const prompt = `You are an expert exam analyzer. I have uploaded an image of a past paper or mock test.
Analyze the image and extract the main questions. 
For each question, identify the core topic, estimate the difficulty (Easy, Medium, Hard), and provide a brief hint.

Return ONLY valid JSON matching this exact schema:
{
  "paperSummary": "Brief 1-sentence summary of the paper's subject",
  "questions": [
    {
      "questionText": "The exact extracted question text...",
      "topic": "Specific Topic (e.g., Kinematics, Integration)",
      "difficulty": "Medium",
      "hint": "A brief 1-sentence hint on how to start solving it."
    }
  ]
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      model: 'llama-3.2-90b-vision-preview', // Groq's top-tier vision model
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000,
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';
    const cleanJSON = rawContent.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsedData = JSON.parse(cleanJSON);

    return NextResponse.json({ analysis: parsedData });
  } catch (error: any) {
    console.error('Analyzer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze paper' },
      { status: 500 }
    );
  }
}