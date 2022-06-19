export function getAxiosOpts() {
  return {
    headers: {
      'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  }
}