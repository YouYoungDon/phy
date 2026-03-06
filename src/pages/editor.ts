import type { Invitation } from '../types'

interface EditorPageOptions {
    invitation: Invitation
    onSave: (invitation: Invitation) => void
    onCancel: () => void
    onPreview: (invitation: Invitation) => void
}

export class EditorPage {
    private options: EditorPageOptions
    private invitation: Invitation

    constructor(options: EditorPageOptions) {
        this.options = options
        this.invitation = JSON.parse(JSON.stringify(options.invitation))
    }

    render(container: HTMLElement): void {
        container.innerHTML = `
      <div class="page editor-page">
        <header class="app-header">
          <button id="btn-back" class="btn-back">← 뒤로</button>
          <h2>청첩장 편집</h2>
          <div style="width: 50px;"></div>
        </header>

        <div class="editor-container">
          <form id="invitation-form" class="invitation-form">
            <!-- 기본 정보 -->
            <fieldset>
              <legend>기본 정보</legend>
              
              <div class="form-group">
                <label>청첩장 제목</label>
                <input type="text" name="title" value="${this.invitation.title}" required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>신랑 이름 *</label>
                  <input type="text" name="groomName" value="${this.invitation.groomName}" required>
                </div>
                <div class="form-group">
                  <label>신부 이름 *</label>
                  <input type="text" name="brideName" value="${this.invitation.brideName}" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>결혼 날짜 *</label>
                  <input type="date" name="date" value="${this.invitation.date}" required>
                </div>
                <div class="form-group">
                  <label>결혼 시간 *</label>
                  <input type="time" name="time" value="${this.invitation.time}" required>
                </div>
              </div>
            </fieldset>

            <!-- 장소 정보 -->
            <fieldset>
              <legend>장소 정보</legend>
              
              <div class="form-group">
                <label>홀 이름</label>
                <input type="text" name="location" value="${this.invitation.location}">
              </div>

              <div class="form-group">
                <label>주소</label>
                <input type="text" name="address" value="${this.invitation.address}">
              </div>

              <div class="form-group">
                <label>전화번호</label>
                <input type="tel" name="phone" value="${this.invitation.phone}">
              </div>
            </fieldset>

            <!-- 메시지 -->
            <fieldset>
              <legend>초대 메시지</legend>
              <div class="form-group">
                <label>인용구 (선택)</label>
                <input type="text" name="quote" value="${this.invitation.quote || ''}" placeholder="예: 평생 같이 있고 싶은 사람을 만났어요">
              </div>
              <div class="form-group">
                <textarea name="message" rows="4">${this.invitation.message}</textarea>
              </div>
            </fieldset>

            <!-- 사진 갤러리 -->
            <fieldset>
              <legend>사진 갤러리 (최대 10개)</legend>
              
              <div class="form-group">
                <label>사진 추가</label>
                <div class="image-upload-area">
                  <input type="file" id="image-input" multiple accept="image/*" style="display: none;">
                  <p style="margin: 0 0 0.75rem; font-size: 1.3rem;">📸</p>
                  <button type="button" id="btn-upload" class="btn btn-secondary">+ 사진 추가</button>
                  <p style="margin: 0.5rem 0 0; color: #999; font-size: 0.85rem;">또는 사진을 여기에 드래그하세요</p>
                  <p class="upload-hint">${this.invitation.images.length}/10개 업로드됨</p>
                </div>
              </div>

              ${this.invitation.images.length > 0 ? `
                <div class="uploaded-images">
                  <div class="images-grid">
                    ${this.invitation.images.map((img, idx) => `
                      <div class="image-item" ${this.invitation.mainImage === img ? 'data-main-image="true"' : ''}>
                        <img src="${img}" alt="업로드된 사진">
                        <div class="image-buttons">
                          <button type="button" class="btn-set-main-image" data-index="${idx}" title="대표사진으로 설정">⭐</button>
                          <button type="button" class="btn-delete-image" data-index="${idx}" title="삭제">×</button>
                        </div>
                        ${this.invitation.mainImage === img ? '<span class="mainimage-badge">대표</span>' : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </fieldset>

            <!-- 템플릿 & 색상 -->
            <fieldset>
              <legend>디자인</legend>
              
              <div class="form-group">
                <label>템플릿</label>
                <select name="template">
                  <option value="classic" ${this.invitation.template === 'classic' ? 'selected' : ''}>클래식</option>
                  <option value="modern" ${this.invitation.template === 'modern' ? 'selected' : ''}>모던</option>
                  <option value="romantic" ${this.invitation.template === 'romantic' ? 'selected' : ''}>로맨틱</option>
                  <option value="minimalist" ${this.invitation.template === 'minimalist' ? 'selected' : ''}>미니멀</option>
                  <option value="garden" ${this.invitation.template === 'garden' ? 'selected' : ''}>가든</option>
                  <option value="sunset" ${this.invitation.template === 'sunset' ? 'selected' : ''}>선셋</option>
                  <option value="elegant" ${this.invitation.template === 'elegant' ? 'selected' : ''}>엘레강스</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>주 색상</label>
                  <input type="color" name="primaryColor" value="${this.invitation.primaryColor}">
                </div>
                <div class="form-group">
                  <label>보조 색상</label>
                  <input type="color" name="secondaryColor" value="${this.invitation.secondaryColor}">
                </div>
              </div>
            </fieldset>

            <div class="form-actions">
              <button type="button" id="btn-preview" class="btn btn-secondary">미리보기</button>
              <button type="button" id="btn-cancel" class="btn btn-secondary">취소</button>
              <button type="submit" class="btn btn-primary">저장</button>
            </div>
          </form>
        </div>
      </div>
    `

        // 이벤트 바인딩
        const form = container.querySelector('#invitation-form') as HTMLFormElement
        const imageInput = container.querySelector('#image-input') as HTMLInputElement
        const uploadBtn = container.querySelector('#btn-upload') as HTMLButtonElement
        const uploadArea = container.querySelector('.image-upload-area') as HTMLElement

        container.querySelector('#btn-back')?.addEventListener('click', () => {
            this.options.onCancel()
        })

        container.querySelector('#btn-cancel')?.addEventListener('click', () => {
            this.options.onCancel()
        })

        uploadBtn?.addEventListener('click', () => {
            imageInput?.click()
        })

        // 드래그 앤 드롭 이벤트
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault()
                e.stopPropagation()
                uploadArea.classList.add('drag-over')
            })

            uploadArea.addEventListener('dragenter', (e) => {
                e.preventDefault()
                e.stopPropagation()
                uploadArea.classList.add('drag-over')
            })

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault()
                e.stopPropagation()
                uploadArea.classList.remove('drag-over')
            })

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault()
                e.stopPropagation()
                uploadArea.classList.remove('drag-over')

                const files = e.dataTransfer?.files
                if (files) {
                    this.handleFiles(files, container)
                }
            })
        }

        imageInput?.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files) {
                this.handleFiles(files, container)
            }
        })

        container.querySelectorAll('.btn-delete-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault()
                const index = parseInt((e.target as HTMLElement).getAttribute('data-index') || '0')
                this.invitation.images.splice(index, 1)
                this.render(container)
            })
        })

        container.querySelectorAll('.btn-set-main-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault()
                const index = parseInt((e.target as HTMLElement).getAttribute('data-index') || '0')
                this.invitation.mainImage = this.invitation.images[index]
                this.render(container)
            })
        })

        container.querySelector('#btn-preview')?.addEventListener('click', () => {
            this.updateInvitation(form)
            this.options.onPreview(this.invitation)
        })

        form.addEventListener('submit', (e) => {
            e.preventDefault()
            this.updateInvitation(form)
            this.options.onSave(this.invitation)
        })
    }

    private handleFiles(files: FileList, container: HTMLElement): void {
        Array.from(files).forEach(file => {
            // 이미지 파일만 처리
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드할 수 있습니다')
                return
            }

            // 최대 10개 제한
            if (this.invitation.images.length >= 10) {
                alert('최대 10개까지만 업로드할 수 있습니다')
                return
            }

            const reader = new FileReader()
            reader.onload = (event) => {
                const result = event.target?.result as string
                // 이미지 압축
                this.compressImage(result, (compressedImage) => {
                    this.invitation.images.push(compressedImage)
                    this.render(container)
                })
            }
            reader.readAsDataURL(file)
        })
    }

    private compressImage(dataUrl: string, callback: (compressed: string) => void): void {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height

            // 최대 1200px로 리사이즈
            const maxSize = 1200
            if (width > height) {
                if (width > maxSize) {
                    height = Math.round((height * maxSize) / width)
                    width = maxSize
                }
            } else {
                if (height > maxSize) {
                    width = Math.round((width * maxSize) / height)
                    height = maxSize
                }
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, width, height)
            
            // 품질 0.7로 압축
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7)
            callback(compressedDataUrl)
        }
        img.src = dataUrl
    }

    private updateInvitation(form: HTMLFormElement): void {
        const formData = new FormData(form)
        const data = Object.fromEntries(formData)

        this.invitation = {
            ...this.invitation,
            title: data.title as string,
            groomName: data.groomName as string,
            brideName: data.brideName as string,
            date: data.date as string,
            time: data.time as string,
            location: data.location as string,
            address: data.address as string,
            phone: data.phone as string,
            message: data.message as string,
            quote: (data.quote as string) || undefined,
            template: data.template as 'classic' | 'modern' | 'romantic' | 'minimalist' | 'garden' | 'sunset' | 'elegant',
            primaryColor: data.primaryColor as string,
            secondaryColor: data.secondaryColor as string
        }
    }
}
