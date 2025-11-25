import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const exampleNotes = [
  {
    title: "Weekly Grocery List",
    content: "• Milk\n• Eggs\n• Bread\n• Chicken breast\n• Spinach\n• Tomatoes\n• Bananas\n• Greek yogurt",
  },
  {
    title: "Workout Tracking - Week 1",
    content: "Monday: Upper body (3x10 bench press, 3x10 rows)\nWednesday: Lower body (squats, deadlifts)\nFriday: Cardio (30min run)\nGoal: Build consistency!",
  },
  {
    title: "Meeting Notes - Q4 Planning",
    content: "Key points:\n- Launch new feature by Dec 15\n- Team needs 2 more developers\n- Budget approved for marketing campaign\n- Follow up: Schedule design review",
  },
  {
    title: "Recipe Ideas",
    content: "• Homemade pasta carbonara\n• Thai green curry\n• Mediterranean quinoa bowl\n• Chocolate chip cookies (grandma's recipe)\n• Try air fryer recipes this week!",
  },
  {
    title: "Book Recommendations",
    content: "To read:\n1. 'Atomic Habits' by James Clear\n2. 'The Seven Husbands of Evelyn Hugo'\n3. 'Project Hail Mary' - sci-fi thriller\n4. 'Educated' - memoir",
  },
  {
    title: "Weekend Trip Ideas",
    content: "Options:\n• Mountain hiking trail (2hr drive)\n• Beach day trip\n• Visit local winery\n• City museum + dinner\nBudget: $200 max",
  },
];

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-4 pt-16 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl text-center">
        <div className="mb-8 inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm">
          <span className="mr-2">✨</span>
          <span>New: AI-powered note organization</span>
        </div>
        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Your thoughts,
          <br />
          <span className="text-foreground/80">organized beautifully</span>
        </h1>
        <p className="mb-10 text-lg text-muted-foreground sm:text-xl md:text-2xl">
          Capture ideas, organize thoughts, and stay productive. The simplest
          note-taking app that works the way you think.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-16">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/sign-up">Start Taking Notes</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <Link href="#features">Learn More</Link>
          </Button>
        </div>
        
        {/* Example Notes Preview */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold mb-6 text-foreground/90">
            See it in action
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {exampleNotes.map((note, index) => (
              <Card 
                key={index} 
                className="hover:shadow-md transition-shadow text-left h-full"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold line-clamp-1">
                    {note.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-6">
                    {note.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

