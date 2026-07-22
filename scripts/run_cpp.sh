#!/bin/bash
# scripts/run_cpp.sh
# Usage: ./run_cpp.sh <source_file> <input_file>
SRC=$1
INP=$2
OUT="${SRC%.*}_exec" # Executable name

# Compile
g++ -O2 -std=c++17 "$SRC" -o "$OUT" 2> "${SRC}_compile_err.log"
if [ $? -ne 0 ]; then
    echo "COMPILE_ERROR"
    cat "${SRC}_compile_err.log"
    rm -f "${SRC}_compile_err.log"
    exit 1
fi

# Run (removed the ./ prefix since SRC is an absolute path from ioutil.TempFile)
"$OUT" < "$INP" > "${SRC}_run_out.log" 2> "${SRC}_run_err.log"
EXEC_STATUS=$?

if [ $EXEC_STATUS -ne 0 ]; then
    echo "RUNTIME_ERROR"
    cat "${SRC}_run_err.log"
else
    cat "${SRC}_run_out.log"
fi

# Cleanup
rm -f "$OUT" "${SRC}_compile_err.log" "${SRC}_run_out.log" "${SRC}_run_err.log"
