import { fetchMarkets, fetchTickers } from './api'
import type { Market, Ticker } from './types'

const DEFAULT_MARKETS = ['KRW-BTC', 'KRW-ETH', 'KRW-SOL', 'KRW-ADA', 'KRW-XRP']

interface AnalysisResult {
  dailyRangeRate: number
  volumeEfficiency: number
  momentumScore: number
  trendLabel: string
  validation: string
}

export class App {
  private root: HTMLElement
  private marketSelect?: HTMLSelectElement
  private statusElement?: HTMLElement
  private summaryElement?: HTMLElement
  private tableBody?: HTMLElement
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
          <p>실시간 시장 정보를 조회하고 핵심 지표를 바탕으로 종목을 검증합니다.</p>
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
        <div id="analysis-summary" class="analysis-summary">핵심 지표가 준비되면 분석 결과가 표시됩니다.</div>

        <div class="ticker-card">
          <table>
            <thead>
              <tr>
                <th>마켓</th>
                <th>현재가</th>
                <th>변동률</th>
                <th>24H 거래대금</th>
                <th>당일 변동폭</th>
                <th>거래 효율</th>
                <th>모멘텀</th>
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

    this.setStatus('Upbit 티커를 불러오는 중입니다...')

    try {
      const tickers = await fetchTickers(this.selectedMarkets)
      this.renderTickers(tickers)
      this.renderSummary(tickers)
      this.setStatus(`마지막 업데이트: ${new Date().toLocaleTimeString()}`)
    } catch (error) {
      this.setStatus('티커 데이터를 불러오는 중 오류가 발생했습니다.')
      console.error(error)
    }
  }

  private renderTickers(tickers: Ticker[]): void {
    if (!this.tableBody) return

    const rows = tickers
      .map((ticker) => {
        const analysis = this.analyzeTicker(ticker)
        const changeRate = (ticker.change_rate * 100).toFixed(2)
        return `
          <tr>
            <td>${ticker.market}</td>
            <td>${this.formatKRW(ticker.trade_price)}</td>
            <td>${changeRate}%</td>
            <td>${this.formatKRW(ticker.acc_trade_price_24h)}</td>
            <td>${analysis.dailyRangeRate.toFixed(2)}%</td>
            <td>${analysis.volumeEfficiency.toFixed(2)}</td>
            <td>${analysis.momentumScore.toFixed(2)}</td>
            <td>${analysis.trendLabel}</td>
            <td class="validation ${analysis.validation.toLowerCase()}">${analysis.validation}</td>
          </tr>
        `
      })
      .join('')

    this.tableBody.innerHTML = rows
  }

  private renderSummary(tickers: Ticker[]): void {
    if (!this.summaryElement) return

    const analyses = tickers.map((ticker) => this.analyzeTicker(ticker))
    const strongCount = analyses.filter((item) => item.validation === '적극 매수').length
    const safeCount = analyses.filter((item) => item.validation === '주의 관찰').length
    const cautionCount = analyses.filter((item) => item.validation === '보수 관망').length

    this.summaryElement.innerHTML = `
      <strong>종목 검증 요약</strong>
      <p>적극 매수: ${strongCount}개 · 주의 관찰: ${safeCount}개 · 보수 관망: ${cautionCount}개</p>
    `
  }

  private analyzeTicker(ticker: Ticker): AnalysisResult {
    const dailyRangeRate = ((ticker.high_price - ticker.low_price) / Math.max(ticker.prev_closing_price, 1)) * 100
    const volumeEfficiency = ticker.acc_trade_price_24h / Math.max(ticker.trade_price, 1)
    const momentumScore = (ticker.change_rate * 100) + (ticker.trade_price - ticker.prev_closing_price) / Math.max(ticker.prev_closing_price, 1) * 100
    const trendLabel = this.getTrendLabel(ticker)
    const validation = this.getValidationLabel({ dailyRangeRate, volumeEfficiency, momentumScore, trendLabel, changeRate: ticker.change_rate * 100 })

    return {
      dailyRangeRate,
      volumeEfficiency,
      momentumScore,
      trendLabel,
      validation
    }
  }

  private getTrendLabel(ticker: Ticker): string {
    const priceMid = (ticker.high_price + ticker.low_price) / 2
    if (ticker.trade_price > priceMid && ticker.trade_price > ticker.prev_closing_price) {
      return '상승 추세'
    }
    if (ticker.trade_price < priceMid && ticker.trade_price < ticker.prev_closing_price) {
      return '하락 추세'
    }
    return '횡보 추세'
  }

  private getValidationLabel(result: Omit<AnalysisResult, 'validation'> & { changeRate: number }): string {
    const score =
      (result.changeRate > 2 ? 2 : result.changeRate > 0 ? 1 : 0) +
      (result.dailyRangeRate < 8 ? 2 : result.dailyRangeRate < 15 ? 1 : 0) +
      (result.volumeEfficiency > 3000 ? 2 : result.volumeEfficiency > 1000 ? 1 : 0) +
      (result.momentumScore > 2 ? 2 : result.momentumScore > 0 ? 1 : 0)

    if (score >= 6 && result.trendLabel === '상승 추세') {
      return '적극 매수'
    }
    if (score >= 4) {
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
