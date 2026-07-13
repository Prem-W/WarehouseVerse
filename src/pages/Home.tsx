/**
 * EvoTwin Landing Page
 * Professional introduction to the platform
 */

import React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Warehouse,
  Bot,
  Brain,
  GitFork,
  Activity,
  ArrowRight,
  Shield,
  Zap,
  Share2,
  LineChart,
} from "lucide-react";

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />

        <nav className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-bold">
              Evo<span className="text-cyan-400">Twin</span>
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Evolutionary Digital Twin Platform
          </div>
        </nav>

        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-900/30 border border-cyan-700/40 text-cyan-400 text-xs mb-6">
            <Activity className="w-3 h-3" />
            Autonomous Warehouse Intelligence
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Digital Twin for
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Autonomous Robotics
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            EvoTwin simulates hundreds of AI-powered robots in a warehouse environment,
            featuring evolutionary optimization, Q-learning adaptation, real-time
            collision avoidance, and decentralized robot communication.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6"
            >
              Launch Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">
          Core <span className="text-cyan-400">Capabilities</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Bot className="w-6 h-6 text-cyan-400" />}
            title="Robot Fleet Management"
            description="Autonomous robot state machines with battery simulation, task assignment, and dynamic path planning using A* with Jump Point Search."
          />
          <FeatureCard
            icon={<Brain className="w-6 h-6 text-purple-400" />}
            title="Q-Learning Engine"
            description="Each robot learns from experience using reinforcement learning, adapting strategies for path preferences, congestion avoidance, and energy optimization."
          />
          <FeatureCard
            icon={<GitFork className="w-6 h-6 text-emerald-400" />}
            title="Genetic Algorithm"
            description="Robots evolve their strategy profiles across generations through tournament selection, crossover, and adaptive mutation rate based on population diversity."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-amber-400" />}
            title="Collision Avoidance"
            description="Predictive collision detection with spatial hashing grid. O(1) proximity queries enable real-time conflict resolution for hundreds of robots."
          />
          <FeatureCard
            icon={<Share2 className="w-6 h-6 text-pink-400" />}
            title="Robot Communication"
            description="Decentralized message passing for knowledge sharing, task coordination, collision warnings, and cooperative behavior emergence."
          />
          <FeatureCard
            icon={<LineChart className="w-6 h-6 text-blue-400" />}
            title="Real-time Analytics"
            description="Live metrics dashboard with throughput tracking, efficiency analysis, evolution progress charts, and detailed robot inspection."
          />
        </div>
      </section>

      {/* Technical Stack */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-800">
        <h2 className="text-2xl font-bold text-center mb-12">
          Technical <span className="text-purple-400">Architecture</span>
        </h2>

        <div className="grid md:grid-cols-4 gap-4">
          <TechCard label="Frontend" items={["React 19", "TypeScript", "Tailwind CSS", "Recharts", "HTML5 Canvas"]} />
          <TechCard label="Backend" items={["tRPC 11", "Hono", "Drizzle ORM", "MySQL", "Zod Validation"]} />
          <TechCard label="Algorithms" items={["A* Pathfinding", "Jump Point Search", "Spatial Hashing", "Priority Queues", "Genetic Algorithm"]} />
          <TechCard label="AI/ML" items={["Q-Learning", "Strategy Evolution", "Knowledge Sharing", "Adaptive Mutation", "Fitness Evaluation"]} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center">
        <p className="text-sm text-slate-500">
          EvoTwin - Evolutionary Digital Twin Platform
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Built with React, tRPC, Hono, Drizzle ORM, and TypeScript
        </p>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="bg-slate-900/60 border border-slate-700/40 rounded-lg p-5 hover:border-slate-600/60 transition-colors">
    <div className="mb-3">{icon}</div>
    <h3 className="text-sm font-semibold text-slate-200 mb-2">{title}</h3>
    <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
  </div>
);

const TechCard: React.FC<{
  label: string;
  items: string[];
}> = ({ label, items }) => (
  <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-4">
    <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">{label}</h4>
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="text-xs text-slate-400 flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-cyan-600" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default Home;
