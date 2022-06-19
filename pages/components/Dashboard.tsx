import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
import * as React from 'react';
import CountUp from 'react-countup';
import { Chart as GoogleChart, GoogleChartWrapper } from "react-google-charts";
import styles from '../../styles/Dashboard.module.css';
import { isBrowser } from '../util';
import { SimpleButton } from './SimpleButton';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export type DashboardProps = {};

type ActiveUsersRow = {
  time: number,
  online_count: number,
  per_country: Record<string, number>
};

type TimeScale = '1-day' | '7-days' | '30-days';

type Game = {
  id: string;
  title: string;
  platform: string;
  count: number;
}

export function Dashboard(props: DashboardProps) {
  const [activeNow, setActiveNow] = React.useState(0);
  const [gamesPlayedLast, setGamesPlayedLast] = React.useState(0);
  const [gamesPlayed, setGamesPlayed] = React.useState(0);
  const [hardwareOSApexOptions, setHardwareOSApexOptions] = React.useState<ApexOptions>(baseConfigHardware);
  const [hardwareOSApexSeries, setHardwareOSApexSeries] = React.useState<ApexNonAxisChartSeries>(null);
  const [hardwareArchApexOptions, setHardwareArchApexOptions] = React.useState<ApexOptions>(baseConfigHardware);
  const [hardwareArchApexSeries, setHardwareArchApexSeries] = React.useState<ApexNonAxisChartSeries>(null);
  const [hardwareMemoryApexOptions, setHardwareMemoryApexOptions] = React.useState<ApexOptions>(baseConfigHardware);
  const [hardwareMemoryApexSeries, setHardwareMemoryApexSeries] = React.useState<ApexNonAxisChartSeries>(null);
  const [gamesApexOptions, setGamesApexOptions] = React.useState<ApexOptions>(baseConfigGames);
  const [gamesApexSeries, setGamesApexSeries] = React.useState<ApexAxisChartSeries>(null);
  const [apexOptions, setApexOptions] = React.useState<ApexOptions>(baseConfigActiveUsers);
  const [apexSeries, setApexSeries] = React.useState<ApexAxisChartSeries>(null);
  const [timeScale, setTimeScale] = React.useState<TimeScale>('1-day');
  const [geoData, setGeoData] = React.useState<any>({});
  const [geoSelected, setGeoSelected] = React.useState<string>(null);

  // Geo Map
  React.useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('api/public/geo');
      if (res.ok) {
        const geo: any = [["Country", "User Count"]];
        const json: Record<string, number> = await res.json();
        let total = 0;
        for(const e of Object.entries(json)) {
          total += e[1];
          geo.push([e[0], e[1]]);
        }
        console.log(`total: ${total}`);
        setGeoData(geo);
      }
    }
    fetchData();
  }, []);

  // Most Played Games
  React.useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('api/public/games');
      if (res.ok) {
        const json = await res.json();
        const rows: Array<Game> = json;
        const options: ApexOptions = {
          ...baseConfigGames,
          xaxis: {
            categories: rows.map(row => row.title)
          }
        };
        const series = [
          {
            name: 'Play Count',
            type: 'bar',
            data: rows.map(row => row.count)
          }
        ];
        setGamesApexOptions(options);
        setGamesApexSeries(series);
      }
    }
    fetchData();
  }, []);

  // Hardware
  React.useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('api/public/hardware');
      if (res.ok) {
        const json = await res.json() as Hardware;
        // Memory
        setHardwareMemoryApexOptions({
          ...baseConfigHardware,
          labels: json.memory.map(r => r.name)
        });
        setHardwareMemoryApexSeries(json.memory.map(r => r.count));
        // Arch
        setHardwareArchApexOptions({
          ...baseConfigHardware,
          labels: json.arch.map(r => r.name)
        });
        setHardwareArchApexSeries(json.arch.map(r => r.count));
        // Operating System
        setHardwareOSApexOptions({
          ...baseConfigHardware,
          labels: json.operatingSystem.map(r => r.name)
        });
        setHardwareOSApexSeries(json.operatingSystem.map(r => r.count));
      }
    }
    fetchData();
  }, []);

  // Active Users Counter + Games Played
  React.useEffect(() => {
    let lastGamesPlayed = 0;
    const fetchData = async () => {
      let res = await fetch('api/public/online?interval=now');
      if (res.ok) {
        const json = await res.json(); 
        const count = Array.isArray(json) ? json[0].online_count : json.online_count;
        setActiveNow(count || 0);
      } else {
        setActiveNow(0);
      }
      res = await fetch('api/public/totals?type=games-played');
      if (res.ok) {
        const json: Array<any> = await res.json(); 
        const count = json.reduce<number>((prev, cur) => prev + cur.event_count, 0);
        setGamesPlayedLast(lastGamesPlayed);
        lastGamesPlayed = count;
        setGamesPlayed(count);
      } else {
        setGamesPlayed(0);
      }
    }
    const interval = setInterval(async () => {
      await fetchData();
    }, 1000 * 10);
    fetchData();
    return () => clearInterval(interval);
  }, []);

  // Active Users
  React.useEffect(() => {
    async function fetchData() {
      const res = await fetch(`api/public/online?interval=${timeScale}`);
      if (res.ok) {
        // Good response, fill out graph
        const json = await res.json();
        let rows: Array<ActiveUsersRow> = json;
        rows.splice(0,1);
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
            data: rows.map((row) => row.online_count),
          }
        ];
        const opts: ApexOptions = {
          ...baseConfigActiveUsers,
          xaxis: {
            categories: rows.map((row) => (new Date(row.time).getTime())),
            type: 'datetime',
            axisTicks: {
              show: true,
              height: 10
            },
            axisBorder: {
              show: true
            }
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
      }
    };
    // Automatically update whenever the interval (1 hour, 3 hours, 1 day) between data points changes meaningfully
    const timeInterval = 
      timeScale === '1-day' ? (1000 * 60 * 60) :
      timeScale === '7-days' ? (1000 * 60 * 60 * 3) :
      timeScale === '30-days' ? (1000 * 60 * 60 * 24) :
      (1000 * 60 * 60 * 24 * 7);
    const interval = setInterval(fetchData, timeInterval);
    // Do fetch right now
    fetchData();
    return () => { clearInterval(interval) };
  }, [timeScale, geoSelected]);

  const geoMapSelectCallback = React.useCallback((eventArgs: { chartWrapper: GoogleChartWrapper }) => {
    const chart = eventArgs.chartWrapper.getChart();
    const selection = chart.getSelection();
    if (selection.length === 0) return;
    const region = geoData[selection[0].row + 1];
    setGeoSelected(region);
  }, [geoData]);

  const geoMapRender = React.useMemo(() => 
    <GoogleChart
    chartEvents={[
      {
        eventName: "select",
        callback: geoMapSelectCallback,
      },
    ]}
    chartType="GeoChart"
    width="100%"
    height="300px"
    options={{
      colors: ["#FFFFFF", '#DD042B'],
      backgroundColor: "#FFE0E4"
    }}
    data={geoData} />
  , [geoData, geoMapSelectCallback]);

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
            { (isBrowser) ? (
              <>
                <div className={styles.chartHeader}>
                  <div className={styles.chartHeaderLeft}>Active Users</div>
                  <div className={styles.chartHeaderRight}>
                    <SimpleButton
                      className={`${styles.chartFrequencyButton} ${timeScale === '1-day' ? styles.chartFrequencyButtonSelected : ''}`}
                      value={"24 Hours"}
                      onClick={() => {
                        setTimeScale('1-day');
                      }} />
                    <SimpleButton
                      className={`${styles.chartFrequencyButton} ${timeScale === '7-days' ? styles.chartFrequencyButtonSelected : ''}`}
                      value={"7 Days"}
                      onClick={() => {
                        setTimeScale('7-days');
                      }} />
                    <SimpleButton
                      className={`${styles.chartFrequencyButton} ${timeScale === '30-days' ? styles.chartFrequencyButtonSelected : ''}`}
                      value={"30 Days"}
                      onClick={() => {
                        setTimeScale('30-days');
                      }} />
                  </div>
                </div>
                <Chart type={'area'} options={apexOptions} series={apexSeries || []} height='100%'/>
              </>
            ) : undefined }
          </div>
        </div>
      </div>
      <div className={styles.dashboardRow}>
        <div className={`${styles.dashboardSection} ${styles.dashboardSectionGames}`}>
        <div className={`${styles.chartHeader} ${styles.chartHeaderLeft}`}>Geo Map</div>
          {geoMapRender}
        </div>
        <div className={`${styles.dashboardSection} ${styles.dashboardSectionCounter}`}>
          <div className={styles.activeNowHeader}>Games Played</div>
          <div className={styles.activeNowCount}>
            <CountUp duration={gamesPlayedLast === 0 ? 3 : 10} separator="," start={gamesPlayedLast} end={gamesPlayed}/>
          </div>
        </div>
      </div>
      <div className={`${styles.dashboardRow} ${styles.dashboardRowMany}`}>
        <div className={styles.dashboardSection}>
          <div className={styles.chart}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderLeft}>Hardware - Memory</div>
              </div>
              <Chart type='pie' options={hardwareMemoryApexOptions} series={hardwareMemoryApexSeries || []} height='100%'/>
            </div>
        </div>
        <div className={styles.dashboardSection}>
          <div className={styles.chart}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderLeft}>Hardware - Arch</div>
              </div>
              <Chart type='pie' options={hardwareArchApexOptions} series={hardwareArchApexSeries || []} height='100%'/>
            </div>
        </div>
        <div className={styles.dashboardSection}>
          <div className={styles.chart}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderLeft}>Hardware - Operating System</div>
              </div>
              <Chart type='pie' options={hardwareOSApexOptions} series={hardwareOSApexSeries || []} height='100%'/>
            </div>
        </div>
      </div>
      <div className={styles.dashboardRow}>
        <div className={styles.dashboardSection}>
          { (isBrowser) ? (
            <div className={styles.chart}>
              <div className={styles.chartHeader}>
                <div className={styles.chartHeaderLeft}>Most Played Games</div>
              </div>
              <Chart type={'bar'} options={gamesApexOptions} series={gamesApexSeries || []} height='100%'/>
            </div>
          ) : undefined }
        </div>
      </div>
    </div>
  )
}

const baseConfigGames: ApexOptions = {
  chart: {
    type: 'area',
    animations: {
      enabled: false
    }
  },
  noData: {
    text: 'Loading...'
  },
  dataLabels: {
    enabled: false
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true,
    }
  }
}
const baseConfigHardware: ApexOptions = {
  chart: {
    id: 'hardware',
    type: 'pie',
  },
  noData: {
    text: 'Loading...'
  },
  responsive: [{
    breakpoint: 480,
    options: {
      chart: {
        width: 200
      },
      legend: {
        position: 'bottom'
      }
    }
  }]
}

const baseConfigActiveUsers: ApexOptions = {
  chart: {
    id: 'active-users',
    animations: {
      enabled: false
    }
  },
  dataLabels: {
    enabled: false
  },
  noData: {
    text: `Loading...`
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

type HardwareCount = {
  name: string,
  count: number
}

type Hardware = {
  memory: Array<HardwareCount>
  arch: Array<HardwareCount>,
  operatingSystem: Array<HardwareCount>
}