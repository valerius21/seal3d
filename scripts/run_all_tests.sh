#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
pushd "${SCRIPT_DIR}/.."
mkdir -p ~/tmp
RUN_LARGE_FILE_TEST=1 LARGE_FILE_TMP_DIR=/home/${USER}/tmp/ bun vitest --testTimeout=600000
OK=$?
rmdir "$TMP_DIR" 2>/dev/null  # only remove iff empty
popd
exit $OK
