import { NextApiRequest, NextApiResponse } from 'next';
import cache from 'memory-cache';
import axios from 'axios';

const res = async (_: NextApiRequest, res: NextApiResponse) => {
  const cachedHardware = cache.get('hardware');
  if (cachedHardware) {
    res.status(200).json(cachedHardware);
  } else {
    const url = new URL(process.env.ANALYTICS_HOST + '/data/events-count');
    const query = {
			from: Math.floor((Date.now() - (1000 * 60 * 60 * 24 * 30)) / 1000),
			to: Math.floor(Date.now() / 1000),
      event_category: 'Hardware'
		};

    try {
      const aRes = await axios.post(url.toString(), query, {
        headers: {
          'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`
        }
      });
      const totals: Hardware = {
        operatingSystem: [],
        arch: [],
        memory: []
      };
      for (const row of aRes.data.result) {
        totals[row['event_key']].push({
          name: row['event_value'],
          count: row['event_count']
        })
      }
      totals.operatingSystem = groupOperatingSystems(totals.operatingSystem);
      // Cache for an hour
      cache.put('hardware', totals, 1000 * 60 * 60);
      res.status(200).json(totals);
    } catch (error) {
      console.log('no good geo ' + error);
      res.status(500).json({ error: 'failed to fetch data' });
    }
  }
};

function groupOperatingSystems(operatingSystems: Array<HardwareCount>) {
  const grouped: Array<HardwareCount> = [];
  grouped.push({
    name: 'Windows 10 / 11',
    count: operatingSystems.filter(o => o.name.toLowerCase().startsWith('windows 10 ')).reduce<number>((prev, cur) => prev + cur.count, 0)
  });
  grouped.push({
    name: 'Windows 8',
    count: operatingSystems.filter(o => o.name.toLowerCase().startsWith('windows 8')).reduce<number>((prev, cur) => prev + cur.count, 0)
  });
  grouped.push({
    name: 'Windows 7',
    count: operatingSystems.filter(o => o.name.toLowerCase().startsWith('windows 7 ')).reduce<number>((prev, cur) => prev + cur.count, 0)
  });
  grouped.push({
    name: 'MacOS',
    count: operatingSystems.filter(o => o.name.toLowerCase().includes('macos')).reduce<number>((prev, cur) => prev + cur.count, 0)
  });
  const total = operatingSystems.reduce((prev, cur) => prev + cur.count, 0);
  const totalCounted = grouped.reduce((prev, cur) => prev + cur.count, 0);
  grouped.push({
    name: 'Other',
    count: total - totalCounted
  });
  return grouped.filter(g => g.count > 0);
}

type HardwareCount = {
  name: string,
  count: number
}

type Hardware = {
  memory: Array<HardwareCount>
  arch: Array<HardwareCount>,
  operatingSystem: Array<HardwareCount>
}

export default res;
