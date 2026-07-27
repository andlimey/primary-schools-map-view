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
