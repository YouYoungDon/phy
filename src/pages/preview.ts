import type { Invitation, WeddingComment } from '../types'
import { StorageManager } from '../storage'

declare global {
  interface Window {
    naver: any
  }
}

interface PreviewPageOptions {
  invitation: Invitation
  onBack: () => void
}

export class PreviewPage {
  private options: PreviewPageOptions
  private currentPage: number = 1
  private readonly commentsPerPage: number = 10

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
                  <div id="map-${invitation.id}" class="naver-map" style="width: 100%; height: 200px;"></div>
                  <div class="map-buttons">
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
              <!-- 댓글 -->
              <section class="section-comments scroll-reveal">
                <h3>축하 메시지</h3>
                <div class="comments-list" id="comments-list-${invitation.id}">
                  ${this.renderCommentsPage(invitation.comments, 1)}
                </div>
                ${invitation.comments.length > this.commentsPerPage ? `
                  <div class="comments-pagination" id="comments-pagination-${invitation.id}">
                    ${this.renderPagination(invitation.comments.length)}
                  </div>
                ` : ''}
                <div class="comment-form">
                  <input type="text" id="comment-author-${invitation.id}" placeholder="이름" class="comment-input">
                  <textarea id="comment-content-${invitation.id}" placeholder="축하 메시지를 남겨주세요" class="comment-textarea" rows="3"></textarea>
                  <button id="submit-comment-${invitation.id}" class="btn btn-primary comment-submit">메시지 남기기</button>
                </div>
                <div class="comment-management" id="comment-management-${invitation.id}" style="display: none;">
                  <h4>댓글 관리</h4>
                  <input type="password" id="admin-password-${invitation.id}" placeholder="관리자 비밀번호" class="comment-input">
                  <button id="verify-admin-${invitation.id}" class="btn btn-secondary">관리자 인증</button>
                  <div class="admin-controls" id="admin-controls-${invitation.id}" style="display: none;">
                    <p>댓글을 선택하여 삭제하거나 수정할 수 있습니다.</p>
                  </div>
                </div>
              </section>
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

    // 네이버 지도 초기화
    setTimeout(() => {
      this.initNaverMap(invitation)
    }, 100)

    // 댓글 이벤트 리스너
    this.initCommentEvents(container, invitation)
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

