"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is NotesApp free to use?",
    answer:
      "Yes! NotesApp offers a free tier with all the essential features you need to get started. You can create unlimited notes, organize them with tags and folders, and sync across all your devices.",
  },
  {
    question: "Can I access my notes offline?",
    answer:
      "Absolutely! NotesApp works offline. All your notes are stored locally on your device and automatically sync when you're back online. Never lose access to your thoughts.",
  },
  {
    question: "How secure is my data?",
    answer:
      "Security is our top priority. All your notes are encrypted both in transit and at rest. We use industry-standard encryption protocols to ensure your data is safe and private. We never read your notes.",
  },
  {
    question: "Can I export my notes?",
    answer:
      "Yes! You can export your notes in multiple formats including Markdown, PDF, and plain text. Your data belongs to you, and you can take it with you anytime.",
  },
  {
    question: "Does NotesApp support collaboration?",
    answer:
      "Yes! With our Pro plan, you can share notes with others and collaborate in real-time. Perfect for team projects, shared lists, or planning with friends.",
  },
  {
    question: "What platforms does NotesApp support?",
    answer:
      "NotesApp is available on web, iOS, and Android. Your notes sync seamlessly across all platforms, so you can access them wherever you are.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/50">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about NotesApp
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

