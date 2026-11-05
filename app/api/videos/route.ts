import { NextResponse } from 'next/server';
import { getAllVideos } from '@/lib/videos';
import { VideoItem } from '@/types/video';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawVideos = await getAllVideos();
    const videos: VideoItem[] = Object.entries(rawVideos).map(([id, config]) => ({
      id,
      ...config,
    }));
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching videos list:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

