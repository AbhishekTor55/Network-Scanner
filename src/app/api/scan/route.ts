import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export interface ScanResult {
  ip: string;
  mac?: string;
  hostname?: string;
  status: "online" | "offline";
  responseTime?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, scanType } = body;

    if (!target) {
      return NextResponse.json(
        { error: "Target IP or range is required" },
        { status: 400 }
      );
    }

    let results: ScanResult[] = [];

    if (scanType === "ping") {
      results = await performPingScan(target);
    } else if (scanType === "arp") {
      results = await performArpScan(target);
    } else if (scanType === "nmap") {
      results = await performNmapScan(target);
    } else {
      // Default to ping scan
      results = await performPingScan(target);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Scan failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function performPingScan(target: string): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  
  // Handle IP ranges (e.g., 192.168.1.1-254 or 192.168.1.0/24)
  const ipRange = parseIPRange(target);
  
  for (const ip of ipRange) {
    try {
      const start = Date.now();
      const { stdout } = await execPromise(
        `ping -c 1 -W 1 ${ip} 2>/dev/null`,
        { timeout: 2000 }
      );
      const responseTime = Date.now() - start;
      
      if (stdout.includes("1 packets received") || stdout.includes("1 received")) {
        results.push({
          ip,
          status: "online",
          responseTime,
        });
      }
    } catch (error) {
      // Host is offline or unreachable
      results.push({
        ip,
        status: "offline",
      });
    }
  }
  
  return results;
}

async function performArpScan(target: string): Promise<ScanResult[]> {
  try {
    // Use arp-scan if available, otherwise fall back to arp table
    let stdout: string;
    
    try {
      const result = await execPromise(`arp-scan --localnet 2>/dev/null || arp -a 2>/dev/null`);
      stdout = result.stdout;
    } catch {
      const result = await execPromise(`arp -a 2>/dev/null`);
      stdout = result.stdout;
    }
    
    const results: ScanResult[] = [];
    const lines = stdout.split("\n");
    
    for (const line of lines) {
      // Parse arp-scan output: IP\tMAC\tVendor
      const arpScanMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\t([0-9a-fA-F:]{17})/);
      if (arpScanMatch) {
        results.push({
          ip: arpScanMatch[1],
          mac: arpScanMatch[2],
          status: "online",
        });
        continue;
      }
      
      // Parse arp -a output: hostname (IP) at MAC
      const arpMatch = line.match(/(?:\S+\s+)?\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)\s+(?:at\s+)?([0-9a-fA-F:]{17})?/);
      if (arpMatch && !arpMatch[1].startsWith("0.0.0.0")) {
        results.push({
          ip: arpMatch[1],
          mac: arpMatch[2] || undefined,
          status: "online",
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error("ARP scan error:", error);
    return [];
  }
}

async function performNmapScan(target: string): Promise<ScanResult[]> {
  try {
    const { stdout } = await execPromise(
      `nmap -sn ${target} 2>/dev/null`,
      { timeout: 30000 }
    );
    
    const results: ScanResult[] = [];
    const lines = stdout.split("\n");
    let currentIP = "";
    
    for (const line of lines) {
      const ipMatch = line.match(/Nmap scan report for\s+(?:\S+\s+)?\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)/);
      if (ipMatch) {
        currentIP = ipMatch[1];
        continue;
      }
      
      const macMatch = line.match(/MAC Address:\s+([0-9a-fA-F:]{17})/);
      if (macMatch && currentIP) {
        results.push({
          ip: currentIP,
          mac: macMatch[1],
          status: "online",
        });
        currentIP = "";
      } else if (line.includes("Host is up") && currentIP) {
        results.push({
          ip: currentIP,
          status: "online",
        });
        currentIP = "";
      }
    }
    
    return results;
  } catch (error) {
    console.error("Nmap scan error:", error);
    return [];
  }
}

function parseIPRange(target: string): string[] {
  const ips: string[] = [];
  
  // Handle CIDR notation (e.g., 192.168.1.0/24)
  const cidrMatch = target.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})/);
  if (cidrMatch) {
    const baseIP = cidrMatch[1].split(".").map(Number);
    const mask = parseInt(cidrMatch[2]);
    const numHosts = Math.pow(2, 32 - mask);
    
    for (let i = 0; i < numHosts && i < 256; i++) {
      const ip = `${baseIP[0]}.${baseIP[1]}.${baseIP[2]}.${baseIP[3] + i}`;
      if (i !== 0 || mask < 31) { // Skip network address for small subnets
        ips.push(ip);
      }
    }
    return ips;
  }
  
  // Handle range notation (e.g., 192.168.1.1-254)
  const rangeMatch = target.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.)(\d{1,3})-(\d{1,3})/);
  if (rangeMatch) {
    const prefix = rangeMatch[1];
    const start = parseInt(rangeMatch[2]);
    const end = parseInt(rangeMatch[3]);
    
    for (let i = start; i <= end && i <= 255; i++) {
      ips.push(`${prefix}${i}`);
    }
    return ips;
  }
  
  // Single IP
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) {
    ips.push(target);
  }
  
  return ips;
}
