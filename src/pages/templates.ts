export class TemplateGallery {
  private templates = [
    {
      id: 'classic',
      name: '클래식',
      description: '전통적이고 우아한 디자인',
      primaryColor: '#d4a574',
      secondaryColor: '#f5f5f5'
    },
    {
      id: 'modern',
      name: '모던',
      description: '세련되고 깔끔한 디자인',
      primaryColor: '#2c3e50',
      secondaryColor: '#ecf0f1'
    },
    {
      id: 'romantic',
      name: '로맨틱',
      description: '따뜻하고 감성적인 디자인',
      primaryColor: '#ff69b4',
      secondaryColor: '#fff0f5'
    },
    {
      id: 'minimalist',
      name: '미니멀',
      description: '간결하고 세련된 디자인',
      primaryColor: '#000000',
      secondaryColor: '#ffffff'
    },
    {
      id: 'garden',
      name: '가든',
      description: '자연스럽고 신선한 디자인',
      primaryColor: '#27ae60',
      secondaryColor: '#f0fdf4'
    },
    {
      id: 'sunset',
      name: '선셋',
      description: '따뜻한 노을 감성',
      primaryColor: '#e74c3c',
      secondaryColor: '#fff5e6'
    },
    {
      id: 'elegant',
      name: '엘레강스',
      description: '고급스럽고 세련된 디자인',
      primaryColor: '#1a1a1a',
      secondaryColor: '#fafaf8'
    }
  ]

  render(container: HTMLElement, onSelect: (templateId: string) => void, onBack: () => void): void {
    container.innerHTML = `
      <div class="page template-gallery-page">
        <header class="app-header">
          <button id="btn-back" class="btn-back">← 뒤로</button>
          <h2>템플릿 갤러리</h2>
          <div style="width: 50px;"></div>
        </header>

        <div class="gallery-container">
          <div class="templates-grid">
            ${this.templates.map(template => `
              <div class="template-card" data-template-id="${template.id}">
                <div class="template-preview">
                  <div class="template-header" style="background: linear-gradient(135deg, ${template.primaryColor}, ${template.secondaryColor})">
                    <p style="color: white; font-size: 12px; margin: 0;">샘플</p>
                  </div>
                  <div class="template-content">
                    <p style="margin: 0; font-size: 11px;">신랑 & 신부</p>
                  </div>
                </div>
                <h3>${template.name}</h3>
                <p class="template-description">${template.description}</p>
                <button class="btn btn-primary select-template" data-template-id="${template.id}">선택</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `

    container.querySelector('#btn-back')?.addEventListener('click', onBack)

    container.querySelectorAll('.select-template').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateId = (e.target as HTMLElement).getAttribute('data-template-id')
        if (templateId) onSelect(templateId)
      })
    })
  }
}