  private initCommentEvents(container: HTMLElement, invitation: Invitation): void {
    const submitBtn = container.querySelector(`#submit-comment-${invitation.id}`) as HTMLButtonElement
    const authorInput = container.querySelector(`#comment-author-${invitation.id}`) as HTMLInputElement
    const contentTextarea = container.querySelector(`#comment-content-${invitation.id}`) as HTMLTextAreaElement
    const verifyAdminBtn = container.querySelector(`#verify-admin-${invitation.id}`) as HTMLButtonElement
    const adminPasswordInput = container.querySelector(`#admin-password-${invitation.id}`) as HTMLInputElement
    const managementSection = container.querySelector(`#comment-management-${invitation.id}`) as HTMLElement
    const adminControls = container.querySelector(`#admin-controls-${invitation.id}`) as HTMLElement

    submitBtn?.addEventListener('click', () => {
      const author = authorInput.value.trim()
      const content = contentTextarea.value.trim()

      // 입력 검증 강화
      if (!author) {
        alert('이름을 입력해주세요.')
        authorInput.focus()
        return
      }

      if (!content) {
        alert('축하 메시지를 입력해주세요.')
        contentTextarea.focus()
        return
      }

      if (author.length > 20) {
        alert('이름은 20자 이하로 입력해주세요.')
        authorInput.focus()
        return
      }

      if (content.length > 500) {
        alert('축하 메시지는 500자 이하로 입력해주세요.')
        contentTextarea.focus()
        return
      }

      try {
        // 댓글 추가
        StorageManager.addComment(invitation.id, { author: author, content: content })

        // 입력 필드 초기화
        authorInput.value = ''
        contentTextarea.value = ''

        // 최신 데이터를 다시 가져와서 업데이트
        const updatedInvitation = StorageManager.get(invitation.id)
        if (updatedInvitation) {
          // 마지막 페이지로 이동 (새 댓글이 보이도록)
          this.currentPage = Math.ceil(updatedInvitation.comments.length / this.commentsPerPage)
          this.updateCommentsList(container, updatedInvitation)
        }
      } catch (error) {
        console.error('댓글 추가 중 오류 발생:', error)
        alert('댓글 추가 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    })

    // 관리자 인증
    verifyAdminBtn?.addEventListener('click', () => {
      const password = adminPasswordInput.value.trim()
      if (password === 'admin123') { // 간단한 비밀번호 (실제로는 더 안전한 방식 사용 권장)
        adminControls.style.display = 'block'
        adminPasswordInput.value = ''
        this.showCommentActions(container, invitation)
      } else {
        alert('잘못된 비밀번호입니다.')
      }
    })

    // 댓글 관리 토글
    const toggleManagement = () => {
      const isVisible = managementSection.style.display !== 'none'
      managementSection.style.display = isVisible ? 'none' : 'block'
      if (!isVisible) {
        adminControls.style.display = 'none'
        this.hideCommentActions(container)
      }
    }

    // 관리자 섹션 토글 버튼 (간단하게 댓글 섹션 헤더에 추가)
    const commentsSection = container.querySelector('.section-comments h3')
    if (commentsSection && !commentsSection.querySelector('.admin-toggle')) {
      const toggleBtn = document.createElement('button')
      toggleBtn.className = 'admin-toggle'
      toggleBtn.textContent = '⚙️ 관리'
      toggleBtn.style.cssText = 'float: right; font-size: 0.8rem; background: none; border: none; color: #666; cursor: pointer;'
      toggleBtn.addEventListener('click', toggleManagement)
      commentsSection.appendChild(toggleBtn)
    }
  }

  private renderCommentsPage(comments: WeddingComment[], page: number): string {
    const startIndex = (page - 1) * this.commentsPerPage
    const endIndex = startIndex + this.commentsPerPage
    const pageComments = comments.slice(startIndex, endIndex)

    return pageComments.map(comment => `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-header">
          <span class="comment-author">${comment.author}</span>
          <span class="comment-date">${this.formatCommentDate(comment.createdAt)}</span>
        </div>
        <div class="comment-content">${comment.content}</div>
      </div>
    `).join('')
  }

  private renderPagination(totalComments: number): string {
    const totalPages = Math.ceil(totalComments / this.commentsPerPage)
    let paginationHtml = ''

    if (totalPages > 1) {
      // 이전 버튼
      if (this.currentPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-page="${this.currentPage - 1}">‹ 이전</button>`
      }

      // 페이지 번호
      for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === this.currentPage ? 'active' : ''
        paginationHtml += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`
      }

      // 다음 버튼
      if (this.currentPage < totalPages) {
        paginationHtml += `<button class="pagination-btn" data-page="${this.currentPage + 1}">다음 ›</button>`
      }
    }

    return paginationHtml
  }

  private formatCommentDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return '오늘'
    } else if (diffDays === 1) {
      return '어제'
    } else if (diffDays < 7) {
      return `${diffDays}일 전`
    } else {
      return date.toLocaleDateString('ko-KR')
    }
  }

  private updateCommentsList(container: HTMLElement, invitation: Invitation): void {
    const commentsList = container.querySelector(`#comments-list-${invitation.id}`)
    const paginationContainer = container.querySelector(`#comments-pagination-${invitation.id}`)

    if (commentsList) {
      commentsList.innerHTML = this.renderCommentsPage(invitation.comments, this.currentPage)
    }

    if (paginationContainer) {
      if (invitation.comments.length > this.commentsPerPage) {
        paginationContainer.innerHTML = this.renderPagination(invitation.comments.length)
        this.initPaginationEvents(container, invitation)
      } else {
        paginationContainer.innerHTML = ''
      }
    }
  }

  private showCommentActions(container: HTMLElement, invitation: Invitation): void {
    const commentItems = container.querySelectorAll('.comment-item')
    commentItems.forEach(item => {
      const actions = item.querySelector('.comment-actions') as HTMLElement
      if (actions) {
        actions.style.display = 'block'
      }
    })

    // 수정/삭제 이벤트 리스너 추가
    this.initCommentActionEvents(container, invitation)
  }

  private hideCommentActions(container: HTMLElement): void {
    const commentItems = container.querySelectorAll('.comment-item')
    commentItems.forEach(item => {
      const actions = item.querySelector('.comment-actions') as HTMLElement
      const editForm = item.querySelector('.comment-edit-form') as HTMLElement
      if (actions) actions.style.display = 'none'
      if (editForm) editForm.style.display = 'none'
    })
  }

  private initCommentActionEvents(container: HTMLElement, invitation: Invitation): void {
    // 기존 이벤트 리스너 제거 - 메소드 참조로는 제거할 수 없으므로 요소를 새로 생성하는 방식으로 처리
    // oldDeleteBtns.forEach(btn => btn.removeEventListener('click', this.handleDeleteClick))
    // oldEditBtns.forEach(btn => btn.removeEventListener('click', this.handleEditClick))
    // oldSaveBtns.forEach(btn => btn.removeEventListener('click', this.handleSaveClick))
    // oldCancelBtns.forEach(btn => btn.removeEventListener('click', this.handleCancelClick))

    // 삭제 버튼 이벤트
    container.querySelectorAll('.comment-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleDeleteClick(e, container, invitation))
    })

    // 수정 버튼 이벤트
    container.querySelectorAll('.comment-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleEditClick(e, container))
    })

    // 수정 저장 버튼 이벤트
    container.querySelectorAll('.comment-save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleSaveClick(e, container, invitation))
    })

