export interface Market {
  market: string
  korean_name: string
  english_name: string
  market_warning: string | null
  market_type: string
}

export interface Ticker {
  market: string
  trade_price: number
  change: string
  change_rate: number
  signed_change_price: number
  high_price: number
  low_price: number
  acc_trade_price_24h: number
  acc_trade_volume_24h: number
  prev_closing_price: number
}

export interface Candle {
  market: string
  candle_date_time_utc: string
  candle_date_time_kst: string
  opening_price: number
  high_price: number
  low_price: number
  trade_price: number
  timestamp: number
  candle_acc_trade_price: number
  candle_acc_trade_volume: number
  unit: number
}
