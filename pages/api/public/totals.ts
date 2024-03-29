import { NextApiRequest, NextApiResponse } from 'next';
import cache from 'memory-cache';
import axios from 'axios';
import { getAxiosOpts } from '../_util';
import { EventEmitter } from 'stream';
import { rejects } from 'assert';

let gamesPlayed: number = null;
let lastCheck = (new Date('2020-01-01')).getTime();
let gamesCheck: Promise<number> | undefined;
let gamesListener: EventEmitter = new EventEmitter().setMaxListeners(1000);

const res = async (req: NextApiRequest, res: NextApiResponse) => {
  const { type } = req.query;
  switch(type) {
    case 'games-played': {
      const cachedRes = cache.get('games-played');
      if (cachedRes) {
        res.status(200).json(cachedRes);
      } else {
        if (gamesCheck) {
          await new Promise<number>((resolve, reject) => {
            gamesListener.once('done', (count: number, error: any) => {
              if (error) {
                reject(error);
              } else {
                resolve(count);
              }
            });
          })
          .then((count) => {
            const response =  {
              count
            };
            res.status(200).json(response);
          })
          .catch(() => {
            res.status(500).json({ error: 'failed to fetch data' });
          });
          return;
        }
        try {
          console.log('fetching total: Current ' + gamesPlayed + ' Last ' + lastCheck)
          const newDate = Date.now() - 1000; // Compensate for drift
          gamesCheck = new Promise<number>(async (resolve, reject) => {
            const url = new URL(process.env.ANALYTICS_HOST + '/data/events-count');
            const query = {
              from: Math.floor(lastCheck / 1000),
              to: Math.floor((newDate / 1000)),
              event_category: 'Games',
              event_key: 'gameLaunch'
            };
            
            await axios.post(url.toString(), query, getAxiosOpts())
            .then((aRes) => {
              const json: Array<any> = aRes.data.result;
              const newPlays = json.reduce<number>((prev, cur) => prev + cur.event_count, 0);
              resolve(newPlays);
            })
            .catch((err) => {
              reject(err);
            });
          })
          const count = await gamesCheck
          .then((count) => {
            gamesListener.emit('done', gamesPlayed + count, undefined)
            return count;
          })
          .catch((err) => {
            gamesListener.emit('done', 0, err)
          })
          if (typeof count === 'number') {
            gamesPlayed += count;
            lastCheck = newDate;
            const response =  {
              count: gamesPlayed
            };
            // 10 second cache
            cache.put('games-played', response, 1000 * 10);
            res.status(200).json(response);
          }
          gamesCheck = undefined;
          
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
