import { NextApiRequest, NextApiResponse } from 'next';
import { geoKey, getRange, serveCachedChart } from '../_chart_cache';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const selectedRange = getRange(req.query.range, '30d');
  if (!selectedRange) {
    res.status(400).json({ error: 'Invalid "range" parameter, must be one of [ "24h", "30d" ]' });
    return;
  }

  serveCachedChart(res, geoKey(selectedRange));
};

export default handler;
