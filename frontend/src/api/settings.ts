import { api } from './axios'

export type AppLanguageSetting = 'en' | 'fa'
export type AppCalendarSetting = 'gregorian' | 'jalali'

export interface AppSettings {
  language: AppLanguageSetting
  calendar: AppCalendarSetting
}

export const settingsService = {
  // Unauthenticated on purpose: the login screen and the public guarantee
  // pages need the language before anyone signs in.
  async get(): Promise<AppSettings> {
    const response = await api.get<{ data: AppSettings }>('/settings')
    return response.data.data
  },

  // Admin-only server side; the UI only ever shows the controls to admins.
  async update(data: Partial<AppSettings>): Promise<AppSettings> {
    const response = await api.put<{ data: AppSettings }>('/settings', data)
    return response.data.data
  },
}
