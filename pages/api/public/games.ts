import { NextApiRequest, NextApiResponse } from 'next';
import { normalizeCountry } from '../_country';
import { getGamesRange, serveGamesChart } from '../_chart_cache';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const selectedRange = getGamesRange(req.query.range, '30d');
  if (!selectedRange) {
    res.status(400).json({ error: 'Invalid "range" parameter, must be one of [ "24h", "30d", "1y" ]' });
    return;
  }

  const country = normalizeCountry(req.query.country);
  if (country === false) {
    res.status(400).json({ error: 'Invalid "country" parameter, must be a 2-3 letter country code' });
    return;
  }

  serveGamesChart(res, selectedRange, country || undefined);
};

export default handler;
