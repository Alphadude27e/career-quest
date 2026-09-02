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

    const systemPrompt = `You are a highly intelligent, encouraging AI Educator helping a student master concepts for exams like JEE, NEET, and SAT.
The current learning topic is: "${topic || 'General Learning'}".
CRITICAL INSTRUCTION: 
1. If the student uploaded an image, analyze it carefully. If it is a math or science problem, solve it step-by-step.
2. Format all mathematical equations and formulas using strictly $ for inline math and $$ for display math.
3. Keep explanations clear, engaging, and structured.`;

    // Reformat messages to support Groq's multi-modal vision requirements
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => {
        // If the user uploaded an image, format it as an array payload
        if (msg.role === 'user' && msg.image) {
          return {
            role: 'user',
            content: [
              { type: 'text', text: msg.content || 'Please explain the question in this image.' },
              { type: 'image_url', image_url: { url: msg.image } }
            ]
          };
        }
        // Standard text message
        return { role: msg.role, content: msg.content };
      })
    ];

    // Use Groq's insanely fast Vision Model
    const chatStream = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'qwen/qwen3.6-27b', 
      temperature: 0.5,
      max_tokens: 2000,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of chatStream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          console.error('Vision streaming error:', err);
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
    console.error('Vision API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process vision request' },
      { status: 500 }
    );
  }
}