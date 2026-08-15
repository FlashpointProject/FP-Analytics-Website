import { NextApiRequest, NextApiResponse } from 'next';
import { normalizeCountry } from '../_country';
import { getHardwareKey, getRange, serveHardwareChart } from '../_chart_cache';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const selectedRange = getRange(req.query.range, '30d');
  if (!selectedRange) {
    res.status(400).json({ error: 'Invalid "range" parameter, must be one of [ "24h", "30d" ]' });
    return;
  }

  const country = normalizeCountry(req.query.country);
  if (country === false) {
    res.status(400).json({ error: 'Invalid "country" parameter, must be a 2-3 letter country code' });
    return;
  }

  const hardwareKey = getHardwareKey(req.query.key);
  if (hardwareKey === null) {
    res.status(400).json({ error: 'Invalid "key" parameter, must be one of [ "memory", "arch", "operatingSystem" ]' });
    return;
  }

  serveHardwareChart(res, selectedRange, country || undefined, hardwareKey);
};

export default handler;
