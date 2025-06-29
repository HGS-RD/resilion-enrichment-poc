"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Button
} from "@workspace/ui"
import { 
  Search, 
  Download
} from "lucide-react"

export default function FactsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Extracted Facts</h1>
          <p className="text-gray-600 mt-1">
            Review and validate AI-extracted company information
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Facts
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fact Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search facts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <div className="text-center py-8">
            <p className="text-gray-500">Facts page is working! Full implementation coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
