import { NextApiRequest, NextApiResponse } from 'next';
import { fetchRandomGames } from '../_directus';

const res = async (_: NextApiRequest, res: NextApiResponse) => {
  // Fetch 10 random games
  const randGames = await fetchRandomGames(10);
  const gameData = randGames.map(game => {
    return {
      "id": game.id,
      "title": game.title,
      "platform": game.platform,
      "count": Math.floor(Math.random() * 1000)
    }
  })
  .sort((a, b) => { return b.count - a.count });

  res.status(200).json(gameData);
};

export default res;
