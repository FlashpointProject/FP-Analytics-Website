import { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
import * as React from 'react';
import CountUp from 'react-countup';
import { Chart as GoogleChart, GoogleChartWrapper } from "react-google-charts";
import styles from '../styles/Dashboard.module.css';
import { SimpleButton } from './SimpleButton';
import * as countryCodeLookup from 'country-code-lookup';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
const chartLoadingText = 'Loading...';
const chartNoDataText = 'No data available';
const emptyGeoData = [["Country", "User Count"]];
const geoMapDragThresholdPx = 5;

export type DashboardProps = {};

type ActiveUsersRow = {
  time: number,
  online_count: number,
  per_country: Record<string, number>
};

type TimeScale = '24h' | '30d';
type GamesRange = TimeScale | '1y';
type ActivityHeatmapRange = Exclude<TimeScale, '24h'>;
type HardwareKey = 'memory' | 'arch' | 'operatingSystem';

type Game = {
  id: string;
  playCount: number;
  title?: string;
}

const defaultGamesLimit = 10;
const expandedGamesLimit = 100;

function useHardwareSeries(hardwareKey: HardwareKey, range: TimeScale, geoSelected: string | null) {
  const [series, setSeries] = React.useState<ApexAxisChartSeries>(null);

  React.useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const fetchData = async () => {
      const params = new URLSearchParams({ range, key: hardwareKey });
      if (geoSelected) {
        params.set('country', geoSelected);
      }
      const res = await fetch(`api/public/hardware?${params}`);
      if (res.ok) {
        const json = await res.json() as ApexAxisChartSeries | { status: 'pending' };
        if ((json as any).status === 'pending') {
          if (!cancelled) retry = setTimeout(fetchData, 3000);
          return;
        }
        if (cancelled) return;
        setSeries(json as ApexAxisChartSeries);
      }
    }
    setSeries(null);
    fetchData();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, [hardwareKey, range, geoSelected]);

  return series;
}

