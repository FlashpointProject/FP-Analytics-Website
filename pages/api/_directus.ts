import * as axiosDefault  from 'axios';
const axios = axiosDefault.default;

export async function fetchGames(ids: string[]) {
  const res = await axios({
    baseURL: process.env.DIRECTUS_HOST,
    url: 'items/games',
    headers: getDirectusHeaders(),
    method: 'SEARCH',
    data: {
      "id": {
        "_in": [...ids]
      }
    }
  });
  return res.data.data;
}

export async function fetchRandomGames(count: number): Promise<DirectusGame[]>{
  const offset = Math.floor(Math.random() * 100000);
  const res = await axios({
    baseURL: process.env.DIRECTUS_HOST,
    url: `items/games?limit=${count}&offset=${offset}`,
    headers: getDirectusHeaders(),
    method: 'GET'
  });
  return res.data.data;
}

function getDirectusHeaders(): axiosDefault.AxiosRequestHeaders {
  return {
    'Authorization': `Bearer ${process.env.DIRECTUS_API_KEY}`,
    'Content-Type': 'application/json'
  }
}

type DirectusGame = {
  id: string;
  title: string;
  platform: string;
}