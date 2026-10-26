TARGET := webui/scripts
PORT ?= 8090

.PHONY: all
all: \
	$(TARGET)/wasm_exec.js \
	$(TARGET)/template.wasm

$(TARGET)/wasm_exec.js:
	mkdir -p $(dir $@)
	cp $(shell go env GOROOT)/lib/wasm/wasm_exec.js $@

$(TARGET)/template.wasm: $(wildcard *.go **/*.go)
	mkdir -p $(dir $@)
	GOOS=js GOARCH=wasm go build \
	     -o $@
	du -sh $@

# Serve webui with live reload, rebuilding the wasm whenever a .go file changes.
.PHONY: dev
dev: all
	$(MAKE) -j2 dev-watch dev-serve

.PHONY: dev-watch
dev-watch:
	npx --yes nodemon@3.1.14 --watch . --ext go --exec "$(MAKE) all"

.PHONY: dev-serve
dev-serve:
	npx --yes live-server@1.2.2 webui --port=$(PORT) --wait=500

.PHONY: clean
clean:
	rm -rf $(TARGET)