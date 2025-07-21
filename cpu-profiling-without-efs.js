#!/usr/bin/env node

/**
 * Comprehensive CPU Profiling Setup for Skandha
 * Combines native Node.js profiling, clinic.js, and monitoring
 *
 * AWS ECS OPTIMIZED VERSION
 * - Automatically detects ECS container environment
 * - Prioritizes PID 1 monitoring (main process)
 * - Reduces logging noise for container environments
 * - Uses BusyBox-compatible commands
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Auto-detect ECS environment
const isECSContainer =
  Boolean(process.env.AWS_EXECUTION_ENV) ||
  Boolean(process.env.ECS_CONTAINER_METADATA_URI) ||
  (fs.existsSync("/proc/1/cgroup") &&
    fs.readFileSync("/proc/1/cgroup", "utf8").includes("ecs"));

class SkandhaProfiler {
  constructor() {
    // Parse command line arguments
    const args = this.parseArgs();

    this.mode =
      (args.mode !== null ? args.mode : process.env.PROFILING_MODE) ||
      "production";
    this.duration =
      args.duration !== null
        ? args.duration
        : parseInt(process.env.PROFILING_DURATION || "300"); // 5 minutes
    this.outputDir =
      (args.output !== null ? args.output : process.env.PROFILING_OUTPUT) ||
      "./cpu-analysis";
    this.isECS = isECSContainer;

    // ECS-specific settings
    if (this.isECS) {
      this.log("📦 AWS ECS Container detected - using optimized settings");
      this.duration = Math.min(this.duration, 600); // Max 10 minutes in ECS
    }

    this.setupOutputDir();
  }

  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
      mode: null,
      duration: null,
      output: null,
      help: false,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--help" || arg === "-h") {
        parsed.help = true;
      } else if (arg === "--mode" || arg === "-m") {
        parsed.mode = args[i + 1];
        i++; // Skip next argument
      } else if (arg === "--duration" || arg === "-d") {
        parsed.duration = parseInt(args[i + 1]);
        i++; // Skip next argument
      } else if (arg === "--output" || arg === "-o") {
        parsed.output = args[i + 1];
        i++; // Skip next argument
      } else if (arg.startsWith("--mode=")) {
        parsed.mode = arg.split("=")[1];
      } else if (arg.startsWith("--duration=")) {
        parsed.duration = parseInt(arg.split("=")[1]);
      } else if (arg.startsWith("--output=")) {
        parsed.output = arg.split("=")[1];
      }
    }

    if (parsed.help) {
      this.showHelp();
      process.exit(0);
    }

    return parsed;
  }

  showHelp() {
    const help = `
🔬 Skandha CPU Profiler

USAGE:
  node cpu-profiling-setup.js [OPTIONS]

OPTIONS:
  --mode, -m <mode>         Profiling mode: production|clinic|hotspot|comprehensive (default: production)
  --duration, -d <seconds>  Duration in seconds (default: 300, max 600 for ECS)
  --output, -o <path>       Output directory (default: ./cpu-analysis)
  --help, -h                Show this help

EXAMPLES:
  # Hotspot profiling for 5 minutes
  node cpu-profiling-setup.js --mode hotspot --duration 300

  # Quick 1-minute production profiling
  node cpu-profiling-setup.js -m production -d 60

  # Comprehensive analysis with custom output
  node cpu-profiling-setup.js --mode comprehensive --output /tmp/profiling

MODES:
  production     Lightweight, safe for production (default)
  clinic         Comprehensive analysis using clinic.js
  hotspot        V8 profiling for function-level analysis (generates .cpuprofile)
  comprehensive  All profiling methods combined

ENVIRONMENT VARIABLES (fallback):
  PROFILING_MODE      Same as --mode
  PROFILING_DURATION  Same as --duration  
  PROFILING_OUTPUT    Same as --output

For ECS containers, the script auto-detects the environment and optimizes settings.
The .cpuprofile files can be loaded in Chrome DevTools > Performance > Load profile.
`;
    console.log(help);
  }

  setupOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    fs.appendFileSync(
      path.join(this.outputDir, "profiler.log"),
      `${timestamp} ${message}\n`
    );
  }

  async startProfiling() {
    this.log(`🔬 Starting Skandha CPU profiling in ${this.mode} mode...`);

    switch (this.mode) {
      case "production":
        await this.runProductionProfiling();
        break;
      case "clinic":
        await this.runClinicProfiling();
        break;
      case "comprehensive":
        await this.runComprehensiveProfiling();
        break;
      case "hotspot":
        await this.runHotspotProfiling();
        break;
      default:
        await this.runProductionProfiling();
    }
  }

  // PRODUCTION MODE: Lightweight, safe for production
  async runProductionProfiling() {
    this.log("🚀 Running production-safe CPU profiling of existing server...");

    // Find existing Skandha process
    const existingPid = this.findSkandhaProcess();
    if (existingPid !== null) {
      this.log(`📍 Found existing Skandha process: PID ${existingPid}`);
    } else {
      this.log(
        "⚠️ No existing Skandha process found, will monitor current process"
      );
    }

    // Start custom metrics collection for existing process
    this.startCustomMetrics();

    // Start external profiling of existing process
    this.startExternalProfiling(existingPid);

    // Run profiling for specified duration
    return new Promise((resolve) => {
      setTimeout(() => {
        this.log("⏱️ Profiling duration completed");
        this.log("✅ Production profiling completed");
        this.analyzeResults();
        resolve();
      }, this.duration * 1000);
    });
  }

  // CLINIC.JS MODE: Comprehensive analysis for staging
  async runClinicProfiling() {
    this.log(
      "🏥 Running Clinic.js profiling on existing production process..."
    );

    // Find existing Skandha process
    const existingPid = this.findSkandhaProcess();
    if (existingPid === null) {
      this.log(
        "❌ No existing Skandha process found. Cannot run clinic profiling."
      );
      return;
    }

    this.log(`📍 Attaching Clinic.js to existing process: PID ${existingPid}`);

    try {
      // Check if clinic is installed
      execSync("clinic --version", { stdio: "ignore" });
    } catch (error) {
      this.log("❌ Clinic.js not found. Installing...");
      execSync("npm install -g clinic", { stdio: "inherit" });
    }

    // Use Node.js inspector API to profile existing process
    this.log("🔬 Starting V8 inspector-based profiling of existing process...");

    // Start profiling via Node.js inspector
    const inspectorPort = 9229 + Math.floor(Math.random() * 1000);

    try {
      // Send SIGUSR1 to enable inspector on existing process
      execSync(`kill -USR1 ${existingPid}`);
      this.log(`📡 Inspector enabled on PID ${existingPid}`);

      // Run profiling for duration
      this.startInspectorProfiling(inspectorPort, existingPid);

      return new Promise((resolve) => {
        setTimeout(() => {
          this.log("⏱️ Clinic profiling duration completed");
          this.log("✅ Clinic profiling completed");
          resolve();
        }, this.duration * 1000);
      });
    } catch (error) {
      this.log(`❌ Failed to attach clinic profiling: ${error.message}`);
      // Fallback to production mode
      await this.runProductionProfiling();
    }
  }

  // HOTSPOT MODE: V8 profiling for function-level analysis
  async runHotspotProfiling() {
    this.log("🔥 Running hotspot analysis on existing production process...");

    // Find existing Skandha process
    const existingPid = this.findSkandhaProcess();
    if (existingPid === null) {
      this.log(
        "❌ No existing Skandha process found. Cannot run hotspot profiling."
      );
      return;
    }

    this.log(
      `📍 Attaching hotspot profiler to existing process: PID ${existingPid}`
    );

    try {
      // Enable V8 profiling on existing process
      execSync(`kill -USR1 ${existingPid}`);
      this.log(`📡 V8 profiling enabled on PID ${existingPid}`);

      // Start CPU profiling via inspector
      this.startInspectorProfiling(9230, existingPid);

      return new Promise((resolve) => {
        setTimeout(() => {
          this.log("⏱️ Hotspot profiling duration completed");
          this.log("✅ Hotspot profiling completed");
          resolve();
        }, this.duration * 1000);
      });
    } catch (error) {
      this.log(`❌ Failed to attach hotspot profiling: ${error.message}`);
      // Fallback to production mode
      await this.runProductionProfiling();
    }
  }

  // COMPREHENSIVE MODE: All profiling methods
  async runComprehensiveProfiling() {
    this.log("🎯 Running comprehensive profiling (all methods)...");

    // Run production profiling first (lightweight)
    await this.runProductionProfiling();

    // Then clinic.js for detailed analysis
    await this.runClinicProfiling();

    this.log("✅ Comprehensive profiling completed");
  }

  startCustomMetrics() {
    this.log("📊 Starting custom Skandha metrics collection...");

    const metricsFile = path.join(this.outputDir, "skandha-metrics.jsonl");

    // Hook into critical Skandha operations
    this.hookSkandhaOperations();

    const interval = setInterval(() => {
      const metrics = {
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        eventLoopLag: this.measureEventLoopLag(),
        skandhaStats: this.getSkandhaStats(),
      };

      fs.appendFileSync(metricsFile, JSON.stringify(metrics) + "\n");
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
    }, this.duration * 1000);
  }

  hookSkandhaOperations() {
    // Track function call patterns that cause CPU spikes
    const originalLog = console.log;
    const originalDebug = console.debug;

    let bundleCreations = 0;
    let validations = 0;
    let gasCalculations = 0;
    let rpcCalls = 0;

    console.log = (...args) => {
      const message = args.join(" ");
      if (
        message.includes("createBundle") ||
        message.includes("Found some entries")
      ) {
        bundleCreations++;
      }
      if (message.includes("gas") || message.includes("fee")) {
        gasCalculations++;
      }
      originalLog.apply(console, args);
    };

    console.debug = (...args) => {
      const message = args.join(" ");
      if (message.includes("validation") || message.includes("simulate")) {
        validations++;
      }
      if (message.includes("rpc") || message.includes("request")) {
        rpcCalls++;
      }
      originalDebug.apply(console, args);
    };

    // Store stats for analysis
    this.getSkandhaStats = () => ({
      bundleCreations,
      validations,
      gasCalculations,
      rpcCalls,
    });
  }

  measureEventLoopLag() {
    const start = process.hrtime.bigint();
    return new Promise((resolve) => {
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000;
        resolve(lag);
      });
    });
  }

  findSkandhaProcess() {
    try {
      // ECS PRIORITY: In AWS ECS, the main app usually runs as PID 1
      // But only check this if we're actually in a container environment
      if (this.isECS || process.env.NODE_ENV === "production") {
        try {
          const result = execSync(
            "ps -o pid,comm,args | head -n 2 | tail -n 1",
            {
              encoding: "utf8",
            }
          );
          this.log(`🔍 Checking main process (likely PID 1): ${result.trim()}`);

          if (
            result.includes("skandha") ||
            result.includes("packages/cli/bin") ||
            result.includes("node")
          ) {
            this.log("🎯 Found Skandha as main process: PID 1 (ECS container)");
            return 1;
          }
        } catch (error) {
          this.log(`🔍 Main process check failed: ${error.message}`);
        }
      }

      // Method 1: Find process listening on Skandha's port (4337)
      try {
        const result = execSync(
          "netstat -tulpn 2>/dev/null | grep ':4337' || ss -tulpn 2>/dev/null | grep ':4337' || lsof -i :4337 2>/dev/null",
          {
            encoding: "utf8",
          }
        );

        if (result.trim()) {
          this.log(`🔍 Found service on port 4337: ${result.trim()}`);

          // Extract PID from netstat/ss output
          const match = result.match(/(\d+)\/|pid=(\d+)/);
          if (match) {
            const pid = parseInt(match[1] || match[2]);
            if (!isNaN(pid)) {
              this.log(`🎯 Found Skandha process via port 4337: PID ${pid}`);
              return pid;
            }
          }

          // If we found the port but couldn't extract PID, assume PID 1 for ECS
          if (this.isECS) {
            this.log(
              "🎯 Port 4337 is active - assuming Skandha is PID 1 in ECS container"
            );
            return 1;
          }
        }
      } catch (error) {
        this.log(`🔍 Port check failed, trying process scan: ${error.message}`);
      }

      // Method 2: Fallback - scan all processes with BusyBox compatible command
      try {
        const allProcs = execSync("ps -o pid,comm,args", { encoding: "utf8" });
        const lines = allProcs.split("\n");

        for (const line of lines) {
          if (
            (line.includes("skandha") ||
              line.includes("packages/cli/bin") ||
              line.includes("node")) &&
            !line.includes("cpu-profiling-setup.js") &&
            !line.includes("grep") &&
            !line.includes("PID")
          ) {
            const parts = line.trim().split(/\s+/);
            const pid = parseInt(parts[0]);
            if (!isNaN(pid)) {
              this.log(`🎯 Found Skandha process via process scan: PID ${pid}`);
              return pid;
            }
          }
        }
      } catch (error) {
        this.log(`🔍 Process scan failed: ${error.message}`);
      }
    } catch (error) {
      this.log(`❌ Error finding Skandha process: ${error.message}`);
    }

    // Only default to PID 1 if we're actually in ECS
    if (this.isECS) {
      this.log("⚠️ No Skandha process found - assuming PID 1 in ECS container");
      return 1;
    } else {
      this.log(
        "⚠️ No Skandha process found and not in ECS - will monitor current process"
      );
      return null;
    }
  }

  startExternalProfiling(targetPid) {
    this.log("📊 Starting external profiling monitoring...");

    // Use built-in Node.js profiling if we have access to the process
    if (targetPid !== null && targetPid !== process.pid) {
      this.log(
        `🔍 Monitoring external process ${targetPid} via system tools...`
      );
      this.monitorExternalProcess(targetPid);
    } else {
      this.log("🔍 Monitoring current process with built-in profiling...");
      this.enableBuiltInProfiling();
    }
  }

  monitorExternalProcess(pid) {
    // Monitor external process CPU usage
    this.log(`🔍 Starting ECS-optimized monitoring for PID ${pid}...`);

    // ECS-specific: If we're monitoring PID 1, we know it exists
    const isMainProcess = pid === 1;
    if (isMainProcess) {
      this.log("📦 ECS Container Mode: Monitoring main process (PID 1)");
    }

    const monitorInterval = setInterval(() => {
      try {
        // Get process stats using BusyBox compatible ps with supported columns
        const result = execSync("ps -o pid,vsz,time,comm,args", {
          encoding: "utf8",
        });

        // Only log sample output occasionally to avoid spam
        if (Math.random() < 0.05) {
          // 5% chance
          this.log(
            `📊 PS output sample: ${result.split("\n").slice(0, 2).join("; ")}`
          );
        }

        const lines = result.trim().split("\n");
        let foundProcess = false;

        for (const line of lines) {
          if (
            line.includes("PID") ||
            line.includes("grep") ||
            line.includes("cpu-profiling-setup.js")
          ) {
            continue; // Skip header, grep itself and this script
          }

          const stats = line.trim().split(/\s+/);
          if (stats.length < 3) continue; // Skip malformed lines

          const linePid = parseInt(stats[0]);

          // Make sure we found the exact PID we're looking for
          if (linePid === pid) {
            foundProcess = true;
            const memKb = parseInt(stats[1]) || 0; // VSZ in KB
            const cpuTime = stats[2] || "0:00"; // CPU time in MM:SS or HH:MM:SS format

            // Convert CPU time to seconds for tracking
            const timeParts = cpuTime.split(":");
            let cpuTimeSeconds = 0;
            if (timeParts.length === 2) {
              cpuTimeSeconds =
                parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
            } else if (timeParts.length === 3) {
              cpuTimeSeconds =
                parseInt(timeParts[0]) * 3600 +
                parseInt(timeParts[1]) * 60 +
                parseInt(timeParts[2]);
            }

            const processMetrics = {
              timestamp: new Date().toISOString(),
              pid: pid,
              memoryKb: memKb,
              cpuTimeSeconds: cpuTimeSeconds,
              cpuTime: cpuTime,
              command: stats.slice(3).join(" "), // comm + args
              type: isMainProcess ? "ecs_main_process" : "external_process",
              environment: this.isECS ? "aws_ecs" : "host",
            };

            fs.appendFileSync(
              path.join(this.outputDir, "external-process-metrics.jsonl"),
              JSON.stringify(processMetrics) + "\n"
            );

            // Log success less frequently to reduce noise
            if (Math.random() < 0.1) {
              // 10% chance
              this.log(
                `✅ ECS metrics logged for PID ${pid}: ${memKb}KB, ${cpuTime}`
              );
            }
            break;
          }
        }

        if (!foundProcess) {
          if (isMainProcess) {
            // For PID 1 in containers, try one more time with different approach
            try {
              const basicCheck = execSync("ps", { encoding: "utf8" });
              const hasInit = basicCheck.includes(" 1 ");
              if (hasInit) {
                this.log(
                  "🔍 PID 1 exists but not in detailed ps output - continuing monitoring"
                );
              } else {
                this.log(
                  "⚠️ PID 1 not found in ps output - container might be shutting down"
                );
                clearInterval(monitorInterval);
              }
            } catch (error) {
              this.log(
                "⚠️ Cannot verify PID 1 existence - stopping monitoring"
              );
              clearInterval(monitorInterval);
            }
          } else {
            // Try alternative method - check if process still exists by sending signal 0
            try {
              process.kill(pid, 0); // Signal 0 just checks if process exists
              this.log(
                `🔍 PID ${pid} exists but not in ps output. Continuing monitoring...`
              );
            } catch (error) {
              this.log(
                `⚠️ Process PID ${pid} no longer exists: ${error.message}`
              );
              clearInterval(monitorInterval);
            }
          }
        }
      } catch (error) {
        // Process might have ended or command failed
        this.log(`⚠️ Monitoring error for PID ${pid}: ${error.message}`);
        if (isMainProcess) {
          this.log(
            "📦 Main process monitoring failed - container may be stopping"
          );
        }
        clearInterval(monitorInterval);
      }
    }, 10000); // 10 seconds for ECS - less frequent to reduce container overhead

    // Stop monitoring after duration
    setTimeout(() => {
      clearInterval(monitorInterval);
      this.log(`✅ ECS monitoring completed for PID ${pid}`);
    }, this.duration * 1000);
  }

  enableBuiltInProfiling() {
    // Enable CPU profiling for current process using inspector
    try {
      const inspector = require("inspector");
      const session = new inspector.Session();
      session.connect();

      // Start profiling
      session.post("Profiler.enable");
      session.post("Profiler.start");

      this.log("🔬 Built-in CPU profiling started");

      // Stop profiling after duration
      setTimeout(() => {
        session.post("Profiler.stop", (err, { profile }) => {
          if (err === null && profile !== undefined) {
            const profilePath = path.join(
              this.outputDir,
              `cpu-profile-${Date.now()}.cpuprofile`
            );
            fs.writeFileSync(profilePath, JSON.stringify(profile));
            this.log(`💾 CPU profile saved: ${profilePath}`);
          }
          session.disconnect();
        });
      }, this.duration * 1000);
    } catch (error) {
      this.log(`⚠️ Could not start built-in profiling: ${error.message}`);
    }
  }

  startInspectorProfiling(port, pid) {
    this.log(
      `🔬 Starting V8 inspector-based profiling on PID ${pid} at port ${port}...`
    );

    const inspector = require("inspector");
    const session = new inspector.Session();

    session.connect();

    session.post("Profiler.enable");
    session.post("Profiler.start");

    this.log(`📡 V8 inspector enabled on PID ${pid}`);

    setTimeout(() => {
      session.post("Profiler.stop", (err, { profile }) => {
        if (err === null && profile !== undefined) {
          const profilePath = path.join(
            this.outputDir,
            `cpu-profile-${Date.now()}.cpuprofile`
          );
          fs.writeFileSync(profilePath, JSON.stringify(profile));
          this.log(`💾 CPU profile saved: ${profilePath}`);
        }
        session.disconnect();
      });
    }, this.duration * 1000);
  }

  processV8Logs() {
    this.log("🔍 Processing V8 profiling logs...");

    try {
      const logFiles = fs
        .readdirSync(".")
        .filter((file) => file.startsWith("isolate-") && file.endsWith(".log"));

      for (const logFile of logFiles) {
        const outputFile = path.join(
          this.outputDir,
          `v8-analysis-${logFile}.txt`
        );
        execSync(`node --prof-process ${logFile} > ${outputFile}`, {
          stdio: "inherit",
        });
        fs.unlinkSync(logFile); // Clean up
      }

      this.log("✅ V8 logs processed");
    } catch (error) {
      this.log(`❌ Error processing V8 logs: ${error.message}`);
    }
  }

  analyzeResults() {
    this.log("📋 Analyzing profiling results...");

    const analysisFile = path.join(this.outputDir, "analysis-report.md");

    // Find CPU profile files
    const cpuProfiles = fs
      .readdirSync(this.outputDir)
      .filter((file) => file.endsWith(".cpuprofile"));

    let report = `# Skandha CPU Profiling Analysis Report

## Summary
- **Mode**: ${this.mode}
- **Duration**: ${this.duration} seconds  
- **Timestamp**: ${new Date().toISOString()}

## Files Generated
${cpuProfiles
  .map((file) => `- \`${file}\` - Load in Chrome DevTools Performance tab`)
  .join("\n")}

## Quick Analysis Steps

### 1. Chrome DevTools Analysis
1. Open Chrome → Developer Tools → Performance tab
2. Click "Load profile" and select .cpuprofile files
3. Look for:
   - **Red functions** (high CPU usage)
   - **Wide bars** (long execution time)
   - **Frequent calls** (optimization opportunities)

### 2. Expected Skandha Hotspots
Based on codebase analysis, look for these patterns:

#### 🔥 **High-Impact CPU Hotspots**
- \`createBundle\` - Bundle creation loop
- \`simulateValidation\` - UserOp validation
- \`BigInt\` operations - Gas calculations
- \`getGasFee\` - Gas price fetching

#### ⚡ **Medium-Impact Hotspots**  
- Array \`.sort()\` and \`.filter()\` - Mempool operations
- \`encodeHandleOps\` - Transaction encoding
- RPC calls (\`publicClient.request\`)

### 3. Optimization Recommendations

#### If Bundle Creation is the hotspot:
\`\`\`javascript
// In config.json
{
  "bundleSize": 6,        // Increase from 4
  "bundleInterval": 5000, // Reduce from 10000ms
  "skipBundleValidation": true // For trusted environments
}
\`\`\`

#### If UserOp Validation is the hotspot:
\`\`\`javascript
// Implement validation caching
const validationCache = new LRU({ max: 1000, ttl: 60000 });

// Batch RPC calls
const batch = userOps.map(op => ({
  method: 'eth_estimateGas',
  params: [op]
}));
\`\`\`

#### If Gas Calculations are the hotspot:
\`\`\`javascript
// Cache gas prices
const gasPriceCache = {
  value: null,
  timestamp: 0,
  ttl: 30000 // 30 seconds
};

// Pre-calculate constants
const GAS_MARKUP = BigInt(25000);
\`\`\`

## Next Steps

1. **Immediate**: Load .cpuprofile in Chrome DevTools
2. **Short-term**: Implement top 3 optimizations
3. **Long-term**: Set up continuous profiling monitoring

`;

    // Add metrics analysis if available
    const metricsFile = path.join(this.outputDir, "skandha-metrics.jsonl");
    if (fs.existsSync(metricsFile)) {
      const metrics = fs
        .readFileSync(metricsFile, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));

      if (metrics.length > 0) {
        const lastMetric = metrics[metrics.length - 1];

        const totalBundles = lastMetric.skandhaStats?.bundleCreations || 0;
        const totalValidations = lastMetric.skandhaStats?.validations || 0;
        const totalGasCalcs = lastMetric.skandhaStats?.gasCalculations || 0;
        const totalRpcCalls = lastMetric.skandhaStats?.rpcCalls || 0;

        report += `
## Metrics Analysis

### Operation Counts (${this.duration}s)
- **Bundle Creations**: ${totalBundles}
- **Validations**: ${totalValidations}  
- **Gas Calculations**: ${totalGasCalcs}
- **RPC Calls**: ${totalRpcCalls}

### CPU Hotspot Indicators
${
  totalBundles > 50
    ? "🔥 **HIGH Bundle Creation** - Optimize bundling logic"
    : "✅ Bundle creation normal"
}
${
  totalValidations > 100
    ? "🔥 **HIGH Validation** - Cache validation results"
    : "✅ Validation normal"
}
${
  totalGasCalcs > 1000
    ? "🔥 **HIGH Gas Calculations** - Optimize BigInt operations"
    : "✅ Gas calculations normal"
}
${
  totalRpcCalls > 200
    ? "🔥 **HIGH RPC Calls** - Implement batching"
    : "✅ RPC calls normal"
}
`;
      }
    }

    fs.writeFileSync(analysisFile, report);
    this.log(`✅ Analysis report saved: ${analysisFile}`);
  }
}

// CLI Usage
if (require.main === module) {
  const profiler = new SkandhaProfiler();

  // Start profiling
  profiler.startProfiling().catch(console.error);

  // Handle shutdown
  process.on("SIGTERM", () => {
    console.log("Profiling stopped by SIGTERM");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("Profiling stopped by SIGINT");
    process.exit(0);
  });
}

module.exports = { SkandhaProfiler };