    // 수정 취소 버튼 이벤트
    container.querySelectorAll('.comment-cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleCancelClick(e, container))
    })
  }

  private handleDeleteClick = (e: Event, container: HTMLElement, invitation: Invitation) => {
    e.preventDefault()
    const commentId = (e.target as HTMLElement).getAttribute('data-comment-id')
    if (commentId && confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      StorageManager.deleteComment(invitation.id, commentId)
      const updatedInvitation = StorageManager.get(invitation.id)
      if (updatedInvitation) {
        this.updateCommentsList(container, updatedInvitation)
      }
    }
  }

  private handleEditClick = (e: Event, container: HTMLElement) => {
    e.preventDefault()
    const commentId = (e.target as HTMLElement).getAttribute('data-comment-id')
    if (commentId) {
      this.showEditForm(container, commentId)
    }
  }

  private handleSaveClick = (e: Event, container: HTMLElement, invitation: Invitation) => {
    e.preventDefault()
    const commentId = (e.target as HTMLElement).getAttribute('data-comment-id')
    if (commentId) {
      this.saveCommentEdit(container, invitation, commentId)
    }
  }

  private handleCancelClick = (e: Event, container: HTMLElement) => {
    e.preventDefault()
    const commentId = (e.target as HTMLElement).getAttribute('data-comment-id')
    if (commentId) {
      this.hideEditForm(container, commentId)
    }
  }

  private showEditForm(container: HTMLElement, commentId: string): void {
    const commentItem = container.querySelector(`[data-comment-id="${commentId}"]`)
    if (commentItem) {
      const content = commentItem.querySelector('.comment-content') as HTMLElement
      const editForm = commentItem.querySelector('.comment-edit-form') as HTMLElement

      if (content && editForm) {
        content.style.display = 'none'
        editForm.style.display = 'block'
      }
    }
  }

  private hideEditForm(container: HTMLElement, commentId: string): void {
    const commentItem = container.querySelector(`[data-comment-id="${commentId}"]`)
    if (commentItem) {
      const content = commentItem.querySelector('.comment-content') as HTMLElement
      const editForm = commentItem.querySelector('.comment-edit-form') as HTMLElement

      if (content && editForm) {
        content.style.display = 'block'
        editForm.style.display = 'none'
      }
    }
  }

  private saveCommentEdit(container: HTMLElement, invitation: Invitation, commentId: string): void {
    const commentItem = container.querySelector(`[data-comment-id="${commentId}"]`)
    if (commentItem) {
      const textarea = commentItem.querySelector('.comment-edit-textarea') as HTMLTextAreaElement
      const newContent = textarea.value.trim()

      if (newContent) {
        // 댓글 내용 업데이트 (실제로는 StorageManager에 updateComment 메서드 필요)
        const comment = invitation.comments.find(c => c.id === commentId)
        if (comment) {
          comment.content = newContent
          StorageManager.save(invitation)
          this.updateCommentsList(container, invitation)
        }
      } else {
        alert('댓글 내용을 입력해주세요.')
      }
    }
  }

  private initNaverMap(invitation: Invitation): void {
    const mapElement = document.getElementById(`map-${invitation.id}`)
    if (!mapElement || typeof window.naver === 'undefined') return

    try {
      // 기본 위치 설정 (서울 시청)
      const defaultLat = 37.5665
      const defaultLng = 126.9780

      const mapOptions = {
        center: new window.naver.maps.LatLng(defaultLat, defaultLng),
        zoom: 15,
        mapTypeControl: false,
        mapTypeControlOptions: {
          style: window.naver.maps.MapTypeControlStyle.BUTTON,
          position: window.naver.maps.Position.TOP_RIGHT
        },
        zoomControl: true,
        zoomControlOptions: {
          style: window.naver.maps.ZoomControlStyle.SMALL,
          position: window.naver.maps.Position.TOP_LEFT
        }
      }

      const map = new window.naver.maps.Map(mapElement, mapOptions)

      // 주소로 좌표 검색 (실제로는 Geocoding API 필요)
      // 임시로 기본 위치에 마커 표시
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(defaultLat, defaultLng),
        map: map,
        title: invitation.location
      })

      // 정보창
      const infoWindow = new window.naver.maps.InfoWindow({
        content: `<div style="padding: 10px; font-size: 12px;">
          <strong>${invitation.location}</strong><br>
          ${invitation.address}
        </div>`
      })

      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (infoWindow.getMap()) {
          infoWindow.close()
        } else {
          infoWindow.open(map, marker)
        }
      })

    } catch (error) {
      console.warn('네이버 지도 초기화 실패:', error)
      // 지도 초기화 실패 시 링크만 표시
      mapElement.style.display = 'none'
    }
  }

  private initPaginationEvents(container: HTMLElement, invitation: Invitation): void {
    const paginationBtns = container.querySelectorAll(`#comments-pagination-${invitation.id} .pagination-btn`)

    paginationBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = parseInt((e.target as HTMLElement).getAttribute('data-page') || '1')
        this.currentPage = page
        this.updateCommentsList(container, invitation)
      })
    })
  }
}
