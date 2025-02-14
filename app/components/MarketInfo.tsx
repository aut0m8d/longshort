import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface Props {
  price: number;
  priceChange24h: number;
  liquidity: number;
  volume24h: number;
  apr24h: number;
  fee24h: number;
}

export default function MarketInfo({ price, priceChange24h }: Props) {
  const isPositive = priceChange24h >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">SOL Price</span>
            <span>${price.toFixed(9)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">24h Change</span>
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
              {isPositive ? "+" : ""}
              {priceChange24h.toFixed(2)}%
            </span>
          </div>
          {/* <div className="flex justify-between">
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
          </div> */}
        </div>
      </CardContent>
    </Card>
  );
}
