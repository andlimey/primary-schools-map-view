import type { AdmissionPhase } from '../shared/types'

export interface SchoolDetail {
  id: number
  slug: string | null
  name: string
  address: string
  url_address: string | null
  zone_code: string | null
  nature_code: string | null
  mainlevel_code: string
}

export type AdmissionPhaseHistoryEntry = AdmissionPhase & { year: number }

export interface AdmissionsHistoryResponse {
  school_id: number
  phases: AdmissionPhaseHistoryEntry[]
}

export interface SchoolListEntry {
  id: number
  slug: string | null
  name: string
}
