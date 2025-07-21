# CPU Profiling Skandha in AWS ECS

This guide shows how to profile your Skandha bundler running in AWS ECS containers.

## Quick Start

### 1. Copy Profiler to Your ECS Container

Add this to your Dockerfile:

```dockerfile
# Copy profiling script
COPY cpu-profiling-setup.js /app/
RUN chmod +x /app/cpu-profiling-setup.js
```

### 2. Run Profiling in ECS Task

**Option A: ECS Exec (Recommended)**

```bash
# Connect to running container
aws ecs execute-command --cluster your-cluster --task your-task-id --container skandha --interactive --command "/bin/sh"

# Inside container, run profiler
cd /app
PROFILING_DURATION=300 node cpu-profiling-setup.js
```

**Option B: Sidecar Container**

```json
{
  "name": "skandha-profiler",
  "image": "your-skandha-image",
  "command": ["node", "/app/cpu-profiling-setup.js"],
  "environment": [
    { "name": "PROFILING_DURATION", "value": "600" },
    { "name": "PROFILING_MODE", "value": "production" }
  ],
  "mountPoints": [
    {
      "sourceVolume": "shared-storage",
      "containerPath": "/app/cpu-analysis"
    }
  ]
}
```

### 3. Environment Variables

```bash
# Basic settings
PROFILING_MODE=production          # production|clinic|hotspot|comprehensive
PROFILING_DURATION=300            # seconds (max 600 for ECS)
PROFILING_OUTPUT=/app/cpu-analysis # output directory

# ECS automatically detected via:
# - AWS_EXECUTION_ENV
# - ECS_CONTAINER_METADATA_URI
```

## ECS-Specific Features

### ✅ Auto-Detection

- Automatically detects ECS container environment
- Optimizes for PID 1 monitoring (main Skandha process)
- Uses BusyBox-compatible commands

### ✅ Container-Optimized

- Reduced logging noise
- 10-second monitoring intervals (vs 1-second)
- Maximum 10-minute profiling duration
- Handles container-specific PID namespaces

### ✅ Output Files

```
/app/cpu-analysis/
├── cpu-profile-*.cpuprofile     # Load in Chrome DevTools
├── external-process-metrics.jsonl # ECS process metrics
├── skandha-metrics.jsonl        # Application metrics
├── analysis-report.md           # Optimization recommendations
└── profiler.log                 # Execution log
```

## Retrieving Results

### Method 1: EFS Mount (Recommended)

```json
{
  "mountPoints": [
    {
      "sourceVolume": "efs-storage",
      "containerPath": "/app/cpu-analysis"
    }
  ]
}
```

### Method 2: S3 Upload

```bash
# Inside container after profiling
aws s3 cp /app/cpu-analysis s3://your-bucket/profiling-results/ --recursive
```

### Method 3: ECS Exec Download

```bash
# From your local machine
aws ecs execute-command --cluster your-cluster --task your-task-id --container skandha --interactive --command "tar -czf /tmp/profiling.tar.gz /app/cpu-analysis"

# Then copy out using docker cp equivalent or other methods
```

## Analysis in Chrome DevTools

1. Download `cpu-profile-*.cpuprofile` files
2. Open Chrome → DevTools → Performance tab
3. Click "Load profile" and select the `.cpuprofile` file
4. Look for:
   - **Red functions** (high CPU usage)
   - **Wide bars** (long execution time)
   - **Frequent calls** (optimization opportunities)

## Expected ECS Behavior

### ✅ Normal Output

```
[timestamp] 📦 AWS ECS Container detected - using optimized settings
[timestamp] 🎯 Found Skandha as main process: PID 1 (ECS container)
[timestamp] 📦 ECS Container Mode: Monitoring main process (PID 1)
[timestamp] ✅ ECS metrics logged for PID 1: 125432KB, 2:34
```

### ❌ Troubleshooting

```bash
# If process not found
ps -o pid,comm,args  # Check what's actually running

# If permissions issues
ls -la /app/cpu-analysis  # Check directory permissions

# If profiling fails
cat /app/cpu-analysis/profiler.log  # Check detailed logs
```

## Performance Impact

- **Minimal**: Production mode has <1% CPU overhead
- **Memory**: ~10MB additional for profiling data
- **Duration**: Automatically limited to 10 minutes in ECS
- **Network**: No external calls (except optional S3 upload)

## Security Considerations

- Uses only built-in Node.js profiling APIs
- No external dependencies required
- Reads only process information (same as `ps` command)
- Output files contain performance data only (no sensitive information)

## Integration with CI/CD

```yaml
# Example: Run profiling during deployment
- name: Profile Skandha Performance
  run: |
    aws ecs run-task \
      --cluster $ECS_CLUSTER \
      --task-definition skandha-profiler \
      --overrides '{
        "containerOverrides": [{
          "name": "profiler",
          "environment": [
            {"name": "PROFILING_DURATION", "value": "300"}
          ]
        }]
      }'
```

This ECS-optimized profiler will help you identify performance bottlenecks in your production Skandha deployment! 🚀
