#!/usr/bin/env node

import { getGitData, writeGitDataFile } from "./git.js";

// Script to write the git data file (json) used by the build procedures to persist git data.
writeGitDataFile(getGitData());
