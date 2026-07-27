import { useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import type { School, SchoolAdmissions } from '../types'
import { AdmissionsTable } from './AdmissionsTable'

interface SchoolMarkerProps {
  school: School
  admissionsById: Map<number, SchoolAdmissions>
  admissionsYear: number | null
  admissionsLoading: boolean
}

export function SchoolMarker({ school, admissionsById, admissionsYear, admissionsLoading }: SchoolMarkerProps) {
  const [expanded, setExpanded] = useState(false)
  const admissions = admissionsById.get(school.id)

  return (
    <Marker position={[school.latitude, school.longitude]}>
      <Popup>
        <strong>{school.name}</strong>
        <br />
        {school.address}
        <div className="admissions-toggle">
          <button type="button" onClick={() => setExpanded((e) => !e)}>
            {expanded ? '▾ Hide admissions' : '▸ Show admissions'}
          </button>
        </div>
        {expanded && (
          <div className="admissions-section">
            {admissionsLoading ? (
              <div className="admissions-message">Loading admissions data…</div>
            ) : admissions ? (
              <>
                {admissionsYear !== null && <div className="admissions-year">{admissionsYear} admissions</div>}
                <AdmissionsTable admissions={admissions} />
              </>
            ) : (
              <div className="admissions-message">
                No admission data{admissionsYear !== null ? ` for ${admissionsYear}` : ''}
              </div>
            )}
          </div>
        )}
      </Popup>
    </Marker>
  )
}