export function Dashboard(props: DashboardProps) {
  const [isClient, setIsClient] = React.useState(false);
  const [activeNow, setActiveNow] = React.useState(0);
  const [gamesPlayedLast, setGamesPlayedLast] = React.useState(0);
  const [gamesPlayed, setGamesPlayed] = React.useState(0);
  const [hardwareOSRange, setHardwareOSRange] = React.useState<TimeScale>('30d');
  const [hardwareArchRange, setHardwareArchRange] = React.useState<TimeScale>('30d');
  const [hardwareMemoryRange, setHardwareMemoryRange] = React.useState<TimeScale>('30d');
  const [activityHeatmapSeries, setActivityHeatmapSeries] = React.useState<ApexAxisChartSeries>(null);
  const [activityHeatmapRange, setActivityHeatmapRange] = React.useState<ActivityHeatmapRange>('30d');
  const [games, setGames] = React.useState<Array<Game>>(null);
  const [gamesExpanded, setGamesExpanded] = React.useState(false);
  const [gamesRange, setGamesRange] = React.useState<GamesRange>('30d');
  const [apexOptions, setApexOptions] = React.useState<ApexOptions>(baseConfigActiveUsers);
  const [apexSeries, setApexSeries] = React.useState<ApexAxisChartSeries>(null);
  const [timeScale, setTimeScale] = React.useState<TimeScale>('24h');
  const [geoData, setGeoData] = React.useState<any>(emptyGeoData);
  const [geoLoading, setGeoLoading] = React.useState(true);
  const [geoRange, setGeoRange] = React.useState<TimeScale>('30d');
  const [geoSelected, setGeoSelected] = React.useState<string>(null);
  const [geoMapExpanded, setGeoMapExpanded] = React.useState(false);
  const [geoMapZoom, setGeoMapZoom] = React.useState(1);
  const [geoMapPan, setGeoMapPan] = React.useState({ x: 0, y: 0 });
  const [geoMapDrag, setGeoMapDrag] = React.useState<GeoMapDrag>(null);
  const hardwareMemoryApexSeries = useHardwareSeries('memory', hardwareMemoryRange, geoSelected);
  const hardwareArchApexSeries = useHardwareSeries('arch', hardwareArchRange, geoSelected);
  const hardwareOSApexSeries = useHardwareSeries('operatingSystem', hardwareOSRange, geoSelected);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const renderRangeButtons = React.useCallback((selected: TimeScale, onSelect: (range: TimeScale) => void) => (
    <>
      <SimpleButton
        className={`${styles.chartFrequencyButton} ${selected === '24h' ? styles.chartFrequencyButtonSelected : ''}`}
        value={"24h"}
        onClick={() => onSelect('24h')} />
      <SimpleButton
        className={`${styles.chartFrequencyButton} ${selected === '30d' ? styles.chartFrequencyButtonSelected : ''}`}
        value={"30d"}
        onClick={() => onSelect('30d')} />
    </>
  ), []);

  const renderHeatmapRangeButtons = React.useCallback((selected: ActivityHeatmapRange, onSelect: (range: ActivityHeatmapRange) => void) => (
    <>
      <SimpleButton
        className={`${styles.chartFrequencyButton} ${selected === '30d' ? styles.chartFrequencyButtonSelected : ''}`}
        value={"30d"}
        onClick={() => onSelect('30d')} />
    </>
  ), []);

  const renderGamesRangeButtons = React.useCallback((selected: GamesRange, onSelect: (range: GamesRange) => void) => (
    <>
      <SimpleButton
        className={`${styles.chartFrequencyButton} ${selected === '24h' ? styles.chartFrequencyButtonSelected : ''}`}
        value={"24h"}
        onClick={() => onSelect('24h')} />
      <SimpleButton
        className={`${styles.chartFrequencyButton} ${selected === '30d' ? styles.chartFrequencyButtonSelected : ''}`}
        value={"30d"}
        onClick={() => onSelect('30d')} />
      <SimpleButton
        className={`${styles.chartFrequencyButton} ${selected === '1y' ? styles.chartFrequencyButtonSelected : ''}`}
        value={"1y"}
        onClick={() => onSelect('1y')} />
    </>
  ), []);

  // Geo Map
  React.useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    setGeoLoading(true);
    setGeoData(emptyGeoData);
    const fetchData = async () => {
      const res = await fetch(`api/public/geo?range=${geoRange}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'pending') {
          if (!cancelled) retry = setTimeout(fetchData, 3000);
          return;
        }
        if (cancelled) return;
        const geo: any = [["Country", "User Count"]];
        const json: Record<string, number> = data;
        for(const e of Object.entries(json)) {
          geo.push([e[0], e[1]]);
        }
        setGeoData(geo);
        setGeoLoading(false);
      } else if (!cancelled) {
        setGeoLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, [geoRange]);

  // Most Played Games
  React.useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const fetchData = async () => {
      const params = new URLSearchParams({ range: gamesRange });
      if (geoSelected) {
        params.set('country', geoSelected);
      }
      const res = await fetch(`api/public/games?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'pending') {
          if (!cancelled) retry = setTimeout(fetchData, 3000);
          return;
        }
        if (cancelled) return;
        const rows: Array<Game> = json;
        setGames(rows);
      }
    }
    setGames(null);
    setGamesExpanded(false);
    fetchData();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, [gamesRange, geoSelected]);

  // Activity Heatmap
  React.useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const fetchData = async () => {
      const params = new URLSearchParams({ range: activityHeatmapRange });
      if (geoSelected) {
        params.set('country', geoSelected);
      }
      const res = await fetch(`api/public/activity-heatmap?${params}`);
      if (res.ok) {
        const json = await res.json() as ApexAxisChartSeries | { status: 'pending' };
        if ((json as any).status === 'pending') {
          if (!cancelled) retry = setTimeout(fetchData, 3000);
          return;
        }
        if (cancelled) return;
        setActivityHeatmapSeries(json as ApexAxisChartSeries);
      }
    }
    setActivityHeatmapSeries(null);
    fetchData();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, [activityHeatmapRange, geoSelected]);

  // Active Users Counter + Games Played
  React.useEffect(() => {
    let lastGamesPlayed = 0;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const fetchData = async () => {
      let res = await fetch('api/public/online?interval=now');
      if (res.ok) {
        const json = await res.json(); 
        if (json.status === 'pending') {
          if (!cancelled) retry = setTimeout(fetchData, 3000);
          return;
        }
        if (cancelled) return;
        const count = json.online_count;
        setActiveNow(count || 0);
      } else {
        setActiveNow(0);
      }
      res = await fetch('api/public/totals?type=games-played');
      if (res.ok) {
        const json: any = await res.json(); 
        if (json.status === 'pending') {
          if (!cancelled) retry = setTimeout(fetchData, 3000);
          return;
        }
        if (cancelled) return;
        const count = json.count;
        setGamesPlayedLast(lastGamesPlayed);
        lastGamesPlayed = count;
        setGamesPlayed(count);
      } else {
        setGamesPlayed(0);
      }
    }
    const interval = setInterval(async () => {
      await fetchData();
    }, 1000 * 60);
    fetchData();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      clearInterval(interval);
    };
  }, []);

  // Active Users
  React.useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    setApexSeries(null);
    async function fetchData() {
      const res = await fetch(`api/public/online?range=${timeScale}`);
      if (res.ok) {
        // Good response, fill out graph
        const json = await res.json();
        if (json.status === 'pending') {
          if (!cancelled) retry = setTimeout(fetchData, 3000);
          return;
        }
        if (cancelled) return;
        let rows: Array<ActiveUsersRow> = json;
        if (geoSelected !== null) {
          rows = rows.map(r => {
            return {
              ...r,
              online_count: r.per_country[geoSelected] || 0
            }
          });
        }
        const series: ApexAxisChartSeries = [
          {
            name: 'Active Users',
            type: 'area',
            data: rows.map((row) => {
              return {
                x: new Date(row.time).getTime(),
                y: row.online_count || 0
              }
            }),
          }
        ];
        const opts: ApexOptions = {
          ...baseConfigActiveUsers,
          xaxis: {
            type: 'datetime',
            axisTicks: {
              show: true,
              height: 10
            },
            axisBorder: {
              show: true
            },
          },
          markers: {
            size: 4
          },
          yaxis: {
            min: 0,
            max: Math.floor(rows.reduce<number>((prev, cur) => Math.max(prev, cur.online_count), 0) * 1.1)
          }
        }
        setApexOptions(opts);
        setApexSeries(series);
      } else {
        // Error
        const opts: ApexOptions = {
          ...baseConfigActiveUsers,
          noData: {
            text: `Error: ${res.statusText}`
          }
        }
        setApexOptions(opts);
        setApexSeries([]);
      }
    };
    // Automatically update whenever the interval (1 hour, 3 hours, 1 day) between data points changes meaningfully
    const timeInterval = 
      timeScale === '24h' ? (1000 * 60 * 60) :
      (1000 * 60 * 60 * 24);
    const interval = setInterval(fetchData, timeInterval);
    // Do fetch right now
    fetchData();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      clearInterval(interval);
    };
  }, [timeScale, geoSelected]);

  const geoMapSelectCallback = React.useCallback((eventArgs: { chartWrapper: GoogleChartWrapper }) => {
    const chart = eventArgs.chartWrapper.getChart();
    const selection = chart.getSelection();
    if (selection.length === 0) return;
    const selectedRow = selection[0].row;
    if (selectedRow === null || selectedRow === undefined) return;
    const region = geoData[selectedRow + 1];
    if (!region || !region[0]) return;
    setGeoSelected(region[0]);
  }, [geoData]);

  const setClampedGeoMapZoom = React.useCallback((value: number | ((current: number) => number)) => {
    setGeoMapZoom(current => {
      const nextValue = typeof value === 'function' ? value(current) : value;
      const next = Math.min(4, Math.max(1, Number(nextValue.toFixed(2))));
      if (next === 1) {
        setGeoMapPan({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const resetGeoMapView = React.useCallback(() => {
    setGeoMapZoom(1);
    setGeoMapPan({ x: 0, y: 0 });
  }, []);

  const handleGeoMapPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (geoMapZoom <= 1) return;
    setGeoMapDrag({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: geoMapPan.x,
      originY: geoMapPan.y,
      dragging: false
    });
  }, [geoMapPan.x, geoMapPan.y, geoMapZoom]);

  const handleGeoMapPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!geoMapDrag || geoMapDrag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - geoMapDrag.startX;
    const deltaY = event.clientY - geoMapDrag.startY;
    if (!geoMapDrag.dragging) {
      const distance = Math.hypot(deltaX, deltaY);
      if (distance < geoMapDragThresholdPx) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setGeoMapDrag({
        ...geoMapDrag,
        dragging: true
      });
    }
    setGeoMapPan({
      x: geoMapDrag.originX + deltaX,
      y: geoMapDrag.originY + deltaY
    });
    event.preventDefault();
  }, [geoMapDrag]);

  const handleGeoMapPointerEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!geoMapDrag || geoMapDrag.pointerId !== event.pointerId) return;
    if (geoMapDrag.dragging && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setGeoMapDrag(null);
  }, [geoMapDrag]);

  const handleGeoMapWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!geoMapExpanded) return;
    event.preventDefault();
    setClampedGeoMapZoom(current => current + (event.deltaY > 0 ? -0.2 : 0.2));
  }, [geoMapExpanded, setClampedGeoMapZoom]);

  const geoMapRender = React.useMemo(() =>
    <GoogleChart
      key={geoMapExpanded ? 'geo-map-expanded' : 'geo-map-compact'}
      chartEvents={[
        {
          eventName: "select",
          callback: geoMapSelectCallback,
        },
      ]}
      chartType="GeoChart"
      width="100%"
      height="100%"
      options={{
        colors: ["#fcd4db", '#ea8f9f', '#DD042B'],
        datalessRegionColor: '#FFFFFF',
        backgroundColor: "#FFE0E4"
      }}
      data={geoData} />
  , [geoData, geoMapExpanded, geoMapSelectCallback]);

  const country = geoSelected ? countryCodeLookup.byIso(geoSelected) : '';
  const selectedCountryLabel = geoSelected ? (country ? country.country : geoSelected) : '';
  const activityHeatmapOptions = React.useMemo(() => buildActivityHeatmapOptions(activityHeatmapSeries), [activityHeatmapSeries]);
  const hardwareMemoryOptions = React.useMemo(() => buildHardwareChartOptions('hardware-memory'), []);
  const hardwareArchOptions = React.useMemo(() => buildHardwareChartOptions('hardware-arch'), []);
  const hardwareOSOptions = React.useMemo(() => buildHardwareChartOptions('hardware-os'), []);
  const visibleGames = games ? games.slice(0, gamesExpanded ? expandedGamesLimit : defaultGamesLimit) : [];
  const canExpandGames = Boolean(games && games.length > defaultGamesLimit);
  const renderCountryClearButton = () => geoSelected ? (
    <SimpleButton
      className={`${styles.chartFrequencyButton} ${styles.gamesClearCountryButton}`}
      value={"All Countries"}
      onClick={() => setGeoSelected(null)} />
  ) : undefined;

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardRow}>
        <div className={`${styles.dashboardSection} ${styles.dashboardSectionCounter}`}>
          <div className={styles.activeNowHeader}>Active Now</div>
          <div className={styles.activeNowMeta}>{"(last 15 minutes)"}</div>
          <div className={styles.activeNowCount}>{activeNow}</div>
        </div>
        <div className={`${styles.dashboardSection}`}>
          <div className={styles.chart}>
            { (isClient) ? (
              <>
                <div className={styles.chartHeader}>
                  <div className={styles.chartHeaderLeft}>{`Active Users${geoSelected ? ` - ${selectedCountryLabel}` : ''}`}</div>
                  <div className={styles.chartHeaderRight}>
                    {renderCountryClearButton()}
                    {renderRangeButtons(timeScale, setTimeScale)}
                  </div>
                </div>
                <div className={styles.chartPlot}>
                  {apexSeries ? <Chart type={'area'} options={apexOptions} series={apexSeries} height='100%'/> : <ChartLoading />}
                </div>
              </>
            ) : <ChartLoading /> }
          </div>
        </div>
      </div>
      <div className={styles.dashboardRow}>
        <div className={`${styles.dashboardSection} ${styles.dashboardSectionGames} ${styles.dashboardSectionGeoMap} ${geoMapExpanded ? styles.dashboardSectionGeoMapExpanded : ''}`}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeft}>Geo Map</div>
            <div className={styles.chartHeaderRight}>
              {renderRangeButtons(geoRange, setGeoRange)}
            </div>
            <div className={styles.geoMapControls}>
              <button
                type="button"
                className={styles.geoMapControlButton}
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => setClampedGeoMapZoom(current => current - 0.25)}>
                -
              </button>
              <button
                type="button"
                className={styles.geoMapControlButton}
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => setClampedGeoMapZoom(current => current + 0.25)}>
                +
              </button>
              <button
                type="button"
                className={styles.geoMapControlButton}
                title="Reset map"
                aria-label="Reset map"
                onClick={resetGeoMapView}>
                1:1
              </button>
              <button
                type="button"
                className={styles.geoMapControlButton}
                title={geoMapExpanded ? 'Collapse map' : 'Expand map'}
                aria-label={geoMapExpanded ? 'Collapse map' : 'Expand map'}
                onClick={() => setGeoMapExpanded(expanded => !expanded)}>
                {geoMapExpanded ? 'x' : '[ ]'}
              </button>
            </div>
          </div>
          <div
            className={`${styles.geoMapViewport} ${geoMapExpanded ? styles.geoMapViewportExpanded : ''} ${geoMapZoom > 1 ? styles.geoMapViewportPannable : ''} ${geoMapDrag?.dragging ? styles.geoMapViewportDragging : ''}`}
            onPointerDown={handleGeoMapPointerDown}
            onPointerMove={handleGeoMapPointerMove}
            onPointerUp={handleGeoMapPointerEnd}
            onPointerCancel={handleGeoMapPointerEnd}
            onWheel={handleGeoMapWheel}>
            {geoLoading ? (
              <ChartLoading />
            ) : (
              <div
                className={styles.geoMapCanvas}
                style={{
                  transform: `translate(${geoMapPan.x}px, ${geoMapPan.y}px) scale(${geoMapZoom})`
                }}>
                {geoMapRender}
              </div>
            )}
          </div>
        </div>
        <div className={`${styles.dashboardSection} ${styles.dashboardSectionCounter} ${styles.dashboardSectionTotalGames}`}>
          <div className={styles.activeNowHeader}>Total Games Played</div>
          <div className={`${styles.activeNowCount} ${styles.totalGamesCount}`}>
            <CountUp duration={gamesPlayedLast === 0 ? 3 : 10} separator="," start={gamesPlayedLast} end={gamesPlayed}/>
          </div>
        </div>
      </div>
      <div className={styles.hardwareGrid}>
        <div className={styles.dashboardSection}>
          <div className={`${styles.chart} ${styles.hardwareChart}`}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderLeft}>{`Hardware - Memory${geoSelected ? ` - ${selectedCountryLabel}` : ''}`}</div>
                <div className={styles.chartHeaderRight}>
                  {renderCountryClearButton()}
                  {renderRangeButtons(hardwareMemoryRange, setHardwareMemoryRange)}
                </div>
              </div>
              <div className={styles.hardwareChartPlot}>
                {hardwareMemoryApexSeries ? <Chart type='area' options={hardwareMemoryOptions} series={hardwareMemoryApexSeries} height='100%'/> : <ChartLoading />}
              </div>
              <HardwareLegend series={hardwareMemoryApexSeries} />
            </div>
        </div>
        <div className={styles.dashboardSection}>
          <div className={`${styles.chart} ${styles.hardwareChart}`}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderLeft}>{`Hardware - Arch${geoSelected ? ` - ${selectedCountryLabel}` : ''}`}</div>
                <div className={styles.chartHeaderRight}>
                  {renderCountryClearButton()}
                  {renderRangeButtons(hardwareArchRange, setHardwareArchRange)}
                </div>
              </div>
              <div className={styles.hardwareChartPlot}>
                {hardwareArchApexSeries ? <Chart type='area' options={hardwareArchOptions} series={hardwareArchApexSeries} height='100%'/> : <ChartLoading />}
              </div>
              <HardwareLegend series={hardwareArchApexSeries} />
            </div>
        </div>
        <div className={`${styles.dashboardSection} ${styles.hardwareGridFull}`}>
          <div className={`${styles.chart} ${styles.hardwareChart} ${styles.hardwareChartOS}`}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderLeft}>{`Hardware - Operating System${geoSelected ? ` - ${selectedCountryLabel}` : ''}`}</div>
                <div className={styles.chartHeaderRight}>
                  {renderCountryClearButton()}
                  {renderRangeButtons(hardwareOSRange, setHardwareOSRange)}
                </div>
              </div>
              <div className={styles.hardwareChartPlot}>
                {hardwareOSApexSeries ? <Chart type='area' options={hardwareOSOptions} series={hardwareOSApexSeries} height='100%'/> : <ChartLoading />}
              </div>
              <HardwareLegend series={hardwareOSApexSeries} />
            </div>
        </div>
      </div>
      <div className={styles.dashboardRow}>
        <div className={`${styles.dashboardSection} ${styles.dashboardSectionGamesTable}`}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderLeft}>{`Most Played Games${geoSelected ? ` - ${selectedCountryLabel}` : ''}`}</div>
            <div className={styles.chartHeaderRight}>
              {renderCountryClearButton()}
              {renderGamesRangeButtons(gamesRange, setGamesRange)}
            </div>
          </div>
          <div className={styles.gamesTableWrap}>
            {games && games.length > 0 ? (
              <>
                <table className={styles.gamesTable}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Game</th>
                      <th>Plays</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGames.map((game, index) => (
                      <tr key={game.id}>
                        <td>{index + 1}</td>
                        <td>
                          <a
                            className={styles.gameLink}
                            href={`https://flashpointproject.github.io/flashpoint-database/search/#${game.id}`}>
                            {game.title || game.id}
                          </a>
                        </td>
                        <td>{game.playCount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {canExpandGames ? (
                  <button
                    type="button"
                    className={`${styles.gamesExpandButton} ${gamesExpanded ? styles.gamesExpandButtonExpanded : ''}`}
                    aria-expanded={gamesExpanded}
                    onClick={() => setGamesExpanded(expanded => !expanded)}>
                    <span className={styles.gamesExpandChevron} aria-hidden="true" />
                    <span>{gamesExpanded ? 'click to collapse' : 'click to expand'}</span>
                  </button>
                ) : undefined}
              </>
            ) : games ? (
              <ChartMessage>No game launches found.</ChartMessage>
            ) : (
              <ChartLoading />
            )}
            </div>
        </div>
      </div>
      <div className={styles.dashboardRow}>
        <div className={`${styles.dashboardSection} ${styles.dashboardSectionFull}`}>
          <div className={`${styles.chart} ${styles.heatmapChart}`}>
            { (isClient) ? (
              <>
                <div className={styles.chartHeader}>
                  <div className={styles.chartHeaderLeft}>{`Activity Heatmap (UTC)${geoSelected ? ` - ${selectedCountryLabel}` : ''}`}</div>
                  <div className={styles.chartHeaderRight}>
                    {renderCountryClearButton()}
                    {renderHeatmapRangeButtons(activityHeatmapRange, setActivityHeatmapRange)}
                  </div>
                </div>
                <div className={styles.heatmapChartBody}>
                  {activityHeatmapSeries ? <Chart type='heatmap' options={activityHeatmapOptions} series={activityHeatmapSeries} height='100%'/> : <ChartLoading />}
                </div>
              </>
            ) : <ChartLoading /> }
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartLoading() {
  return <ChartMessage>{chartLoadingText}</ChartMessage>;
}

function ChartMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.chartStatus} role="status" aria-live="polite">
      {children}
    </div>
  );
}

