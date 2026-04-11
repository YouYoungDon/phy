import { fetchMarkets, fetchTickers, fetchDailyCandles } from './api'
import type { Market, Ticker, Candle } from './types'

const DEFAULT_MARKETS = ['KRW-BTC', 'KRW-ETH', 'KRW-SOL', 'KRW-ADA', 'KRW-XRP']

interface AnalysisResult {
  rsi14: number
  sma20: number
  sma50: number
  macdHist: number
  bollingerWidth: number
  atr14: number
  volumeRatio: number
  trendLabel: string
  validation: string
}

export class App {
  private root: HTMLElement
  private marketList?: HTMLElement
  private statusElement?: HTMLElement
  private summaryElement?: HTMLElement
  private chartContainer?: HTMLElement
  private indicatorCards?: HTMLElement
  private selectedMarketTitle?: HTMLElement
  private selectedMarketSubtitle?: HTMLElement
  private selectedMarket = DEFAULT_MARKETS[0]
  private markets: Market[] = []

  constructor() {
    const root = document.querySelector<HTMLElement>('#root')
    if (!root) {
      throw new Error('#root 요소를 찾을 수 없습니다.')
    }
    this.root = root
  }

  init(): void {
    this.root.innerHTML = this.getTemplate()
    this.marketList = this.root.querySelector('#market-list') as HTMLElement
    this.statusElement = this.root.querySelector('#status') as HTMLElement
    this.summaryElement = this.root.querySelector('#analysis-summary') as HTMLElement
    this.chartContainer = this.root.querySelector('#chart-container') as HTMLElement
    this.indicatorCards = this.root.querySelector('#indicator-cards') as HTMLElement
    this.selectedMarketTitle = this.root.querySelector('#selected-market-title') as HTMLElement
    this.selectedMarketSubtitle = this.root.querySelector('#selected-market-subtitle') as HTMLElement
    this.attachEvents()
    this.loadMarkets()
  }

  private getTemplate(): string {
    return `
      <section class="dashboard-shell">
        <header>
          <h1>Upbit 투자 대시보드</h1>
          <p>좌측 시장 목록에서 종목을 선택하면 메인 화면에 차트와 지표 분석을 표시합니다.</p>
        </header>

        <div class="dashboard-layout">
          <aside class="market-list-panel">
            <div class="panel-header">
              <h2>KRW 마켓 목록</h2>
              <p>종목을 클릭하여 빠르게 이동합니다.</p>
            </div>
            <div id="market-list" class="market-list">로딩 중...</div>
          </aside>

          <main class="market-detail">
            <div class="detail-header">
              <div>
                <p class="subtle">선택된 종목</p>
                <h2 id="selected-market-title">로딩 중...</h2>
                <p id="selected-market-subtitle">차트와 핵심 지표 분석을 제공합니다.</p>
              </div>
              <button id="refresh-btn" type="button">새로고침</button>
            </div>

            <div id="status" class="status">데이터를 불러오는 중입니다...</div>

            <div id="chart-container" class="chart-card">
              <div class="chart-header">일간 종가 차트</div>
              <div id="market-chart" class="market-chart">차트를 불러오는 중입니다...</div>
            </div>

            <div id="indicator-cards" class="indicator-grid"></div>
            <div id="analysis-summary" class="analysis-summary">선택된 종목의 지표 결과가 표시됩니다.</div>
          </main>
        </div>

        <footer>
          <p>공개 Upbit API를 사용합니다. 개인 자산 정보는 서버 사이드 인증이 필요합니다.</p>
        </footer>
      </section>
    `
  }

  private attachEvents(): void {
    const refreshButton = this.root.querySelector('#refresh-btn') as HTMLButtonElement
    refreshButton?.addEventListener('click', () => this.loadSelectedMarketAnalysis())
  }

  private async loadMarkets(): Promise<void> {
    try {
      this.markets = await fetchMarkets()
      const krwMarkets = this.markets.filter((market) => market.market.startsWith('KRW-'))
      if (!krwMarkets.some((market) => market.market === this.selectedMarket)) {
        this.selectedMarket = krwMarkets[0]?.market ?? this.selectedMarket
      }
      this.renderMarketList(krwMarkets)
      this.loadSelectedMarketAnalysis()
      this.setStatus('시장 목록이 준비되었습니다.')
    } catch (error) {
      this.setStatus('시장 목록을 불러오는 중 오류가 발생했습니다.')
      console.error(error)
    }
  }

