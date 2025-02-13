import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Menu } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { PhantomWalletConnect } from "@/components/PhantomWalletConnect"

export default function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">-/+</h1>
          <nav className="hidden lg:flex space-x-4">
            <Button variant="ghost">Trade</Button>
            <Button variant="ghost">Markets</Button>
            <Button variant="ghost">Learn</Button>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden lg:block">
            <Input placeholder="Search markets" className="w-64" />
          </div>
          <Select>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="DOGE/USD" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="doge">DOGE/USD</SelectItem>
              <SelectItem value="shib">SHIB/USD</SelectItem>
              <SelectItem value="pepe">PEPE/USD</SelectItem>
            </SelectContent>
          </Select>
          <ThemeToggle />
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <PhantomWalletConnect />
        </div>
      </div>
    </header>
  )
}

