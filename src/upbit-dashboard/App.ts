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

interface MarketAnalysis {
  ticker: Ticker
  analysis: AnalysisResult
}

export class App {
  private root: HTMLElement
  private marketSelect?: HTMLSelectElement
  private statusElement?: HTMLElement
  private summaryElement?: HTMLElement
  private tableBody?: HTMLElement
  private indicatorCards?: HTMLElement
  private selectedMarkets = [...DEFAULT_MARKETS]
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
    this.marketSelect = this.root.querySelector('#market-select') as HTMLSelectElement
    this.statusElement = this.root.querySelector('#status') as HTMLElement
    this.summaryElement = this.root.querySelector('#analysis-summary') as HTMLElement
    this.indicatorCards = this.root.querySelector('#indicator-cards') as HTMLElement
    this.tableBody = this.root.querySelector('#ticker-body') as HTMLElement
    this.attachEvents()
    this.loadMarkets()
    this.refreshTickers()
  }

  private getTemplate(): string {
    return `
      <section class="dashboard-shell">
        <header>
          <h1>Upbit 투자 대시보드</h1>
          <p>실시간 시장 정보를 조회하고 캔들 데이터를 기반으로 주요 차트 지표를 계산합니다.</p>
        </header>

        <div class="controls">
          <div class="control-group">
            <label for="market-select">시장 선택</label>
            <select id="market-select" aria-label="시장 선택"></select>
          </div>

          <div class="control-group buttons">
            <button id="add-market-btn" type="button">추가</button>
            <button id="refresh-btn" type="button">새로고침</button>
            <button id="reset-btn" type="button">기본 마켓으로 초기화</button>
          </div>
        </div>

        <div id="status" class="status">데이터를 불러오는 중입니다...</div>
        <div id="analysis-summary" class="analysis-summary">캔들 데이터를 불러오면 차트 지표가 계산됩니다.</div>
        <div id="indicator-cards" class="indicator-grid"></div>

        <div class="ticker-card">
          <table>
            <thead>
              <tr>
                <th>마켓</th>
                <th>현재가</th>
                <th>RSI(14)</th>
                <th>SMA(20)</th>
                <th>SMA(50)</th>
                <th>MACD</th>
                <th>BB 넓이</th>
                <th>ATR(14)</th>
                <th>거래량비</th>
                <th>추세</th>
                <th>검증</th>
              </tr>
            </thead>
            <tbody id="ticker-body"></tbody>
          </table>
        </div>

        <footer>
          <p>공개 Upbit API를 사용합니다. 개인 자산 정보는 서버 사이드 인증이 필요합니다.</p>
        </footer>
      </section>
    `
  }

  private attachEvents(): void {
    const refreshButton = this.root.querySelector('#refresh-btn') as HTMLButtonElement
    const addButton = this.root.querySelector('#add-market-btn') as HTMLButtonElement
    const resetButton = this.root.querySelector('#reset-btn') as HTMLButtonElement

    refreshButton?.addEventListener('click', () => this.refreshTickers())
    addButton?.addEventListener('click', () => this.addSelectedMarket())
    resetButton?.addEventListener('click', () => this.resetMarkets())
  }

  private async loadMarkets(): Promise<void> {
    try {
      this.markets = await fetchMarkets()
      this.populateMarketOptions()
      this.setStatus('시장 목록이 준비되었습니다.')
    } catch (error) {
      this.setStatus('시장 목록을 불러오는 중 오류가 발생했습니다.')
      console.error(error)
    }
  }

  private populateMarketOptions(): void {
    if (!this.marketSelect) return

    const krwMarkets = this.markets.filter((market) => market.market.startsWith('KRW-'))
    const options = krwMarkets
      .sort((a, b) => a.market.localeCompare(b.market))
      .map((market) => `<option value="${market.market}">${market.market} · ${market.korean_name}</option>`)
      .join('')

    this.marketSelect.innerHTML = options
  }

  private async refreshTickers(): Promise<void> {
    if (!this.statusElement || !this.tableBody) return

    if (this.selectedMarkets.length === 0) {
      this.setStatus('선택된 마켓이 없습니다. 마켓을 추가해 주세요.')
      this.tableBody.innerHTML = ''
      return
    }

    this.setStatus('Upbit 티커와 캔들 지표를 불러오는 중입니다...')

    try {
      const tickers = await fetchTickers(this.selectedMarkets)
      const analyses = await Promise.all(tickers.map((ticker) => this.buildMarketAnalysis(ticker)))
      this.renderTickers(analyses)
      this.renderSummary(analyses)
      this.renderIndicatorCards(analyses)
      this.setStatus(`마지막 업데이트: ${new Date().toLocaleTimeString()}`)
    } catch (error) {
      this.setStatus('데이터를 불러오는 중 오류가 발생했습니다.')
      console.error(error)
    }
  }

  private async buildMarketAnalysis(ticker: Ticker): Promise<MarketAnalysis> {
    try {
      const candles = await fetchDailyCandles(ticker.market, 60)
      const analysis = this.computeIndicators(candles, ticker)
      return { ticker, analysis }
    } catch (error) {
      console.error(`지표 계산 실패: ${ticker.market}`, error)
      return { ticker, analysis: this.computeFallbackAnalysis(ticker) }
    }
  }

  private renderTickers(analyses: MarketAnalysis[]): void {
    if (!this.tableBody) return

    const rows = analyses
      .map(({ ticker, analysis }) => {
        return `
          <tr>
            <td>${ticker.market}</td>
            <td>${this.formatKRW(ticker.trade_price)}</td>
            <td>${analysis.rsi14.toFixed(1)}</td>
            <td>${this.formatKRW(analysis.sma20)}</td>
            <td>${this.formatKRW(analysis.sma50)}</td>
            <td>${analysis.macdHist.toFixed(2)}</td>
            <td>${analysis.bollingerWidth.toFixed(1)}%</td>
            <td>${analysis.atr14.toFixed(0)}</td>
            <td>${analysis.volumeRatio.toFixed(2)}</td>
            <td>${analysis.trendLabel}</td>
            <td class="validation ${analysis.validation.replace(/\s+/g, '-').toLowerCase()}">${analysis.validation}</td>
          </tr>
        `
      })
      .join('')

    this.tableBody.innerHTML = rows
  }

  private renderSummary(analyses: MarketAnalysis[]): void {
    if (!this.summaryElement) return

    const strongCount = analyses.filter((item) => item.analysis.validation === '적극 매수').length
    const safeCount = analyses.filter((item) => item.analysis.validation === '주의 관찰').length
    const cautionCount = analyses.filter((item) => item.analysis.validation === '보수 관망').length

    this.summaryElement.innerHTML = `
      <strong>종목 검증 요약</strong>
      <p>적극 매수: ${strongCount}개 · 주의 관찰: ${safeCount}개 · 보수 관망: ${cautionCount}개</p>
    `
  }

  private renderIndicatorCards(analyses: MarketAnalysis[]): void {
    if (!this.indicatorCards) return

    const cards = analyses
      .map(({ ticker, analysis }) => {
        return `
          <article class="indicator-card">
            <h3>${ticker.market}</h3>
            <dl>
              <div><dt>RSI(14)</dt><dd>${analysis.rsi14.toFixed(1)}</dd></div>
              <div><dt>SMA(20)</dt><dd>${this.formatKRW(analysis.sma20)}</dd></div>
              <div><dt>SMA(50)</dt><dd>${this.formatKRW(analysis.sma50)}</dd></div>
              <div><dt>MACD</dt><dd>${analysis.macdHist.toFixed(2)}</dd></div>
              <div><dt>BB 넓이</dt><dd>${analysis.bollingerWidth.toFixed(1)}%</dd></div>
              <div><dt>ATR(14)</dt><dd>${analysis.atr14.toFixed(0)}</dd></div>
              <div><dt>거래량비</dt><dd>${analysis.volumeRatio.toFixed(2)}</dd></div>
              <div><dt>검증</dt><dd>${analysis.validation}</dd></div>
            </dl>
          </article>
        `
      })
      .join('')

    this.indicatorCards.innerHTML = cards
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

  private computeFallbackAnalysis(ticker: Ticker): AnalysisResult {
    const price = ticker.trade_price
    const trendLabel = this.getTrendLabelFromIndicators(price, price, price)
    const validation = this.getValidationLabel({
      rsi14: 50,
      sma20: price,
      sma50: price,
      macdHist: 0,
      bollingerWidth: 0,
      atr14: 0,
      volumeRatio: 1,
      trendLabel,
      price
    })

    return {
      rsi14: 50,
      sma20: price,
      sma50: price,
      macdHist: 0,
      bollingerWidth: 0,
      atr14: 0,
      volumeRatio: 1,
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

  private addSelectedMarket(): void {
    if (!this.marketSelect) return

    const marketCode = this.marketSelect.value
    if (!marketCode) return

    if (this.selectedMarkets.includes(marketCode)) {
      this.setStatus(`${marketCode}는 이미 선택된 마켓입니다.`)
      return
    }

    this.selectedMarkets.push(marketCode)
    this.setStatus(`${marketCode}를 모니터링 목록에 추가했습니다.`)
    this.refreshTickers()
  }

  private resetMarkets(): void {
    this.selectedMarkets = [...DEFAULT_MARKETS]
    this.setStatus('기본 마켓 목록으로 초기화했습니다.')
    this.refreshTickers()
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
