import { Button } from "@refunite/ui";
import { ArrowRight, Globe, Shield, Users } from "lucide-react";
import Link from "next/link";

import { Header } from "./Header";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="py-12 md:py-20 bg-gradient-to-br from-indigo-100 to-indigo-200">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">Welcome to Refunite</h1>
            <p className="text-lg md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto px-4">
              Empowering refugee communities through decentralized trust networks
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="https://app.refunite-network.vercel.app">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section id="about" className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center">
              About Refunite
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4">Our Mission</h3>
                <p>
                  Refunite is the world&apos;s largest missing persons platform for refugees and
                  displaced populations. We aim to empower our network of 100,000 community leaders
                  representing 100 million community members across Africa with decentralized
                  technology.
                </p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold mb-4">Our Goal</h3>
                <p>
                  Our goal is to facilitate a trust network within community leaders using
                  decentralized technology. This network will enable efficient management and
                  recovery of leadership roles, enhancing the resilience of our community support
                  system.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="py-12 md:py-20 bg-gradient-to-br from-indigo-100 to-indigo-200"
        >
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center">
              Key Features
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <Users className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Decentralized Network</h3>
                <p>
                  Empower community leaders with a decentralized trust network, reducing reliance on
                  central authorities.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Social Recovery</h3>
                <p>
                  Enable leaders to recover their roles through peer validation, ensuring continuity
                  of community support.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <Globe className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Scalable Solution</h3>
                <p>
                  Built to support our vast network of 100,000 community leaders across the African
                  continent.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="py-12 md:py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Get Involved</h2>
            <p className="mb-6 md:mb-8 max-w-2xl mx-auto px-4">
              Join us in our mission to empower refugee communities. Whether you&apos;re a community
              leader or want to support our cause, we&apos;d love to hear from you.
            </p>
            <Button size="lg" variant="secondary">
              Contact Us
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
