import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { groupOperatingSystem } from '../../lib/hardware_os';
import { fetchGameTitles } from './_game_db';
import { getAxiosOpts } from './_util';

export type ChartRange = '24h' | '30d';
export type GamesRange = ChartRange | '1y';
export type ActivityHeatmapRange = Exclude<ChartRange, '24h'>;

export const chartRanges: ChartRange[] = ['24h', '30d'];
const gamesRanges: GamesRange[] = ['24h', '30d', '1y'];
const activityHeatmapRanges: ActivityHeatmapRange[] = ['30d'];

type CacheStatus = 'pending' | 'refreshing' | 'ready' | 'error';

type CacheEntry<T> = {
  key: string;
  refreshEveryMs: number;
  refresh: () => Promise<T>;
  data?: T;
  status: CacheStatus;
  lastUpdated?: number;
  nextRefreshAt: number;
  error?: string;
  inFlight?: Promise<void>;
};

type PendingResponse = {
  status: 'pending';
  error?: string;
};

type ActiveUsersRow = {
  time: string;
  online_count: number;
  per_country: Record<string, number>;
};

type ActiveCountryRow = {
  country_iso_code: string;
  count: number;
};

type Game = {
  id: string;
  playCount: number;
  title?: string;
};

type HardwareTrendRow = {
  time: string;
  key: HardwareKey;
  value: string;
  count: number;
};

type ActivityHeatmapRow = {
  day_of_week: number;
  hour: number;
  active_sessions: number;
};

export type HardwareKey = 'memory' | 'arch' | 'operatingSystem';

type TrendPoint = {
  x: number | string;
  y: number;
};

export type TrendSeries = {
  name: string;
  data: TrendPoint[];
};

export type HardwareTrends = Record<HardwareKey, TrendSeries[]>;

export type ActivityHeatmapSeries = TrendSeries[];

export const hardwareKeys: HardwareKey[] = ['memory', 'arch', 'operatingSystem'];

const maxConcurrentRefreshes = 1;
const activeNowRefreshMs = 1000 * 60;
const hourlyRefreshMs = 1000 * 60 * 60;
const dailyRefreshMs = 1000 * 60 * 60 * 24;
const weeklyRefreshMs = 1000 * 60 * 60 * 24 * 7;
const analyticsHost = process.env.ANALYTICS_HOST || '';
const registry = new Map<string, CacheEntry<unknown>>();
const queued = new Set<string>();
const queue: string[] = [];
let activeRefreshes = 0;
let started = false;

export function getRange(value: string | string[] | undefined, fallback: ChartRange = '24h'): ChartRange | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  if (raw === '1-day') return '24h';
  if (raw === '30-days') return '30d';
  return chartRanges.includes(raw as ChartRange) ? raw as ChartRange : null;
}

export function getGamesRange(value: string | string[] | undefined, fallback: GamesRange = '30d'): GamesRange | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  if (raw === '1-day') return '24h';
  if (raw === '30-days') return '30d';
  return gamesRanges.includes(raw as GamesRange) ? raw as GamesRange : null;
}

export function serveCachedChart<T>(res: NextApiResponse, key: string) {
  startChartCache();
  const entry = registry.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    res.status(404).json({ error: 'unknown chart cache key' });
    return;
  }

  scheduleRefresh(key);
  if (entry.data !== undefined) {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
    res.setHeader('X-Chart-Cache', entry.status === 'error' ? 'stale' : 'hit');
    res.status(200).json(entry.data);
    return;
  }

  const body: PendingResponse = { status: 'pending' };
  if (entry.error) {
    body.error = entry.error;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(202).json(body);
}

export function activeUsersKey(range: ChartRange) {
  return `active-users:${range}`;
}

export function geoKey(range: ChartRange) {
  return `geo:${range}`;
}

export function gamesKey(range: GamesRange, country?: string) {
  return country ? `games:${range}:country:${country}` : `games:${range}`;
}

export function getHardwareKey(value: string | string[] | undefined): HardwareKey | null | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return hardwareKeys.includes(raw as HardwareKey) ? raw as HardwareKey : null;
}

