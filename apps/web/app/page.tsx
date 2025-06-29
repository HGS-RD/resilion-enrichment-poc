export default function Home() {
  return (
    <main className="container mx-auto py-8">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Resilion Enrichment POC
          </h1>
          <p className="text-xl text-muted-foreground mt-2">
            Automated enrichment service for manufacturing site data
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-4">Job Trigger</h2>
            <p className="text-muted-foreground">
              Start a new enrichment job by providing a domain to analyze.
            </p>
          </div>
          
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-4">Workflow Status</h2>
            <p className="text-muted-foreground">
              Monitor the progress of enrichment jobs in real-time.
            </p>
          </div>
          
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-4">Extracted Facts</h2>
            <p className="text-muted-foreground">
              Review and analyze the extracted manufacturing data.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
