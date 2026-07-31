import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, category, maxResults = 20, headless = true } = body;

    if (!city || !category) {
      return new Response(JSON.stringify({ error: 'City and category are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const pythonScript = path.join(process.cwd(), 'gmaps_scraper.py');
        const args = [
          pythonScript,
          '--city', city,
          '--category', category,
          '--max-results', String(maxResults),
        ];

        if (headless) {
          args.push('--headless');
        }

        sendEvent('log', { message: `Initializing scraper for ${category} in ${city}...` });

        const child = spawn('python', args, {
          cwd: process.cwd(),
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
        });

        let outputFilePath = '';

        child.stdout.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf-8');
          const lines = text.split('\n');

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            // Check for output file path
            if (cleanLine.includes('Done! Saved to') || cleanLine.includes('Output File')) {
              const match = cleanLine.match(/Saved to\s+(.*\.json)/i) || cleanLine.match(/Output File\s+│\s+(.*\.json)/i);
              if (match && match[1]) {
                outputFilePath = match[1].trim();
              }
            }

            // Stream log update
            sendEvent('log', { message: cleanLine });
          }
        });

        child.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString('utf-8');
          if (text.trim()) {
            sendEvent('log', { message: text.trim(), isError: false });
          }
        });

        child.on('close', (code) => {
          if (code === 0 || outputFilePath) {
            // Find latest file in output directory if outputFilePath not captured directly
            if (!outputFilePath) {
              const outputDir = path.join(process.cwd(), 'output');
              if (fs.existsSync(outputDir)) {
                const files = fs.readdirSync(outputDir)
                  .filter(f => f.endsWith('.json'))
                  .map(f => ({ name: f, time: fs.statSync(path.join(outputDir, f)).mtimeMs }))
                  .sort((a, b) => b.time - a.time);

                if (files.length > 0) {
                  outputFilePath = path.join(outputDir, files[0].name);
                }
              }
            }

            if (outputFilePath && fs.existsSync(outputFilePath)) {
              try {
                const raw = fs.readFileSync(outputFilePath, 'utf-8');
                const parsedData = JSON.parse(raw);
                sendEvent('complete', {
                  file: path.basename(outputFilePath),
                  data: parsedData,
                });
              } catch (e: any) {
                sendEvent('error', { error: `Failed to parse output JSON: ${e.message}` });
              }
            } else {
              sendEvent('complete', { message: 'Scrape finished successfully.' });
            }
          } else {
            sendEvent('error', { error: `Scraper process exited with code ${code}` });
          }

          controller.close();
        });

        child.on('error', (err) => {
          sendEvent('error', { error: `Failed to start Python process: ${err.message}` });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