export function hardwareKey(range: ChartRange, key?: HardwareKey, country?: string) {
  const parts = ['hardware', range];
  if (key) {
    parts.push('key', key);
  }
  if (country) {
    parts.push('country', country);
  }
  return parts.join(':');
}

export function activityHeatmapKey(range: ActivityHeatmapRange, country?: string) {
  return country ? `activity-heatmap:${range}:country:${country}` : `activity-heatmap:${range}`;
}

export function startChartCache() {
  if (started) return;
  started = true;
  registerCharts();
  for (const key of Array.from(registry.keys())) {
    scheduleRefresh(key, true);
  }

  const interval = setInterval(() => {
    for (const key of Array.from(registry.keys())) {
      scheduleRefresh(key);
    }
  }, activeNowRefreshMs);
  interval.unref?.();
}

function registerCharts() {
  register('active-now', activeNowRefreshMs, fetchActiveNow);
  register('games-total', hourlyRefreshMs, fetchGamesTotal);

  for (const range of chartRanges) {
    const refreshEveryMs = chartRefreshMs(range);
    register(activeUsersKey(range), refreshEveryMs, () => fetchActiveUsers(range));
    register(geoKey(range), refreshEveryMs, () => fetchGeo(range));
    register(hardwareKey(range), refreshEveryMs, () => fetchHardware(range));
    for (const hardwareKeyName of hardwareKeys) {
      register(hardwareKey(range, hardwareKeyName), refreshEveryMs, () => fetchHardwareSeries(range, hardwareKeyName));
    }
  }
  for (const range of gamesRanges) {
    register(gamesKey(range), gamesRefreshMs(range), () => fetchGames(range));
  }
  for (const range of activityHeatmapRanges) {
    register(activityHeatmapKey(range), chartRefreshMs(range), () => fetchActivityHeatmap(range));
  }
}

function register<T>(key: string, refreshEveryMs: number, refresh: () => Promise<T>) {
  registry.set(key, {
    key,
    refreshEveryMs,
    refresh,
    status: 'pending',
    nextRefreshAt: 0
  });
}

export function serveGamesChart(res: NextApiResponse, range: GamesRange, country?: string) {
  startChartCache();
  const key = gamesKey(range, country);
  if (country && !registry.has(key)) {
    register(key, gamesRefreshMs(range), () => fetchGames(range, country));
  }
  serveCachedChart<Game[]>(res, key);
}

export function serveHardwareChart(res: NextApiResponse, range: ChartRange, country?: string, selectedHardwareKey?: HardwareKey) {
  startChartCache();
  const key = hardwareKey(range, selectedHardwareKey, country);
  if ((country || selectedHardwareKey) && !registry.has(key)) {
    if (selectedHardwareKey) {
      register(key, chartRefreshMs(range), () => fetchHardwareSeries(range, selectedHardwareKey, country));
    } else {
      register(key, chartRefreshMs(range), () => fetchHardware(range, country));
    }
  }
  if (selectedHardwareKey) {
    serveCachedChart<TrendSeries[]>(res, key);
    return;
  }
  serveCachedChart<HardwareTrends>(res, key);
}

export function serveActivityHeatmapChart(res: NextApiResponse, range: ActivityHeatmapRange, country?: string) {
  startChartCache();
  const key = activityHeatmapKey(range, country);
  if (country && !registry.has(key)) {
    register(key, chartRefreshMs(range), () => fetchActivityHeatmap(range, country));
  }
  serveCachedChart<ActivityHeatmapSeries>(res, key);
}

function chartRefreshMs(range: ChartRange) {
  if (range === '24h') return hourlyRefreshMs;
  return dailyRefreshMs;
}

function gamesRefreshMs(range: GamesRange) {
  if (range === '1y') return weeklyRefreshMs;
  return chartRefreshMs(range);
}

function scheduleRefresh(key: string, force = false) {
  const entry = registry.get(key);
  if (!entry) return;
  if (entry.inFlight || queued.has(key)) return;
  if (!force && Date.now() < entry.nextRefreshAt) return;

  queued.add(key);
  queue.push(key);
  drainQueue();
}

