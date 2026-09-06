import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { topic, messages } = await req.json();

    // 1. Removed the 300-word limit so it can give you a deep, rich explanation
    // 2. Added a strict instruction to NEVER output internal <think> logs
    const systemPrompt = `You are a highly intelligent, encouraging AI Educator helping a student master concepts for exams like JEE, NEET, and SAT.
The current learning topic is: "${topic || 'General Learning'}".

CRITICAL INSTRUCTIONS:
1. Provide a highly detailed, step-by-step foundational explanation of the topic. Break down key formulas, concepts, and common pitfalls.
2. Format all mathematical equations and formulas using strictly $ for inline math and $$ for display math.
3. DO NOT output any internal thinking processes, <think> tags, or mental drafts. Output ONLY the final educational response directly to the student.
4. Conclude with one concise, engaging follow-up check question to test their understanding.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => {
        if (msg.role === 'user' && msg.image) {
          return {
            role: 'user',
            content: [
              { type: 'text', text: msg.content || 'Please explain the question in this image.' },
              { type: 'image_url', image_url: { url: msg.image } }
            ]
          };
        }
        return { role: msg.role, content: msg.content };
      })
    ];

    // Switched to a model with much higher token capacity and increased max_tokens
    const chatStream = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'openai/gpt-oss-120b', 
      temperature: 0.5,
      max_tokens: 2500, 
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of chatStream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              // Strip out any accidental <think> tags just in case
              const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
              controller.enqueue(encoder.encode(cleanText));
            }
          }
        } catch (err) {
          console.error('Streaming error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}