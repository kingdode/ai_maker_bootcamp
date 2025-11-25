import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Fast & Simple",
    description:
      "Capture your thoughts instantly with a clean, distraction-free interface designed for speed.",
    icon: "⚡",
  },
  {
    title: "Organize Effortlessly",
    description:
      "Use tags, folders, and search to find exactly what you need, when you need it.",
    icon: "📁",
  },
  {
    title: "Sync Everywhere",
    description:
      "Access your notes on any device. Your thoughts are always with you, everywhere you go.",
    icon: "☁️",
  },
  {
    title: "Rich Formatting",
    description:
      "Format your notes with markdown, add images, links, and more to make them truly yours.",
    icon: "✍️",
  },
  {
    title: "Secure & Private",
    description:
      "Your notes are encrypted and private. We never read your content—your thoughts belong to you.",
    icon: "🔒",
  },
  {
    title: "Collaborate",
    description:
      "Share notes with teammates, friends, or family. Work together in real-time.",
    icon: "👥",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Everything you need to stay organized
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Powerful features that make note-taking effortless and enjoyable.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 text-4xl">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

