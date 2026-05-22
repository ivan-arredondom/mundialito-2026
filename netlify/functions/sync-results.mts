import type { Config } from '@netlify/functions'

export default async function () {
  const baseUrl = process.env.URL
  const secret = process.env.SYNC_SECRET

  if (!baseUrl || !secret) {
    console.error('Missing URL or SYNC_SECRET env vars')
    return
  }

  const res = await fetch(`${baseUrl}/api/results/sync`, {
    method: 'POST',
    headers: { 'x-sync-secret': secret },
  })

  const json = await res.json()
  console.log('Sync completed:', json)
}

export const config: Config = {
  schedule: '*/15 * * * *',
}