  private renderMarketList(markets: Market[]): void {
    if (!this.marketList) return

    const items = markets
      .sort((a, b) => a.market.localeCompare(b.market))
      .map((market) => {
        const activeClass = market.market === this.selectedMarket ? 'active' : ''
        return `<button type="button" class="market-item ${activeClass}" data-market="${market.market}">${market.market}<span>${market.korean_name}</span></button>`
      })
      .join('')

    this.marketList.innerHTML = items
    this.marketList.querySelectorAll<HTMLButtonElement>('.market-item').forEach((button) => {
      button.addEventListener('click', () => {
        const market = button.dataset.market
        if (market) {
          this.selectedMarket = market
          this.highlightSelectedMarket()
          this.loadSelectedMarketAnalysis()
        }
      })
    })
  }

  private highlightSelectedMarket(): void {
    if (!this.marketList) return
    this.marketList.querySelectorAll<HTMLButtonElement>('.market-item').forEach((button) => {
      button.classList.toggle('active', button.dataset.market === this.selectedMarket)
    })
  }

  private async loadSelectedMarketAnalysis(): Promise<void> {
    if (!this.statusElement || !this.selectedMarketTitle || !this.selectedMarketSubtitle) return

    this.selectedMarketTitle.textContent = this.selectedMarket
    this.selectedMarketSubtitle.textContent = '현재 선택된 종목의 캔들 차트와 지표 분석을 표시합니다.'
    this.setStatus(`${this.selectedMarket} 데이터를 불러오는 중입니다...`)

    try {
      const [ticker] = await fetchTickers([this.selectedMarket])
      const candles = await fetchDailyCandles(this.selectedMarket, 60)
      const analysis = this.computeIndicators(candles, ticker)
      this.renderChart(candles)
      this.renderIndicatorCards(analysis)
      this.renderSummary()
      this.setStatus(`마지막 업데이트: ${new Date().toLocaleTimeString()}`)
    } catch (error) {
      this.setStatus('선택된 종목 데이터를 불러오는 중 오류가 발생했습니다.')
      console.error(error)
    }
  }

  private renderChart(candles: Candle[]): void {
    if (!this.chartContainer) return

    const visibleCandles = candles.slice(-30)
    const closes = visibleCandles.map((c) => c.trade_price)
    const minPrice = Math.min(...closes)
    const maxPrice = Math.max(...closes)
    const range = Math.max(maxPrice - minPrice, 1)

    const points = visibleCandles
      .map((candle, index) => {
        const x = 24 + index * 23
        const y = 152 - ((candle.trade_price - minPrice) / range) * 120
        return `${x},${y}`
      })
      .join(' ')

    this.chartContainer.innerHTML = `
      <div class="chart-meta">
        <span>최저 ${this.formatKRW(minPrice)}</span>
        <span>최고 ${this.formatKRW(maxPrice)}</span>
      </div>
      <svg viewBox="0 0 760 180" class="chart-svg" aria-label="가격 차트">
        <polyline fill="none" stroke="#38bdf8" stroke-width="3" points="${points}" />
      </svg>
    `
  }

  private renderIndicatorCards(analysis: AnalysisResult): void {
    if (!this.indicatorCards) return

    this.indicatorCards.innerHTML = `
      <article class="indicator-card">
        <h3>현재 지표 분석</h3>
        <dl>
          <div><dt>RSI(14)</dt><dd>${analysis.rsi14.toFixed(1)}</dd></div>
          <div><dt>SMA(20)</dt><dd>${this.formatKRW(analysis.sma20)}</dd></div>
          <div><dt>SMA(50)</dt><dd>${this.formatKRW(analysis.sma50)}</dd></div>
          <div><dt>MACD 히스토그램</dt><dd>${analysis.macdHist.toFixed(2)}</dd></div>
          <div><dt>볼린저 폭</dt><dd>${analysis.bollingerWidth.toFixed(1)}%</dd></div>
          <div><dt>ATR(14)</dt><dd>${analysis.atr14.toFixed(0)}</dd></div>
          <div><dt>거래량 비율</dt><dd>${analysis.volumeRatio.toFixed(2)}</dd></div>
          <div><dt>추세</dt><dd>${analysis.trendLabel}</dd></div>
          <div><dt>검증</dt><dd class="validation ${analysis.validation.replace(/\s+/g, '-').toLowerCase()}">${analysis.validation}</dd></div>
        </dl>
      </article>
    `
  }

  private renderSummary(): void {
    if (!this.summaryElement) return
    this.summaryElement.innerHTML = `
      <strong>지표 요약</strong>
      <p>현재 선택된 종목의 주요 지표를 종합해 요약 정보를 제공합니다.</p>
    `
  }