function drainQueue() {
  while (activeRefreshes < maxConcurrentRefreshes && queue.length > 0) {
    const key = queue.shift();
    if (!key) return;
    queued.delete(key);

    const entry = registry.get(key);
    if (!entry || entry.inFlight) continue;

    activeRefreshes++;
    entry.status = 'refreshing';
    entry.inFlight = refreshEntry(entry)
      .finally(() => {
        entry.inFlight = undefined;
        activeRefreshes--;
        drainQueue();
      });
  }
}

async function refreshEntry<T>(entry: CacheEntry<T>) {
  try {
    const data = await entry.refresh();
    entry.data = data;
    entry.status = 'ready';
    entry.lastUpdated = Date.now();
    entry.nextRefreshAt = entry.lastUpdated + entry.refreshEveryMs;
    entry.error = undefined;
  } catch (error) {
    entry.status = 'error';
    entry.nextRefreshAt = Date.now() + Math.min(entry.refreshEveryMs, activeNowRefreshMs);
    entry.error = error instanceof Error ? error.message : String(error);
    console.error(`chart cache refresh failed for ${entry.key}`, error);
  }
}

async function fetchActiveNow() {
  const to = Math.floor(Date.now() / 1000);
  const response = await axios.post(new URL('/data/chart/active-now', analyticsHost).toString(), {
    from: to - (15 * 60),
    to
  }, getAxiosOpts());
  return { online_count: Number(response.data.online_count || 0) };
}

async function fetchActiveUsers(range: ChartRange): Promise<ActiveUsersRow[]> {
  const response = await axios.post(new URL('/data/chart/active-users', analyticsHost).toString(), {
    range
  }, getAxiosOpts());
  return response.data.result || [];
}

async function fetchGeo(range: ChartRange): Promise<Record<string, number>> {
  const response = await axios.post(new URL('/data/chart/active-countries', analyticsHost).toString(), {
    range
  }, getAxiosOpts());
  const rows: ActiveCountryRow[] = response.data.result || [];
  return rows.reduce<Record<string, number>>((countries, row) => {
    countries[row.country_iso_code] = row.count;
    return countries;
  }, {});
}

async function fetchGames(range: GamesRange, country?: string): Promise<Game[]> {
  const response = await axios.post(new URL('/data/chart/top-games', analyticsHost).toString(), {
    range: backendGamesRange(range),
    limit: 100,
    ...(country ? { country_iso_code: country } : {})
  }, getAxiosOpts());
  const games: Game[] = (response.data.result || []).map((row: any) => ({
    id: row.id,
    playCount: Number(row.playCount || 0)
  }));

  try {
    const gameTitles = await fetchGameTitles(games.map(game => game.id));
    for (const gameTitle of gameTitles) {
      const idx = games.findIndex(game => game.id === gameTitle.id);
      if (idx > -1) {
        games[idx].title = gameTitle.title;
      }
    }
  } catch (error) {
    console.error('failed to fetch game titles', error);
  }

  return games;
}

function backendGamesRange(range: GamesRange) {
  return range === '1y' ? 'year' : range;
}

async function fetchGamesTotal() {
  const response = await axios.post(new URL('/data/chart/game-launch-total', analyticsHost).toString(), {}, getAxiosOpts());
  return { count: Number(response.data.count || 0) };
}

async function fetchHardware(range: ChartRange, country?: string): Promise<HardwareTrends> {
  const to = Math.floor(Date.now() / 1000);
  const spec = rangeSpec(range, to);
  const response = await axios.post(new URL('/data/chart/hardware-trends', analyticsHost).toString(), {
    range,
    to: Math.floor(spec.toMs / 1000),
    ...(country ? { country_iso_code: country } : {})
  }, getAxiosOpts());
  return buildHardwareTrends(response.data.result || [], spec);
}

async function fetchHardwareSeries(range: ChartRange, key: HardwareKey, country?: string): Promise<TrendSeries[]> {
  const to = Math.floor(Date.now() / 1000);
  const spec = rangeSpec(range, to);
  try {
    const response = await axios.post(new URL('/data/chart/hardware-trends', analyticsHost).toString(), {
      range,
      hardware_key: key,
      to: Math.floor(spec.toMs / 1000),
      ...(country ? { country_iso_code: country } : {})
    }, getAxiosOpts());
    return buildHardwareSeries(response.data.result || [], spec, key);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      const trends = await fetchHardware(range, country);
      return trends[key];
    }
    throw error;
  }
}

