import type { Invitation } from './types'

const STORAGE_KEY = 'invitations_store'

export class StorageManager {
  static getAll(): Invitation[] {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored).list : []
  }

  static get(id: string): Invitation | null {
    const all = this.getAll()
    return all.find(inv => inv.id === id) || null
  }

  static save(invitation: Invitation): void {
    const all = this.getAll()
    const index = all.findIndex(inv => inv.id === invitation.id)
    
    if (index >= 0) {
      all[index] = invitation
    } else {
      all.push(invitation)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ list: all }))
  }

  static delete(id: string): void {
    const all = this.getAll()
    const filtered = all.filter(inv => inv.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ list: filtered }))
  }

  static createNew(): Invitation {
    return {
      id: Date.now().toString(),
      title: '청첩장',
      groomName: '신랑 이름',
      brideName: '신부 이름',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      location: '홀 이름',
      address: '주소',
      phone: '010-0000-0000',
      accountInfo: [],
      images: [],
      template: 'classic',
      primaryColor: '#d4a574',
      secondaryColor: '#f5f5f5',
      message: '저희 결혼식에 초대합니다'
    }
  }
}
