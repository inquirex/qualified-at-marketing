# Inquirex Presentation — Justfile

[no-exit-message]
recipes:
    @just --choose

# Serve with Python on port 8877
serve:
    /bin/ps -ef | grep -E '[p]ython3 -m http.server 8877' | awk '{print $2}' | xargs kill -9 1>/dev/null 2>&1
    python3 -m http.server 8877 &
    sleep 1
    open "http://localhost:8877"