function HardwareLegend({ series }: { series: ApexAxisChartSeries | null }) {
  if (!series || series.length === 0) return null;

  return (
    <div className={styles.hardwareLegend} aria-label="Hardware chart legend">
      {series.map((entry: any, index) => (
        <div className={styles.hardwareLegendItem} key={`${entry.name}-${index}`}>
          <span
            className={styles.hardwareLegendSwatch}
            style={{ backgroundColor: hardwareChartColors[index % hardwareChartColors.length] }} />
          <span className={styles.hardwareLegendLabel}>{entry.name}</span>
        </div>
      ))}
    </div>
  );
}

function buildHardwareChartOptions(id: string): ApexOptions {
  return {
    ...baseConfigHardwareTrend,
    chart: {
      ...baseConfigHardwareTrend.chart,
      id
    }
  };
}

const hardwareChartColors = ['#014fa8', '#dd042b', '#04966f', '#8a5bd8', '#d38a00', '#0f9ce8', '#5c6b73', '#d24f87', '#6b8e23', '#9a5a00'];

const baseConfigHardwareTrend: ApexOptions = {
  chart: {
    id: 'hardware',
    type: 'area',
    stacked: true,
    toolbar: {
      show: false
    },
    zoom: {
      enabled: false
    },
    animations: {
      enabled: false
    }
  },
  xaxis: {
    type: 'datetime'
  },
  yaxis: {
    min: 0
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  fill: {
    type: 'solid',
    opacity: 0.55
  },
  noData: {
    text: chartNoDataText
  },
  colors: hardwareChartColors,
  legend: {
    show: false
  },
  tooltip: {
    x: {
      format: "MMM d h:00tt"
    }
  }
}

const baseConfigActiveUsers: ApexOptions = {
  chart: {
    id: 'active-users',
    toolbar: {
      show: false
    },
    zoom: {
      enabled: false
    },
    animations: {
      enabled: false
    }
  },
  xaxis: {
    type: 'datetime'
  },
  dataLabels: {
    enabled: false
  },
  noData: {
    text: chartNoDataText
  },
  stroke: {
    curve: 'smooth',
    width: 2,
    colors: ['#014fa8']
  },
  fill: {
    type: 'solid',
    colors: ['#bdeaf9']
  },
  tooltip: {
    x: {
      format: "MMM d h:00tt"
    }
  }
}

const heatmapRedColors = ['#ffffff', '#fee8ec', '#fcd4db', '#f8b5c1', '#f18da0', '#ea6379', '#e23552', '#dd042b'];

const baseConfigActivityHeatmap: ApexOptions = {
  chart: {
    id: 'activity-heatmap',
    type: 'heatmap',
    toolbar: {
      show: false
    },
    zoom: {
      enabled: false
    },
    animations: {
      enabled: false
    }
  },
  dataLabels: {
    enabled: false
  },
  states: {
    hover: {
      filter: {
        type: 'none'
      }
    },
    active: {
      filter: {
        type: 'none'
      }
    }
  },
  noData: {
    text: chartNoDataText
  },
  plotOptions: {
    heatmap: {
      shadeIntensity: 0,
      radius: 3,
        distributed: false,
        colorScale: {
        ranges: buildRedHeatmapRanges(0)
      }
    }
  },
  xaxis: {
    type: 'category',
    labels: {
      formatter: (value) => ['00:00', '06:00', '12:00', '18:00', '23:00'].includes(String(value)) ? String(value) : ''
    }
  },
  yaxis: {
    reversed: true
  },
  legend: {
    show: false
  },
  tooltip: {
    custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
      const weekday = w.globals.seriesNames[seriesIndex];
      const hour = w.globals.labels[dataPointIndex];
      const count = series[seriesIndex][dataPointIndex] || 0;
      return `<div style="padding: 0.5rem 0.65rem;"><strong>${weekday} ${hour} UTC</strong><br/>${count} active sessions</div>`;
    }
  }
}

