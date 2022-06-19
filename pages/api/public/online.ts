import { NextApiRequest, NextApiResponse } from 'next';
import * as axiosDefault from 'axios';
import cache from 'memory-cache';
const axios = axiosDefault.default;

const res = async (req: NextApiRequest, res: NextApiResponse) => {
  const { interval } = req.query;
  switch (interval) {
    case 'now': {
      const cachedRes = cache.get('active-users-now');
      if (cachedRes) {
        res.status(200).json(cachedRes);
      } else {
        const url = new URL(process.env.ANALYTICS_HOST + '/data/online');
        const query = {
          from: Math.floor((Date.now() - (15 * 60 * 1000)) / 1000),
          to: Math.floor(Date.now() / 1000),
          interval: (15 * 60)
        }

        try {
          const aRes = await axios.post(url.toString(), query, {
            headers: {
              'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`
            }
          });
          // Cache for 10 seconds
          cache.put('active-users-now', aRes.data.result[0], 1000 * 10);
          res.status(200).json(aRes.data.result);
        } catch (error) {
          res.status(500).json({ error: 'failed to fetch data' });
        }
      }
      break;
    }
    case '1-day': {
      const cachedRes = cache.get('active-users-1-day');
      if (cachedRes) {
        res.status(200).json(cachedRes);
      } else {
        const url = new URL(process.env.ANALYTICS_HOST + '/data/online');
        const query = {
          from: Math.floor((Date.now() - (24 * 60 * 60 * 1000)) / 1000),
          to: Math.floor(Date.now() / 1000),
          interval: (60 * 60)
        }

        try {
          const aRes = await axios.post(url.toString(), query, {
            headers: {
              'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`
            }
          });
          // Cache for an hour
          cache.put('active-users-1-day', aRes.data.result, 1000 * 60 * 60);
          res.status(200).json(aRes.data.result);
        } catch (error) {
          res.status(500).json({ error: 'failed to fetch data' });
        }
      }
      break;
    }
    case '7-days': {
      const cachedRes = cache.get('active-users-7-days');
      if (cachedRes) {
        res.status(200).json(cachedRes);
      } else {
        const url = new URL(process.env.ANALYTICS_HOST + '/data/online');
        const query = {
          from: Math.floor((Date.now() - (7 * 24 * 60 * 60 * 1000)) / 1000),
          to: Math.floor(Date.now() / 1000),
          interval: (60 * 60 * 6)
        }

        try {
          const aRes = await axios.post(url.toString(), query, {
            headers: {
              'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`
            }
          });
          // Cache for 3 hours
          cache.put('active-users-7-days', aRes.data.result, 1000 * 60 * 60 * 3);
          res.status(200).json(aRes.data.result);
        } catch (error) {
          res.status(500).json({ error: 'failed to fetch data' });
        }
      }
      break;
    }
    case '30-days': {
      const cachedRes = cache.get('active-users-30-days');
      if (cachedRes) {
        res.status(200).json(cachedRes);
      } else {
        const url = new URL(process.env.ANALYTICS_HOST + '/data/online');
        const query = {
          from: Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000),
          to: Math.floor(Date.now() / 1000),
          interval: (60 * 60 * 24)
        }

        try {
          const aRes = await axios.post(url.toString(), query, {
            headers: {
              'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`
            }
          });
          // Cache for a day
          cache.put('active-users-30-days', aRes.data.result, 1000 * 60 * 60 * 24);
          res.status(200).json(aRes.data.result);
        } catch (error) {
          res.status(500).json({ error: 'failed to fetch data' });
        }
      }
      break;
    }
    case '365-days': {
      const cachedRes = cache.get('active-users-365-days');
      if (cachedRes) {
        res.status(200).json(cachedRes);
      } else {
        const url = new URL(process.env.ANALYTICS_HOST + '/data/online');
        url.searchParams.set('from', (Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000)).toString());
        url.searchParams.set('to', (Math.floor(Date.now() / 1000)).toString());
        // 1 day intervals
        url.searchParams.set('interval', (60 * 60 * 24).toString());

        try {
          const aRes = await axios.get(url.toString(), {
            headers: {
              'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`
            }
          });
          // Cache for a week
          cache.put('active-users-365-days', aRes.data.result, 1000 * 60 * 60 * 24 * 7);
          res.status(200).json(aRes.data.result);
        } catch (error) {
          res.status(500).json({ error: 'failed to fetch data' });
        }
      }
      break;
    }
    default: {
      res.status(400).json({ error: 'Invalid "type" parameter, must be of [ "now", "7-days", "30-days", "365-days" ]' });
    }
  }
}

export default res;