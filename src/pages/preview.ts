import type { Invitation } from '../types'

interface PreviewPageOptions {
  invitation: Invitation
  onBack: () => void
}

export class PreviewPage {
  private options: PreviewPageOptions

  constructor(options: PreviewPageOptions) {
    this.options = options
  }

  render(container: HTMLElement): void {
    const { invitation } = this.options
    const dateObj = new Date(invitation.date)
    const dayOfMonth = dateObj.getDate()
    const monthYear = this.formatMonthYear(dateObj)

    container.innerHTML = `
      <div class="page preview-page">
        <header class="app-header">
          <button id="btn-back" class="btn-back">← 뒤로</button>
          <h2>미리보기</h2>
          <div style="width: 50px;"></div>
        </header>

        <div class="mobile-frame">
          <div class="mobile-content ${invitation.template}" style="--primary-color: ${invitation.primaryColor}; --secondary-color: ${invitation.secondaryColor};">
            <!-- 헤더 -->
            <div class="invitation-header">
              ${invitation.mainImage ? `<img class="header-bg" src="${invitation.mainImage}" alt="대표사진" />` : ''}
              <div class="header-overlay"></div>
              <div class="header-content">
                <p class="subtitle">We are getting married</p>
                <h1>${invitation.groomName} <span>&</span> ${invitation.brideName}</h1>
              </div>
            </div>

            <!-- 메인 콘텐츠 -->
            <div class="invitation-main">
              <!-- 날짜/시간 -->
              <section class="section-datetime scroll-reveal">
                <div class="calendar-date">
                  <div class="calendar-header">${monthYear}</div>
                  <div class="calendar-grid">
                    ${this.generateCalendarGrid(dateObj, dayOfMonth)}
                  </div>
                  <div class="calendar-footer">${this.getDayName(dateObj)}</div>
                </div>
                <div class="datetime-item scroll-reveal-item">
                  <span class="label">시간</span>
                  <span class="value">${invitation.time}</span>
                </div>
              </section>

              <!-- 장소 -->
              <section class="section-location scroll-reveal">
                <h3>오시는 길</h3>
                <div class="location-info">
                  <p class="hall-name">${invitation.location}</p>
                  <p class="address">${invitation.address}</p>
                  <p class="phone">${invitation.phone}</p>
                </div>
                <div class="location-map">
                  <a href="https://map.naver.com/v5/search/${encodeURIComponent(invitation.address)}" 
                     target="_blank" 
                     class="map-link">
                    📍 네이버 지도에서 위치 보기
                  </a>
                  <a href="https://map.naver.com/v5/directions/${encodeURIComponent(invitation.address)}" 
                     target="_blank" 
                     class="map-link map-link-secondary">
                    🗺️ 길찾기
                  </a>
                </div>
              </section>

              <!-- 메시지 -->
              <section class="section-message scroll-reveal">
                ${invitation.quote ? `<p class="quote-text">"${invitation.quote}"</p>` : ''}
                <p class="message-text">"${invitation.message}"</p>
              </section>

              <!-- 갤러리 (있을 경우) -->
              ${invitation.images.length > 0 ? `
                <section class="section-gallery scroll-reveal">
                  <div class="gallery">
                    ${invitation.images.filter(img => img !== invitation.mainImage).map(img => `
                      <img src="${img}" alt="웨딩 사진">
                    `).join('')}
                  </div>
                </section>
              ` : ''}

              <!-- 푸터 -->
              <section class="section-footer">
                <p>저희 결혼식에 참석해 주셔서 감사입니다</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    `

    container.querySelector('#btn-back')?.addEventListener('click', () => {
      this.options.onBack()
    })

    // ScrollReveal 애니메이션 초기화
    this.initScrollReveal(container)
  }

  private initScrollReveal(container: HTMLElement): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1 })

    container.querySelectorAll('.scroll-reveal').forEach(el => {
      observer.observe(el)
    })
  }

  private formatMonthYear(date: Date): string {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  private getDayName(date: Date): string {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[date.getDay()] + '요일'
  }

  private generateCalendarGrid(dateObj: Date, weddingDay: number): string {
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth()
    
    // 해당 월의 첫째 날과 마지막 날
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const totalDays = lastDay.getDate()
    
    // 첫째 날의 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const startDayOfWeek = firstDay.getDay()
    
    // 요일 헤더
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    let html = '<div class="calendar-weekdays">'
    weekdays.forEach(day => {
      html += `<div class="weekday">${day}</div>`
    })
    html += '</div>'
    
    // 날짜 그리드
    html += '<div class="calendar-days">'
    
    // 빈 칸 채우기 (첫째 날 전까지)
    for (let i = 0; i < startDayOfWeek; i++) {
      html += '<div class="calendar-day empty"></div>'
    }
    
    // 날짜 채우기
    for (let day = 1; day <= totalDays; day++) {
      const isWeddingDay = day === weddingDay
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === month && 
                     new Date().getFullYear() === year
      const classes = ['calendar-day']
      if (isWeddingDay) classes.push('wedding-day')
      if (isToday) classes.push('today')
      
      html += `<div class="${classes.join(' ')}">${day}</div>`
    }
    
    html += '</div>'
    return html
  }
}
