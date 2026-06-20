"use client";

import { useState } from "react";

interface ScanResult {
  ip: string;
  mac?: string;
  hostname?: string;
  status: "online" | "offline";
  responseTime?: number;
}

export default function NetworkScanner() {
  const [target, setTarget] = useState("192.168.1.0/24");
  const [scanType, setScanType] = useState<"ping" | "arp" | "nmap">("ping");
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleScan = async () => {
    setIsScanning(true);
    setResults([]);
    setError(null);
    setProgress(0);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target, scanType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scan failed");
      }

      // Simulate progress
      const onlineResults = data.results.filter((r: ScanResult) => r.status === "online");
      setResults(data.results);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsScanning(false);
    }
  };

  const onlineCount = results.filter((r) => r.status === "online").length;
  const offlineCount = results.filter((r) => r.status === "offline").length;

  return (
    <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
      {/* Scan Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target IP/Range
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="192.168.1.0/24 or 192.168.1.1-254"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isScanning}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Scan Type
          </label>
          <select
            value={scanType}
            onChange={(e) => setScanType(e.target.value as "ping" | "arp" | "nmap")}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isScanning}
          >
            <option value="ping">Ping Scan</option>
            <option value="arp">ARP Scan</option>
            <option value="nmap">Nmap Scan</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
              isScanning
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95"
            }`}
          >
            {isScanning ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scanning...
              </span>
            ) : (
              "🔍 Start Scan"
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isScanning && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Scan Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Statistics */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-white">{results.length}</div>
            <div className="text-sm text-gray-400">Total Hosts</div>
          </div>
          <div className="bg-green-900/30 rounded-lg p-4 text-center border border-green-700">
            <div className="text-3xl font-bold text-green-400">{onlineCount}</div>
            <div className="text-sm text-gray-400">Online</div>
          </div>
          <div className="bg-red-900/30 rounded-lg p-4 text-center border border-red-700">
            <div className="text-3xl font-bold text-red-400">{offlineCount}</div>
            <div className="text-sm text-gray-400">Offline</div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-3 px-4 text-gray-300 font-semibold">Status</th>
                <th className="py-3 px-4 text-gray-300 font-semibold">IP Address</th>
                <th className="py-3 px-4 text-gray-300 font-semibold">MAC Address</th>
                <th className="py-3 px-4 text-gray-300 font-semibold">Response Time</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                    result.status === "online" ? "bg-green-900/10" : "bg-gray-800/50"
                  }`}
                >
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.status === "online"
                          ? "bg-green-900 text-green-200"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {result.status === "online" ? "● Online" : "○ Offline"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white font-mono">{result.ip}</td>
                  <td className="py-3 px-4 text-gray-400 font-mono text-sm">
                    {result.mac || "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {result.responseTime ? `${result.responseTime}ms` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isScanning && results.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">
          <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg">Enter a target IP range and start scanning</p>
          <p className="text-sm mt-2">Supports CIDR notation (192.168.1.0/24) or ranges (192.168.1.1-254)</p>
        </div>
      )}
    </div>
  );
}
