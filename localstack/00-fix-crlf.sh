#!/usr/bin/env bash
# Fix Windows CRLF line endings before other scripts run
sed -i 's/\r$//' /etc/localstack/init/ready.d/*.sh 2>/dev/null || true
