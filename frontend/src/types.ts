export interface School {
  id: number
  slug: string | null
  name: string
  address: string
  latitude: number
  longitude: number
}

export interface GeocodeCandidate {
  label: string
  latitude: number
  longitude: number
}

export interface BallotingDetail {
  category_code: string
  category_label: string | null
  applicants: number | null
  vacancies: number | null
}

export interface AdmissionPhase {
  phase_label: string
  phase_code: string
  vacancy: number | null
  applied: number | null
  taken: number | null
  balloting: BallotingDetail | null
}

export interface SchoolAdmissions {
  school_id: number
  phases: AdmissionPhase[]
}

export interface AdmissionsResponse {
  year: number | null
  schools: SchoolAdmissions[]
}
