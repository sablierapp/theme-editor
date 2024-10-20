//go:build js && wasm

package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"strings"
	"syscall/js"
)

func main() {
	// Render provides the ability to take in a template string and input
	// data and render the corresponding output.
	render := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		if len(args) != 2 {
			return "Must provide exactly two arguments: inputTmpl, inputData"
		}
		inputTmpl := args[0].String()
		inputData := args[1].String()

		tmpl := template.New("base")
		tmpl, err := tmpl.Parse(inputTmpl)
		if err != nil {
			return fmt.Sprintf("error parsing template: %v", err)
		}

		data, err := decode(inputData)
		if err != nil {
			return fmt.Sprintf("error decoding: %v", err)
		}

		var b strings.Builder
		if err := tmpl.Execute(&b, data); err != nil {
			return fmt.Sprintf("error executing template: %v", err)
		}

		return b.String()
	})
	js.Global().Set("template", render)
	// Wait forever
	<-make(chan bool)
}

func decode(inputData string) (data interface{}, err error) {
	if err := json.Unmarshal([]byte(inputData), &data); err != nil {
		return nil, err
	}
	return
}
