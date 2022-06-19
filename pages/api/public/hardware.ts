import { NextApiRequest, NextApiResponse } from 'next';
import { fetchRandomGames } from '../_directus';

const demoMemory = [
  { name: '< 2GB', count: 137},
  { name: '>= 2GB < 4GB', count: 1019},
  { name: '>= 4GB < 8GB', count: 1850},
  { name: '>= 8GB < 16GB', count: 1481},
  { name: '>= 16GB', count: 293},
]

const demoArch = [
  { name: '32-bit', count: 31441 },
  { name: '64-bit', count: 28962 }
]

const demoOperatingSystem = [
  { name: 'Windows 10 / 11', count: 55764 },
  { name: 'Windows 8', count: 1234 },
  { name: 'Windows 7', count: 3243 },
  { name: 'Other', count: 115 }
]

const res = async (_: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({
    memory: demoMemory,
    arch: demoArch,
    operatingSystem: demoOperatingSystem
  });
};

export default res;
