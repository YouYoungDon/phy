// 청첩장 데이터 타입
export interface Invitation {
  id: string
  title: string
  groomName: string
  brideName: string
  date: string
  time: string
  location: string
  address: string
  phone: string
  accountInfo: BankAccount[]
  images: string[]
  mainImage?: string
  template: 'classic' | 'modern' | 'romantic' | 'minimalist' | 'garden' | 'sunset' | 'elegant'
  primaryColor: string
  secondaryColor: string
  message: string
  quote?: string
}

export interface BankAccount {
  name: string
  bank: string
  account: string
  relation: string
}

export interface InvitationStore {
  current: Invitation | null
  list: Invitation[]
}
