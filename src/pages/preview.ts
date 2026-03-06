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
    const formattedDate = this.formatDate(dateObj)

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
              <div class="header-content">
                <p class="subtitle">We are getting married</p>
                <h1>${invitation.groomName} <span>&</span> ${invitation.brideName}</h1>
              </div>
            </div>

            <!-- 메인 콘텐츠 -->
            <div class="invitation-main">
              <!-- 대표사진 -->
              ${invitation.mainImage ? `
                <section class="section-main-image">
                  <img src="${invitation.mainImage}" alt="대표사진" class="main-image">
                </section>
              ` : ''}

              <!-- 날짜/시간 -->
              <section class="section-datetime">
                <div class="datetime-item">
                  <span class="label">날짜</span>
                  <span class="value">${formattedDate}</span>
                </div>
                <div class="datetime-item">
                  <span class="label">시간</span>
                  <span class="value">${invitation.time}</span>
                </div>
              </section>

              <!-- 장소 -->
              <section class="section-location">
                <h3>오시는 길</h3>
                <div class="location-info">
                  <p class="hall-name">${invitation.location}</p>
                  <p class="address">${invitation.address}</p>
                  <p class="phone">${invitation.phone}</p>
                </div>
              </section>

              <!-- 메시지 -->
              <section class="section-message">
                ${invitation.quote ? `<p class="quote-text">"${invitation.quote}"</p>` : ''}
                <p class="message-text">"${invitation.message}"</p>
              </section>

              <!-- 갤러리 (있을 경우) -->
              ${invitation.images.length > 0 ? `
                <section class="section-gallery">
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
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`
  }
}
