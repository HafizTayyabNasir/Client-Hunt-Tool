import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    const outputDir = path.join(process.cwd(), 'output');

    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({ files: [], data: null });
    }

    if (fileName) {
      // Return specific file content
      const filePath = path.join(outputDir, path.basename(fileName));
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(rawData);
      return NextResponse.json({ file: fileName, data: jsonData });
    }

    // List all json files in output directory
    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.json'))
      .map(file => {
        try {
          const filePath = path.join(outputDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw);
          const meta = data.metadata || {};
          return {
            filename: file,
            city: meta.city || 'Unknown',
            category: meta.category || 'Unknown',
            total_businesses: meta.total_businesses || 0,
            total_with_email: meta.total_with_email || 0,
            total_with_phone: meta.total_with_phone || 0,
            total_with_website: meta.total_with_website || 0,
            total_with_instagram: meta.total_with_instagram || 0,
            total_with_facebook: meta.total_with_facebook || 0,
            scrape_started: meta.scrape_started || '',
            scrape_completed: meta.scrape_completed || '',
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b?.scrape_started || '').localeCompare(a?.scrape_started || ''));

    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
