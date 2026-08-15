import { NextApiRequest, NextApiResponse } from 'next';
import { normalizeCountry } from '../_country';
import { ActivityHeatmapRange, serveActivityHeatmapChart } from '../_chart_cache';

const heatmapRanges: ActivityHeatmapRange[] = ['30d'];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const rawRange = Array.isArray(req.query.range) ? req.query.range[0] : req.query.range;
  const selectedRange = rawRange || '30d';
  if (!heatmapRanges.includes(selectedRange as ActivityHeatmapRange)) {
    res.status(400).json({ error: 'Invalid "range" parameter, must be one of [ "30d" ]' });
    return;
  }

  const country = normalizeCountry(req.query.country);
  if (country === false) {
    res.status(400).json({ error: 'Invalid "country" parameter, must be a 2-3 letter country code' });
    return;
  }

  serveActivityHeatmapChart(res, selectedRange as ActivityHeatmapRange, country || undefined);
};

export default handler;
