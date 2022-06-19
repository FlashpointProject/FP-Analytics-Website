import axios from 'axios';
import cache from 'memory-cache';
import { NextApiRequest, NextApiResponse } from 'next';

const res = async (_: NextApiRequest, res: NextApiResponse) => {
  // Generate demo data
  const cachedRes = cache.get('geo-map');
	if (cachedRes) {
		res.status(200).json(cachedRes);
	} else {
		const url = new URL(process.env.ANALYTICS_HOST + '/data/online');
		const query = {
			from: Math.floor((Date.now() - (1000 * 60 * 60 * 24 * 30)) / 1000),
			to: Math.floor(Date.now() / 1000),
			interval: (60 * 60 * 24 * 30)
		}

		try {
			const aRes = await axios.post(url.toString(), query, {
				headers: {
					'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`
				}
			});
			const geo = Array.isArray(aRes.data.result) ? aRes.data.result[0].per_country : aRes.data.result.per_country;
			// Cache for 10 seconds
			cache.put('geo-map', geo, 1000 * 60 * 60 * 24);
			res.status(200).json(geo);
		} catch (error) {
			res.status(500).json({ error: 'failed to fetch data' });
		}
	}
};

export default res;
