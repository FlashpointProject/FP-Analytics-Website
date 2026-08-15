import axios from 'axios';

const gameDBHost = process.env.GAME_DB_API_HOST || 'https://db-api.unstable.life';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GameTitle = {
  id: string;
  title: string;
}

export async function fetchGameTitles(ids: string[]): Promise<GameTitle[]> {
  const seen: Record<string, true> = {};
  const uniqueIds = ids.filter(id => {
    if (!uuidPattern.test(id) || seen[id]) {
      return false;
    }
    seen[id] = true;
    return true;
  });
  const responses = await Promise.allSettled(uniqueIds.map(fetchGameTitle));

  return responses.flatMap(response => {
    if (response.status !== 'fulfilled' || !response.value) {
      return [];
    }
    return [response.value];
  });
}

async function fetchGameTitle(id: string): Promise<GameTitle | null> {
  const url = new URL('/search', gameDBHost);
  url.searchParams.set('id', id);
  url.searchParams.set('filter', 'false');
  url.searchParams.set('fields', 'id,title');

  const res = await axios.get<GameTitle[]>(url.toString(), {
    timeout: 5000
  });
  return res.data[0] || null;
}
