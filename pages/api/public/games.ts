import { NextApiRequest, NextApiResponse } from 'next';
import { fetchGames, fetchRandomGames } from '../_directus';
import cache from 'memory-cache';
import axios from 'axios';
import { getAxiosOpts } from '../_util';

const oldest = (new Date('2020-01-01')).getTime();

// Get games played in order
const res = async (req: NextApiRequest, res: NextApiResponse) => {
  // Load Directus Info

  const { limit } = req.query;
  // Get all gameLaunches counted
  const allGames = cache.get('all-games');
  if (allGames) {
    if (limit && typeof limit === 'string') {
      try {
        res.status(200).json(allGames.slice(0, limit));
      } catch {
        res.status(500).json({ error: 'limit is not a valid number' });
      }
    } else {
      res.status(200).json(allGames);
    }
    return;
  } else {
    try {
      const url = new URL(process.env.ANALYTICS_HOST + '/data/events-count');
      const query = {
        from: Math.floor(oldest / 1000),
        to: Math.floor(Date.now() / 1000),
        event_category: 'Games',
        event_key: 'gameLaunch'
      };

      const aRes = await axios.post(url.toString(), query, getAxiosOpts());
      const data: Array<any> = aRes.data.result;
      let response = data.sort((a, b) => a.event_value - b.event_value).map<Game>(d => {
        return {
          id: d.event_value,
          playCount: d.event_count
        };
      });

      try {
        response = await fillWithDirectus(response);
      } catch (err) {
        console.error(err);
      }
      
      // 1 Hour cache
      cache.put('all-games', response, 1000 * 60 * 60);
      if (limit && typeof limit === 'string') {
        try {
          res.status(200).json(response.slice(0, parseInt(limit)));
        } catch {
          res.status(500).json({ error: 'limit is not a valid number' });
        }
      } else {
        res.status(200).json(response);
      }
    } catch (err) {
      res.status(500).json({ error: 'failed to fetch data' });
    }
  }
};

async function fillWithDirectus(games: Game[]) {
  const directusGames = await fetchGames(games.slice(0,50).map(g => g.id));
  games[0].title = 'Poptropica'; // REMOVE THIS LATER
  for (const g of directusGames) {
    const gameIdx = games.findIndex(game => game.id === g.id);
    if (gameIdx > -1) {
      games[gameIdx].title = g.title;
    }
  }
  return games;
}

type Game = {
  id: string;
  playCount: string;
  title?: string;
}

export default res;
