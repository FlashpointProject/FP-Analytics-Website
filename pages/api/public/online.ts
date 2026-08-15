import { NextApiRequest, NextApiResponse } from 'next';
import { activeUsersKey, getRange, serveCachedChart } from '../_chart_cache';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { interval, range } = req.query;
  if (interval === 'now') {
    serveCachedChart(res, 'active-now');
    return;
  }

  const selectedRange = getRange(range || interval);
  if (!selectedRange) {
    res.status(400).json({ error: 'Invalid "range" parameter, must be one of [ "24h", "30d" ]' });
    return;
  }

  serveCachedChart(res, activeUsersKey(selectedRange));
};

export default handler;
