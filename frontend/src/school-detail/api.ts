import type { AdmissionsHistoryResponse, SchoolDetail, SchoolListEntry } from './types'

export const schoolsListQueryKey = ['schools'] as const
export const schoolDetailQueryKey = (schoolId: number) => ['school-detail', schoolId] as const
export const admissionsHistoryQueryKey = (schoolId: number) => ['admissions-history', schoolId] as const

// Admission/balloting data only changes via periodic scraper runs, not during a browsing
// session, so a completed pin-click prefetch should satisfy the detail page outright rather
// than being treated as stale and refetched the moment "More Details" is clicked.
export const SCHOOL_DETAIL_STALE_TIME_MS = 5 * 60_000

export function fetchSchoolsList(): Promise<SchoolListEntry[]> {
  return fetch('/api/schools').then((res) => {
    if (!res.ok) throw new Error(`Schools request failed: ${res.status}`)
    return res.json() as Promise<SchoolListEntry[]>
  })
}

export function fetchSchoolDetail(schoolId: number): Promise<SchoolDetail> {
  return fetch(`/api/schools/${schoolId}`).then((res) => {
    if (!res.ok) throw new Error(`School detail request failed: ${res.status}`)
    return res.json() as Promise<SchoolDetail>
  })
}

export function fetchAdmissionsHistory(schoolId: number): Promise<AdmissionsHistoryResponse> {
  return fetch(`/api/schools/${schoolId}/admissions/history`).then((res) => {
    if (!res.ok) throw new Error(`Admissions history request failed: ${res.status}`)
    return res.json() as Promise<AdmissionsHistoryResponse>
  })
}
