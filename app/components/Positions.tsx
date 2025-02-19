import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const positions = [
  {
    id: 1,
    symbol: "PLACEHOLDER/USD",
    side: "Long",
    size: "0",
    entry: "0.00",
    liq: "0.00",
    pnl: "0.00%",
  },
  {
    id: 2,
    symbol: "PLACEHOLDER/USD",
    side: "Short",
    size: "0",
    entry: "0.00",
    liq: "0.00",
    pnl: "0.00%",
  },
];

export default function Positions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Liq. Price</TableHead>
              <TableHead>PNL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.id}>
                <TableCell>{position.symbol}</TableCell>
                <TableCell>{position.side}</TableCell>
                <TableCell>{position.size}</TableCell>
                <TableCell>{position.entry}</TableCell>
                <TableCell>{position.liq}</TableCell>
                <TableCell>{position.pnl}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
