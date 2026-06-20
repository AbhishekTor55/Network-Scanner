"use client";

import { useState } from "react";
import NetworkScanner from "@/components/NetworkScanner";

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🦞 Network Scanner
          </h1>
          <p className="text-gray-300 text-lg">
            Discover devices on your network with ease
          </p>
        </div>
        <NetworkScanner />
      </div>
    </main>
  );
}
