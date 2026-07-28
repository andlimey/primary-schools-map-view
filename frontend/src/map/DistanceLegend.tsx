import { Card, CardContent } from '@/components/ui/card'

export function DistanceLegend() {
  return (
    <div className="absolute bottom-2.5 left-2.5 z-[1000] w-[260px] font-sans">
      <Card size="sm" className="shadow-md">
        <CardContent className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#059669]" />
            Within 1km
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#b45309]" />
            Within 1km&ndash;2km
          </div>
          <p className="text-muted-foreground">
            Straight-line distance estimate — may not match MOE's calculation. Verify on{' '}
            <a
              href="https://www.moe.gov.sg/schoolfinder/primary%20school"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              SchoolFinder
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