function buildActivityHeatmapOptions(series: ApexAxisChartSeries | null): ApexOptions {
  const max = Math.max(
    0,
    ...(series || []).flatMap((row) => row.data.map((point: any) => Number(point.y || 0)))
  );

  return {
    ...baseConfigActivityHeatmap,
    plotOptions: {
      ...baseConfigActivityHeatmap.plotOptions,
      heatmap: {
        ...baseConfigActivityHeatmap.plotOptions?.heatmap,
        colorScale: {
          ranges: buildRedHeatmapRanges(max)
        }
      }
    }
  };
}

function buildRedHeatmapRanges(max: number) {
  const normalizedMax = Math.floor(Math.max(0, Number(max) || 0));
  const ranges = [{ from: 0, to: 0, color: heatmapRedColors[0], name: '0' }];
  if (normalizedMax <= 0) {
    return ranges;
  }

  const positiveColors = heatmapRedColors.slice(1);
  const bucketCount = Math.min(normalizedMax, positiveColors.length);
  let lastTo = 0;
  for (let index = 0; index < bucketCount; index++) {
    const from = lastTo + 1;
    const to = index === bucketCount - 1
      ? normalizedMax
      : Math.max(from, Math.floor((normalizedMax * (index + 1)) / bucketCount));
    ranges.push({
      from,
      to,
      color: positiveColors[index],
      name: from === to ? `${from}` : `${from}-${to}`
    });
    lastTo = to;
  }

  return ranges;
}

type GeoMapDrag = {
  pointerId: number,
  startX: number,
  startY: number,
  originX: number,
  originY: number,
  dragging: boolean
} | null;

export default Dashboard;
