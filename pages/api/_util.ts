export function getAxiosOpts() {
  return {
    headers: {
      'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    timeout: 1000 * 60 * 60
  }
}
