#!/usr/bin/env node

import { execSync } from 'node:child_process'

try {
	execSync('bun --version', { stdio: 'ignore' })
} catch (err) {
	console.error(
		'❌ Bun is not installed. Please install it from https://bun.sh before running this project.'
	)
	process.exit(1)
}
