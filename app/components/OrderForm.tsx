"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export default function OrderForm() {
  const [orderType, setOrderType] = useState("market");
  const [leverage, setLeverage] = useState(10);

  return (
    <Card className="h-full flex flex-col flex-end">
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <form className="grow flex flex-col">
        <CardContent className="grow">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Side</Label>
              <RadioGroup defaultValue="long" className="flex">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="long" />
                  <Label htmlFor="long">Long</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="short" />
                  <Label htmlFor="short">Short</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Amount (DOGE)</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            {orderType === "limit" && (
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input type="number" placeholder="0.00" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Leverage: {leverage}x</Label>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[leverage]}
                onValueChange={(value) => setLeverage(value[0])}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button size="lg" className="w-full">
            Place Order
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
