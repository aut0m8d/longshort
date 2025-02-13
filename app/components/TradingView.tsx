"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

declare global {
  interface Window {
    TradingView: any; // eslint-disable-line
  }
}

export default function TradingView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (containerRef.current && window.TradingView) {
      new window.TradingView.widget({
        autosize: true,
        symbol: "BINANCE:DOGEUSDT",
        interval: "D",
        timezone: "Etc/UTC",
        theme: theme === "dark" ? "dark" : "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingview_chart",
      });
    }
  }, [theme]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>DOGE/USD Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} id="tradingview_chart" className="h-[400px]" />
      </CardContent>
    </Card>
  );
}
