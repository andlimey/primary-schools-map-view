import type { AdmissionPhase } from '../shared/types'

export interface School {
  id: number
  slug: string | null
  name: string
  address: string
  postal_code: string | null
  latitude: number
  longitude: number
}

export interface GeocodeCandidate {
  label: string
  latitude: number
  longitude: number
}

export interface SchoolAdmissions {
  school_id: number
  phases: AdmissionPhase[]
}

export interface AdmissionsResponse {
  year: number | null
  schools: SchoolAdmissions[]
}
