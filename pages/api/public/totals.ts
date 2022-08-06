import { NextApiRequest, NextApiResponse } from 'next';
import cache from 'memory-cache';
import axios from 'axios';
import { getAxiosOpts } from '../_util';

let gamesPlayed: number = null;
let lastCheck = (new Date('2020-01-01')).getTime();

const res = async (req: NextApiRequest, res: NextApiResponse) => {
  const { type } = req.query;
  switch(type) {
    case 'games-played': {
      const cachedRes = cache.get('games-played');
      if (cachedRes) {
        res.status(200).json(cachedRes);
      } else {
        try {
          const url = new URL(process.env.ANALYTICS_HOST + '/data/events-count');
          const newDate = Date.now();
          const query = {
            from: Math.floor(lastCheck / 1000),
            to: Math.floor((newDate / 1000)),
            event_category: 'Games',
            event_key: 'gameLaunch'
          };
          
          const aRes = await axios.post(url.toString(), query, getAxiosOpts());
          const json: Array<any> = aRes.data.result;
          const newPlays = json.reduce<number>((prev, cur) => prev + cur.event_count, 0);
          // 10 Second Cache
          gamesPlayed += newPlays;
          if (gamesPlayed === (newPlays * 2)) {
            // Duplicate call, just add initial burst once
            gamesPlayed = newPlays;
          }
          lastCheck = newDate;

          const response =  {
            count: gamesPlayed
          };
          cache.put('games-played', response, 1000 * 10);
          res.status(200).json(response);
        } catch (err) {
          res.status(500).json({ error: 'failed to fetch data' });
        }
      }
      break;
    }
    case 'animations-watched': {
      const count = 500000 + Math.random() * 150000
      res.status(200).json({ count });
      break;
    }
    default: {
      res.status(400).json({ error: 'Invalid "type" parameter, must be of [ "games-played", "animation-watched" ]'});
      break;
    }
  }
};

export default res;
