import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { examName } = await req.json();

    const prompt = `You are an expert academic advisor. Provide standard schedule and bulletin details for the entrance exam or test: "${examName}".
You MUST return ONLY a valid JSON object matching this exact structure, with no extra markdown blocks or text outside the JSON:
{
  "title": "Exact standard name of the exam",
  "stream": "Relevant stream (e.g. Science (PCM), Arts, Commerce, Global)",
  "examDate": "Expected or standard exam timeframe/date",
  "applicationDeadline": "Expected registration deadline window",
  "eligibility": "Standard eligibility criteria for students",
  "officialWebsite": "https://official-website-url.org"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.1, // <-- Extremely low temperature prevents conversational text
      max_tokens: 1000,
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';
    
    // Aggressive JSON cleaner to strip out any stubborn Markdown ticks the AI adds
    const cleanJSON = rawContent
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim();
      
    const examDetails = JSON.parse(cleanJSON);

    return NextResponse.json({ exam: examDetails });
  } catch (error: any) {
    // This logs the actual crash reason to your VS Code terminal
    console.error('Exam generation error:', error); 
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exam details' }, 
      { status: 500 }
    );
  }
}