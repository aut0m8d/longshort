"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    TradingView: any; // eslint-disable-line
  }
}

interface TradingViewProps {
  tokenMetadata?: {
    name: string;
    symbol: string;
    uri: string;
  } | null;
}

export default function TradingView({ tokenMetadata }: TradingViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (containerRef.current && window.TradingView && tokenMetadata) {
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
  }, [theme, tokenMetadata]);

  if (!tokenMetadata) {
    return (
      <Card>
        <CardContent className="h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tokenMetadata.symbol}/SOL Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} id="tradingview_chart" className="h-[400px]" />
      </CardContent>
    </Card>
  );
}