async function fetchActivityHeatmap(range: ActivityHeatmapRange, country?: string): Promise<ActivityHeatmapSeries> {
  const response = await axios.post(new URL('/data/chart/activity-heatmap', analyticsHost).toString(), {
    range,
    ...(country ? { country_iso_code: country } : {})
  }, getAxiosOpts());
  return buildActivityHeatmapSeries(response.data.result || []);
}

function buildActivityHeatmapSeries(rows: ActivityHeatmapRow[]): ActivityHeatmapSeries {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, hour) => `${hour.toString().padStart(2, '0')}:00`);
  const values = new Map<string, number>();

  for (const row of rows) {
    if (row.day_of_week < 1 || row.day_of_week > 7 || row.hour < 0 || row.hour > 23) {
      continue;
    }
    values.set(`${row.day_of_week}:${row.hour}`, Number(row.active_sessions || 0));
  }

  return weekdays.map((weekday, dayIndex) => ({
    name: weekday,
    data: hours.map((hourLabel, hour) => ({
      x: hourLabel,
      y: values.get(`${dayIndex + 1}:${hour}`) || 0
    }))
  }));
}

function buildHardwareTrends(rows: HardwareTrendRow[], spec: RangeSpec): HardwareTrends {
  return {
    memory: buildHardwareSeries(rows, spec, 'memory'),
    arch: buildHardwareSeries(rows, spec, 'arch'),
    operatingSystem: buildHardwareSeries(rows, spec, 'operatingSystem')
  };
}

function buildHardwareSeries(rows: HardwareTrendRow[], spec: RangeSpec, key: HardwareKey): TrendSeries[] {
  const filteredRows = rows.filter(row => row.key === key);
  const normalizedRows = key === 'operatingSystem' ? filteredRows.map(row => ({
    ...row,
    value: groupOperatingSystem(row.value)
  })) : filteredRows;
  return buildSeries(normalizedRows, buildBuckets(spec));
}

function buildSeries(rows: HardwareTrendRow[], buckets: number[]): TrendSeries[] {
  const byName = new Map<string, Map<number, number>>();
  for (const row of rows) {
    const bucket = new Date(row.time).getTime();
    const values = byName.get(row.value) || new Map<number, number>();
    values.set(bucket, (values.get(bucket) || 0) + Number(row.count || 0));
    byName.set(row.value, values);
  }

  return Array.from(byName.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, values]) => ({
      name,
      data: buckets.map(bucket => ({
        x: bucket,
        y: values.get(bucket) || 0
      }))
    }));
}

type RangeSpec = {
  fromMs: number;
  toMs: number;
  bucketMs: number;
};

function rangeSpec(range: ChartRange, toSeconds: number): RangeSpec {
  const dayMs = 24 * 60 * 60 * 1000;
  if (range === '24h') {
    const bucketMs = 60 * 60 * 1000;
    const toMs = Math.floor((toSeconds * 1000) / bucketMs) * bucketMs;
    return { fromMs: toMs - dayMs, toMs, bucketMs: 60 * 60 * 1000 };
  }
  if (range === '30d') {
    const bucketMs = dayMs;
    const toMs = Math.floor((toSeconds * 1000) / bucketMs) * bucketMs;
    return { fromMs: toMs - (30 * dayMs), toMs, bucketMs: dayMs };
  }
  const bucketMs = 7 * dayMs;
  const toMs = Math.floor((toSeconds * 1000) / bucketMs) * bucketMs;
  return { fromMs: toMs - (365 * dayMs), toMs, bucketMs: 7 * dayMs };
}

function buildBuckets(spec: RangeSpec) {
  const buckets: number[] = [];
  for (let bucket = spec.fromMs; bucket <= spec.toMs; bucket += spec.bucketMs) {
    buckets.push(bucket);
  }
  return buckets;
}

export default function internalChartCacheRoute(_: NextApiRequest, res: NextApiResponse) {
  res.status(404).json({ error: 'not found' });
}
