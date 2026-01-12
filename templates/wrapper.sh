#!/bin/bash
# Template for binary wrapper
# Variables to be replaced: %BINARY_NAME%

# Resolving the directory of this script
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" 
done
DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
LIB_DIR="$DIR/../lib"

# Set LD_LIBRARY_PATH to include our lib directory
export LD_LIBRARY_PATH="$LIB_DIR:$LD_LIBRARY_PATH"

# Exec the binary
exec "$LIB_DIR/%BINARY_NAME%" "$@"
