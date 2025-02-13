import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MarketInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Index Price</span>
            <span>$0.0805</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mark Price</span>
            <span>$0.0807</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Funding Rate</span>
            <span>0.01%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">24h Volume</span>
            <span>$1,234,567</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Open Interest</span>
            <span>$9,876,543</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

