import { NextApiRequest, NextApiResponse } from 'next';
import { serveCachedChart } from '../_chart_cache';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { type } = req.query;
  switch(type) {
    case 'games-played': {
      serveCachedChart(res, 'games-total');
      break;
    }
    case 'animations-watched': {
      res.status(200).json({ count: 500000 + Math.random() * 150000 });
      break;
    }
    default: {
      res.status(400).json({ error: 'Invalid "type" parameter, must be of [ "games-played", "animation-watched" ]'});
      break;
    }
  }
};

export default handler;
