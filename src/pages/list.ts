import { StorageManager } from '../storage'

interface ListPageOptions {
  onNew: () => void
  onEdit: (id: string) => void
  onPreview: (id: string) => void
  onDelete: (id: string) => void
  onTemplateGallery: () => void
}

export class ListPage {
  private options: ListPageOptions

  constructor(options: ListPageOptions) {
    this.options = options
  }

  render(container: HTMLElement): void {
    const invitations = StorageManager.getAll()
    
    container.innerHTML = `
      <div class="page list-page">
        <header class="app-header">
          <h1>모바일 청첩장</h1>
          <div class="header-buttons">
            <button class="btn-templates" id="btn-templates">🎨 템플릿</button>
            <button class="btn-new" id="btn-new">+ 새로 만들기</button>
          </div>
        </header>
        
        <div class="list-container">
          ${invitations.length === 0 
            ? '<div class="empty-state"><p>청첩장이 없습니다</p></div>'
            : `<div class="invitation-list">
                ${invitations.map(inv => `
                  <div class="invitation-card" data-id="${inv.id}">
                    <div class="card-header">
                      <h3>${inv.title}</h3>
                      <span class="date">${inv.date}</span>
                    </div>
                    <div class="card-body">
                      <p><strong>${inv.groomName}</strong> & <strong>${inv.brideName}</strong></p>
                      <p class="location">${inv.location}</p>
                    </div>
                    <div class="card-actions">
                      <button class="btn-edit" data-id="${inv.id}">편집</button>
                      <button class="btn-preview" data-id="${inv.id}">미리보기</button>
                      <button class="btn-delete" data-id="${inv.id}">삭제</button>
                    </div>
                  </div>
                `).join('')}
              </div>`
          }
        </div>
      </div>
    `

    // 이벤트 바인딩
    container.querySelector('#btn-new')?.addEventListener('click', () => {
      this.options.onNew()
    })

    container.querySelector('#btn-templates')?.addEventListener('click', () => {
      this.options.onTemplateGallery()
    })

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).getAttribute('data-id')
        if (id) this.options.onEdit(id)
      })
    })

    container.querySelectorAll('.btn-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).getAttribute('data-id')
        if (id) this.options.onPreview(id)
      })
    })

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).getAttribute('data-id')
        if (id && confirm('정말 삭제하시겠습니까?')) {
          this.options.onDelete(id)
        }
      })
    })
  }
}