  private computeIndicators(candles: Candle[], ticker: Ticker): AnalysisResult {
    const sorted = [...candles].reverse()
    const closes = sorted.map((c) => c.trade_price)
    const volumes = sorted.map((c) => c.candle_acc_trade_volume)

    const sma20 = this.sma(closes, 20)
    const sma50 = this.sma(closes, 50)
    const rsi14 = this.rsi(closes, 14)
    const macdHist = this.macdHistogram(closes, 12, 26, 9)
    const bollingerWidth = this.bollingerWidth(closes, 20)
    const atr14 = this.atr(sorted, 14)
    const volumeRatio = Math.max(volumes[volumes.length - 1] / Math.max(this.sma(volumes, 20), 1), 0)
    const trendLabel = this.getTrendLabelFromIndicators(ticker.trade_price, sma20, sma50)
    const validation = this.getValidationLabel({ rsi14, sma20, sma50, macdHist, bollingerWidth, atr14, volumeRatio, trendLabel, price: ticker.trade_price })

    return {
      rsi14,
      sma20,
      sma50,
      macdHist,
      bollingerWidth,
      atr14,
      volumeRatio,
      trendLabel,
      validation
    }
  }

  private sma(values: number[], period: number): number {
    if (values.length < period) {
      return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
    }
    const slice = values.slice(-period)
    return slice.reduce((sum, value) => sum + value, 0) / period
  }

  private ema(values: number[], period: number): number[] {
    if (values.length === 0) {
      return []
    }
    const k = 2 / (period + 1)
    return values.reduce<number[]>((result, value, index) => {
      if (index === 0) {
        result.push(value)
      } else {
        result.push(value * k + result[index - 1] * (1 - k))
      }
      return result
    }, [])
  }

  private rsi(values: number[], period: number): number {
    if (values.length <= period) {
      return 50
    }
    let gains = 0
    let losses = 0
    for (let i = values.length - period; i < values.length; i++) {
      const change = values[i] - values[i - 1]
      if (change > 0) gains += change
      else losses -= change
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    if (avgLoss === 0) {
      return 100
    }
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  private macdHistogram(values: number[], shortPeriod: number, longPeriod: number, signalPeriod: number): number {
    const shortEma = this.ema(values, shortPeriod)
    const longEma = this.ema(values, longPeriod)
    const macdLine = values.map((_, index) => {
      if (index < longPeriod - 1) {
        return 0
      }
      return shortEma[index] - longEma[index]
    })
    const signalLine = this.ema(macdLine.slice(longPeriod - 1), signalPeriod)
    if (signalLine.length === 0) {
      return 0
    }
    return macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1]
  }

  private bollingerWidth(values: number[], period: number): number {
    if (values.length < period) {
      return 0
    }
    const slice = values.slice(-period)
    const mean = slice.reduce((sum, value) => sum + value, 0) / period
    const variance = slice.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / period
    const stdDev = Math.sqrt(variance)
    return mean === 0 ? 0 : (stdDev * 2 / mean) * 100
  }

  private atr(candles: Candle[], period: number): number {
    if (candles.length <= period) {
      return 0
    }
    const trs: number[] = []
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i]
      const previous = candles[i - 1]
      const highLow = current.high_price - current.low_price
      const highClose = Math.abs(current.high_price - previous.trade_price)
      const lowClose = Math.abs(current.low_price - previous.trade_price)
      trs.push(Math.max(highLow, highClose, lowClose))
    }
    return this.sma(trs.slice(-period), period)
  }

  private getTrendLabelFromIndicators(price: number, sma20: number, sma50: number): string {
    if (price > sma20 && price > sma50) {
      return '상승 추세'
    }
    if (price < sma20 && price < sma50) {
      return '하락 추세'
    }
    return '혼조 추세'
  }

  private getValidationLabel(result: Omit<AnalysisResult, 'validation'> & { price: number }): string {
    let score = 0
    score += result.rsi14 < 30 ? 2 : result.rsi14 < 50 ? 1 : 0
    score += result.macdHist > 0 ? 2 : 0
    score += result.bollingerWidth < 6 ? 2 : result.bollingerWidth < 12 ? 1 : 0
    score += result.atr14 / Math.max(result.price, 1) < 0.03 ? 2 : 1
    score += result.volumeRatio > 1.2 ? 2 : result.volumeRatio > 0.9 ? 1 : 0
    score += result.price > result.sma20 ? 1 : 0
    score += result.price > result.sma50 ? 1 : 0

    if (score >= 8 && result.trendLabel === '상승 추세') {
      return '적극 매수'
    }
    if (score >= 5) {
      return '주의 관찰'
    }
    return '보수 관망'
  }

  private setStatus(message: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = message
    }
  }

  private formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value)
  }
}
