import { StorageManager } from './storage'
import type { Invitation } from './types'
import { EditorPage } from './pages/editor'
import { ListPage } from './pages/list'
import { PreviewPage } from './pages/preview'
import { TemplateGallery } from './pages/templates'

export class App {
  private appElement: HTMLElement

  constructor() {
    this.appElement = document.querySelector('#app')!
  }

  init(): void {
    this.showListPage()
  }

  private showListPage(): void {
    const listPage = new ListPage({
      onNew: () => this.showEditorPage(StorageManager.createNew()),
      onEdit: (id) => {
        const invitation = StorageManager.get(id)
        if (invitation) this.showEditorPage(invitation)
      },
      onPreview: (id) => {
        const invitation = StorageManager.get(id)
        if (invitation) this.showPreviewPage(invitation)
      },
      onDelete: (id) => {
        StorageManager.delete(id)
        this.showListPage()
      },
      onTemplateGallery: () => this.showTemplateGallery()
    })
    listPage.render(this.appElement)
  }

  private showEditorPage(invitation: Invitation): void {
    const editorPage = new EditorPage({
      invitation,
      onSave: (updated) => {
        StorageManager.save(updated)
        this.showListPage()
      },
      onCancel: () => this.showListPage(),
      onPreview: (updatedInvitation) => this.showPreviewPage(updatedInvitation)
    })
    editorPage.render(this.appElement)
  }

  private showPreviewPage(invitation: Invitation): void {
    const previewPage = new PreviewPage({
      invitation,
      onBack: () => this.showListPage()
    })
    previewPage.render(this.appElement)
  }

  private showTemplateGallery(): void {
    const gallery = new TemplateGallery()
    gallery.render(this.appElement, (templateId) => {
      const newInvitation = StorageManager.createNew()
      newInvitation.template = templateId as any
      this.showEditorPage(newInvitation)
    }, () => this.showListPage())
  }
}
