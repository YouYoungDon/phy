import type { Market, Ticker, Candle } from './types'

const API_BASE = 'https://api.upbit.com/v1'

export async function fetchMarkets(): Promise<Market[]> {
  const response = await fetch(`${API_BASE}/market/all?isDetails=false`)
  if (!response.ok) {
    throw new Error(`Upbit 시장 목록 로드 실패: ${response.status}`)
  }
  return response.json()
}

export async function fetchTickers(markets: string[]): Promise<Ticker[]> {
  if (markets.length === 0) {
    return []
  }

  const response = await fetch(`${API_BASE}/ticker?markets=${markets.join(',')}`)
  if (!response.ok) {
    throw new Error(`Upbit 티커 데이터 로드 실패: ${response.status}`)
  }

  return response.json()
}

export async function fetchDailyCandles(market: string, count = 60): Promise<Candle[]> {
  const response = await fetch(`${API_BASE}/candles/days?market=${market}&count=${count}`)
  if (!response.ok) {
    throw new Error(`Upbit 일간 캔들 데이터 로드 실패: ${response.status}`)
  }
  return response.json()
}
