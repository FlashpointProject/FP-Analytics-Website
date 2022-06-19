import { NextApiRequest, NextApiResponse } from 'next';
import cache from 'memory-cache';
import axios from 'axios';
import { getAxiosOpts } from '../_util';

let gamesPlayed = 4500000;

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
          const query = {
            from: Math.floor((new Date("2020-01-01").getTime() / 1000)),
            to: Math.floor((Date.now() / 1000)),
            event_category: 'b',
          };
  
          const aRes = await axios.post(url.toString(), query, getAxiosOpts());
          // 10 Second Cache
          cache.put('games-played', aRes.data.result, 1000 * 10);
          res.status(200).json(aRes.data.result);
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
