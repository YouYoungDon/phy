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
              
              <!-- 대표 사진 추가 -->
              <div class="form-group">
                <label>대표 사진 선택</label>
                <div class="image-upload-area main-image-upload">
                  <input type="file" id="main-image-input" accept="image/*" style="display: none;">
                  <p style="margin: 0 0 0.75rem; font-size: 1.3rem;">⭐</p>
                  <button type="button" id="btn-upload-main" class="btn btn-secondary">대표 사진 선택</button>
                  <p style="margin: 0.5rem 0 0; color: #999; font-size: 0.85rem;">또는 사진을 여기에 드래그하세요</p>
                </div>
              </div>

              ${this.invitation.mainImage ? `
                <div class="main-image-section">
                  <h4>설정된 대표 사진</h4>
                  <div class="main-image-preview">
                    <img src="${this.invitation.mainImage}" alt="대표 사진">
                    <div class="main-image-actions">
                      <button type="button" class="btn-unset-main-image" title="대표사진 해제">⭐ 해제</button>
                      <button type="button" class="btn-delete-main-image" title="삭제">× 삭제</button>
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- 일반 사진 추가 -->
              <div class="form-group">
                <label>일반 사진 추가</label>
                <div class="image-upload-area normal-image-upload">
                  <input type="file" id="image-input" multiple accept="image/*" style="display: none;">
                  <p style="margin: 0 0 0.75rem; font-size: 1.3rem;">📸</p>
                  <button type="button" id="btn-upload" class="btn btn-secondary">+ 일반 사진 추가</button>
                  <p style="margin: 0.5rem 0 0; color: #999; font-size: 0.85rem;">또는 사진을 여기에 드래그하세요</p>
                  <p class="upload-hint">${this.invitation.images.filter(img => img !== this.invitation.mainImage).length}/10개 업로드됨</p>
                </div>
              </div>

              ${this.invitation.images.length > 0 ? `
                <div class="uploaded-images">
                  <h4>업로드된 일반 사진 (${this.invitation.images.filter(img => img !== this.invitation.mainImage).length}개)</h4>
                  <div class="images-grid">
                    ${this.invitation.images
                      .filter(img => img !== this.invitation.mainImage)
                      .map((img) => {
                        const originalIdx = this.invitation.images.indexOf(img)
                        return `
                          <div class="image-item">
                            <img src="${img}" alt="업로드된 사진">
                            <div class="image-buttons">
                              <button type="button" class="btn-set-main-image" data-index="${originalIdx}" title="대표사진으로 설정">⭐</button>
                              <button type="button" class="btn-delete-image" data-index="${originalIdx}" title="삭제">×</button>
                            </div>
                          </div>
                        `
                      }).join('')}
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
        const mainImageInput = container.querySelector('#main-image-input') as HTMLInputElement
        const uploadBtn = container.querySelector('#btn-upload') as HTMLButtonElement
        const uploadMainBtn = container.querySelector('#btn-upload-main') as HTMLButtonElement
        const normalImageUploadArea = container.querySelector('.normal-image-upload') as HTMLElement
        const mainImageUploadArea = container.querySelector('.main-image-upload') as HTMLElement

        container.querySelector('#btn-back')?.addEventListener('click', () => {
            this.options.onCancel()
        })

        container.querySelector('#btn-cancel')?.addEventListener('click', () => {
            this.options.onCancel()
        })

        // 일반 사진 업로드
        uploadBtn?.addEventListener('click', () => {
            imageInput?.click()
        })

        // 대표 사진 업로드
        uploadMainBtn?.addEventListener('click', () => {
            mainImageInput?.click()
        })

        // 드래그 앤 드롭 이벤트 - 일반 사진
        if (normalImageUploadArea) {
            normalImageUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault()
                e.stopPropagation()
                normalImageUploadArea.classList.add('drag-over')
            })

            normalImageUploadArea.addEventListener('dragenter', (e) => {
                e.preventDefault()
                e.stopPropagation()
                normalImageUploadArea.classList.add('drag-over')
            })

            normalImageUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault()
                e.stopPropagation()
                normalImageUploadArea.classList.remove('drag-over')
            })

            normalImageUploadArea.addEventListener('drop', (e) => {
                e.preventDefault()
                e.stopPropagation()
                normalImageUploadArea.classList.remove('drag-over')

                const files = e.dataTransfer?.files
                if (files) {
                    this.handleFiles(files, container, false)
                }
            })
        }

        // 드래그 앤 드롭 이벤트 - 대표 사진
        if (mainImageUploadArea) {
            mainImageUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault()
                e.stopPropagation()
                mainImageUploadArea.classList.add('drag-over')
            })

            mainImageUploadArea.addEventListener('dragenter', (e) => {
                e.preventDefault()
                e.stopPropagation()
                mainImageUploadArea.classList.add('drag-over')
            })

            mainImageUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault()
                e.stopPropagation()
                mainImageUploadArea.classList.remove('drag-over')
            })

            mainImageUploadArea.addEventListener('drop', (e) => {
                e.preventDefault()
                e.stopPropagation()
                mainImageUploadArea.classList.remove('drag-over')

                const files = e.dataTransfer?.files
                if (files) {
                    this.handleFiles(files, container, true)
                }
            })
        }

        imageInput?.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files) {
                this.handleFiles(files, container, false)
            }
        })

        mainImageInput?.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files) {
                this.handleFiles(files, container, true)
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

        container.querySelector('.btn-unset-main-image')?.addEventListener('click', (e) => {
            e.preventDefault()
            this.invitation.mainImage = undefined
            this.render(container)
        })

        container.querySelector('.btn-delete-main-image')?.addEventListener('click', (e) => {
            e.preventDefault()
            if (this.invitation.mainImage) {
                const index = this.invitation.images.indexOf(this.invitation.mainImage)
                if (index > -1) {
                    this.invitation.images.splice(index, 1)
                    this.invitation.mainImage = undefined
                }
            }
            this.render(container)
        })

        container.querySelector('#btn-preview')?.addEventListener('click', () => {
            this.updateInvitation(form)
            this.options.onPreview(this.invitation)
        })

        form.addEventListener('submit', (e) => {
            e.preventDefault()
            
            // 입력 검증
            const formData = new FormData(form)
            const data = Object.fromEntries(formData)
            
            // 필수 필드 검증
            if (!data.title || !data.groomName || !data.brideName || !data.date || !data.time) {
                alert('필수 항목을 모두 입력해주세요.')
                return
            }
            
            // 이름 길이 검증
            if ((data.groomName as string).length > 20 || (data.brideName as string).length > 20) {
                alert('이름은 20자 이하로 입력해주세요.')
                return
            }
            
            // 제목 길이 검증
            if ((data.title as string).length > 50) {
                alert('제목은 50자 이하로 입력해주세요.')
                return
            }
            
            // 메시지 길이 검증
            if ((data.message as string).length > 1000) {
                alert('초대 메시지는 1000자 이하로 입력해주세요.')
                return
            }
            
            // 인용구 길이 검증
            if (data.quote && (data.quote as string).length > 100) {
                alert('인용구는 100자 이하로 입력해주세요.')
                return
            }
            
            // 전화번호 형식 검증 (선택)
            if (data.phone && !(data.phone as string).match(/^[\d\-\+\(\)\s]+$/)) {
                alert('올바른 전화번호 형식을 입력해주세요.')
                return
            }
            
            this.updateInvitation(form)
            this.options.onSave(this.invitation)
        })
    }

    private handleFiles(files: FileList, container: HTMLElement, isMainImage: boolean = false): void {
        Array.from(files).forEach(file => {
            // 이미지 파일만 처리
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드할 수 있습니다')
                return
            }

            // 최대 10개 제한 (대표사진 포함)
            if (this.invitation.images.length >= 10) {
                alert('최대 10개까지만 업로드할 수 있습니다')
                return
            }

            // 대표사진은 1개만, 일반사진은 여러 개
            if (isMainImage && this.invitation.mainImage) {
                alert('대표 사진은 1개만 설정할 수 있습니다')
                return
            }

            const reader = new FileReader()
            reader.onload = (event) => {
                const result = event.target?.result as string
                // 이미지 압축
                this.compressImage(result, (compressedImage) => {
                    this.invitation.images.push(compressedImage)
                    if (isMainImage) {
                        // 대표사진으로 설정
                        this.invitation.mainImage = compressedImage
                    }
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
