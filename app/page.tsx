import Header from "./components/Header"
import TradingView from "./components/TradingView"
import OrderForm from "./components/OrderForm"
import Positions from "./components/Positions"
import MarketInfo from "./components/MarketInfo"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TradingView />
          </div>
          <div>
            <OrderForm />
          </div>
          <div className="lg:col-span-2">
            <Positions />
          </div>
          <div>
            <MarketInfo />
          </div>
        </div>
      </main>
    </div>
  )
}

